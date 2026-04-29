#!/usr/bin/env node
/**
 * One-shot migrator: Google Sheets -> Supabase.
 *
 * Reads from the existing `sessions_NNN`, `rooms`, and `room_participants`
 * tabs and upserts into the matching Supabase tables. Idempotent — every
 * write is upsert on the natural key, safe to re-run after partial failure.
 *
 * Required env (uses existing Vercel env vars):
 *   GOOGLE_SHEETS_SPREADSHEET_ID
 *   GOOGLE_SHEETS_CLIENT_EMAIL
 *   GOOGLE_SHEETS_PRIVATE_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   vercel env pull .env.migrate     # populate env from production
 *   node --env-file=.env.migrate scripts/migrate-sheets-to-supabase.mjs
 *
 *   # Or pass --dry-run to read everything without writing:
 *   node --env-file=.env.migrate scripts/migrate-sheets-to-supabase.mjs --dry-run
 */

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const SESSION_TAB_REGEX = /^sessions_\d{3}$/i;
const ROOMS_TAB = "rooms";
const PARTICIPANTS_TAB = "room_participants";
const BATCH_SIZE = 100;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const stats = {
  sessions: { read: 0, upserted: 0, skipped: 0, errors: [] },
  rooms: { read: 0, upserted: 0, skipped: 0, errors: [] },
  room_participants: { read: 0, upserted: 0, skipped: 0, errors: [] },
};

main().catch((err) => {
  console.error("FATAL:", err.message || err);
  process.exit(1);
});

async function main() {
  ensureEnv([
    "GOOGLE_SHEETS_SPREADSHEET_ID",
    "GOOGLE_SHEETS_CLIENT_EMAIL",
    "GOOGLE_SHEETS_PRIVATE_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);
  console.log(DRY_RUN ? "[dry-run] reading only, no writes\n" : "[live] writing to Supabase\n");

  const sheets = await getSheetsClient();
  const supabase = DRY_RUN
    ? null
    : createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabTitles = await listTabTitles(sheets, spreadsheetId);

  await migrateSessions(sheets, supabase, spreadsheetId, tabTitles);
  await migrateRooms(sheets, supabase, spreadsheetId, tabTitles);
  await migrateParticipants(sheets, supabase, spreadsheetId, tabTitles);

  console.log("\n=== summary ===");
  for (const [k, v] of Object.entries(stats)) {
    console.log(
      `${k}: read=${v.read} upserted=${v.upserted} skipped=${v.skipped} errors=${v.errors.length}`,
    );
    v.errors.slice(0, 5).forEach((e) => console.log(`  • ${e}`));
    if (v.errors.length > 5) console.log(`  …and ${v.errors.length - 5} more`);
  }
}

/* ----------------- sessions ----------------- */

async function migrateSessions(sheets, supabase, spreadsheetId, allTabs) {
  const sessionTabs = allTabs
    .filter((t) => SESSION_TAB_REGEX.test(t))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (sessionTabs.length === 0) {
    // Backwards-compat: fall through to a single "sessions" tab if it exists.
    if (allTabs.includes("sessions")) sessionTabs.push("sessions");
  }
  if (sessionTabs.length === 0) {
    console.log("sessions: no session tabs found, skipping");
    return;
  }

  console.log(`sessions: scanning ${sessionTabs.length} tab(s): ${sessionTabs.join(", ")}`);

  let buffer = [];
  for (const tab of sessionTabs) {
    const rows = await readTab(sheets, spreadsheetId, tab);
    if (rows.length < 2) continue;
    const headers = rows[0].map((h) => String(h || "").trim());
    const idxOf = (name) => headers.indexOf(name);

    const sessionIdIdx = idxOf("session_id");
    if (sessionIdIdx === -1) {
      console.warn(`  ${tab}: no session_id column, skipping`);
      continue;
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const id = String(row[sessionIdIdx] || "").trim();
      if (!id) {
        stats.sessions.skipped++;
        continue;
      }
      stats.sessions.read++;
      const record = sessionRowToRecord(row, headers, id);
      if (!record) {
        stats.sessions.skipped++;
        continue;
      }
      buffer.push(record);
      if (buffer.length >= BATCH_SIZE) {
        await flushSessions(supabase, buffer);
        buffer = [];
      }
    }
    console.log(`  ${tab}: scanned ${rows.length - 1} rows (cumulative read=${stats.sessions.read})`);
  }
  if (buffer.length > 0) await flushSessions(supabase, buffer);
}

function sessionRowToRecord(row, headers, id) {
  const rec = {
    id,
    created_at: null,
    last_updated: null,
    finished: false,
    finished_at: null,
    version: 2,
    segment_filter: "all",
    total_answered: 0,
    total_questions: 0,
    completion_pct: 0,
    categories_completed: 0,
    overall_uniqueness: null,
    language: "",
    timezone: "",
    answers: {},
    category_uniqueness: {},
  };

  // Column-by-column extraction
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    const v = row[c];
    if (v == null || v === "") continue;
    switch (h) {
      case "created_at":
        rec.created_at = parseIso(v) || null;
        break;
      case "last_updated":
        rec.last_updated = parseIso(v);
        break;
      case "finished":
        rec.finished = String(v).toLowerCase() === "true" || v === true || v === 1 || v === "1";
        break;
      case "finished_at":
        rec.finished_at = parseIso(v);
        break;
      case "version":
        rec.version = clampInt(v, 0, 32767, 2);
        break;
      case "segment_filter":
        rec.segment_filter = String(v);
        break;
      case "total_answered":
        rec.total_answered = clampInt(v, 0, 100000, 0);
        break;
      case "total_questions":
        rec.total_questions = clampInt(v, 0, 100000, 0);
        break;
      case "completion_pct":
        rec.completion_pct = clampInt(v, 0, 100, 0);
        break;
      case "categories_completed":
        rec.categories_completed = clampInt(v, 0, 200, 0);
        break;
      case "overall_uniqueness": {
        const n = Number(v);
        rec.overall_uniqueness = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
        break;
      }
      case "language":
        rec.language = String(v).slice(0, 32);
        break;
      case "timezone":
        rec.timezone = String(v).slice(0, 64);
        break;
      case "_json": {
        // _json is the authoritative source for `answers` and `category_uniqueness`.
        const parsed = safeJsonParse(v);
        if (parsed && typeof parsed === "object") {
          if (parsed.answers && typeof parsed.answers === "object") {
            rec.answers = parsed.answers;
          }
          if (parsed.category_uniqueness && typeof parsed.category_uniqueness === "object") {
            rec.category_uniqueness = parsed.category_uniqueness;
          }
          if (rec.created_at == null && parsed.created_at) rec.created_at = parseIso(parsed.created_at);
          if (rec.finished_at == null && parsed.finished_at) rec.finished_at = parseIso(parsed.finished_at);
        }
        break;
      }
      default:
        // q_<qid> columns: only used as a fallback if _json never showed up.
        // We let _json overwrite later iterations. For rows missing _json,
        // we synthesize a minimal { value } entry per qid so live-peers still works.
        if (h.startsWith("q_")) {
          const qid = h.slice(2);
          if (!rec.answers[qid]) {
            rec.answers[qid] = { value: typeof v === "string" ? v : v };
          }
        }
        break;
    }
  }

  if (!rec.created_at) rec.created_at = new Date().toISOString();
  if (!rec.last_updated) rec.last_updated = rec.created_at;
  return rec;
}

async function flushSessions(supabase, buffer) {
  // Dedupe within batch — same `id` may appear in multiple tabs / multiple times in one tab.
  // Keep the last occurrence (most recent during the scan).
  const dedupedMap = new Map();
  for (const row of buffer) dedupedMap.set(row.id, row);
  const deduped = Array.from(dedupedMap.values());

  if (DRY_RUN) {
    stats.sessions.upserted += deduped.length;
    return;
  }
  const { error } = await supabase.from("sessions").upsert(deduped, { onConflict: "id" });
  if (!error) {
    stats.sessions.upserted += deduped.length;
    return;
  }
  // Fall back to per-row upsert for this batch when bulk fails (e.g. timeout).
  let recovered = 0;
  for (const row of deduped) {
    const { error: e2 } = await supabase.from("sessions").upsert([row], { onConflict: "id" });
    if (e2) {
      stats.sessions.errors.push(`row ${row.id.slice(-12)}: ${e2.message}`);
    } else {
      recovered++;
    }
  }
  stats.sessions.upserted += recovered;
}

/* ----------------- rooms ----------------- */

async function migrateRooms(sheets, supabase, spreadsheetId, allTabs) {
  if (!allTabs.includes(ROOMS_TAB)) {
    console.log("rooms: no `rooms` tab, skipping");
    return;
  }
  const rows = await readTab(sheets, spreadsheetId, ROOMS_TAB);
  if (rows.length < 2) {
    console.log("rooms: empty");
    return;
  }
  const headers = rows[0].map((h) => String(h || "").trim());
  const idxOf = (name) => headers.indexOf(name);

  const required = [
    "room_id", "owner_token_hash", "created_at", "expires_at",
    "max_participants", "title", "questionnaire_version", "status",
  ];
  const missing = required.filter((r) => idxOf(r) === -1);
  if (missing.length) {
    console.warn(`rooms: missing columns ${missing.join(", ")}, skipping migration`);
    return;
  }

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const roomId = String(row[idxOf("room_id")] || "").trim();
    if (!roomId) { stats.rooms.skipped++; continue; }
    stats.rooms.read++;

    const createdAt = parseIso(row[idxOf("created_at")]) || new Date().toISOString();
    let expiresAt = parseIso(row[idxOf("expires_at")]);
    if (!expiresAt) {
      // Default fallback for malformed/missing dates.
      expiresAt = new Date(new Date(createdAt).getTime() + TTL_MS).toISOString();
    }

    out.push({
      room_id: roomId,
      owner_token_hash: String(row[idxOf("owner_token_hash")] || ""),
      created_at: createdAt,
      expires_at: expiresAt,
      max_participants: clampInt(row[idxOf("max_participants")], 2, 25, 25),
      title: String(row[idxOf("title")] || "").slice(0, 80),
      questionnaire_version: String(row[idxOf("questionnaire_version")] || "").slice(0, 32),
      status: ["active", "deleted"].includes(String(row[idxOf("status")] || "").trim())
        ? String(row[idxOf("status")] || "").trim()
        : "active",
    });
  }

  console.log(`rooms: parsed ${out.length} rows`);
  if (DRY_RUN) {
    stats.rooms.upserted += out.length;
    return;
  }
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const batch = out.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("rooms").upsert(batch, { onConflict: "room_id" });
    if (error) {
      stats.rooms.errors.push(`batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      stats.rooms.upserted += batch.length;
    }
  }
}

/* ----------------- room_participants ----------------- */

async function migrateParticipants(sheets, supabase, spreadsheetId, allTabs) {
  if (!allTabs.includes(PARTICIPANTS_TAB)) {
    console.log("room_participants: no tab, skipping");
    return;
  }
  const rows = await readTab(sheets, spreadsheetId, PARTICIPANTS_TAB);
  if (rows.length < 2) {
    console.log("room_participants: empty");
    return;
  }
  const headers = rows[0].map((h) => String(h || "").trim());
  const idxOf = (name) => headers.indexOf(name);

  const required = [
    "room_id", "participant_number", "participant_token_hash", "status",
    "joined_at", "submitted_at", "answers_json",
  ];
  const missing = required.filter((r) => idxOf(r) === -1);
  if (missing.length) {
    console.warn(`room_participants: missing columns ${missing.join(", ")}, skipping`);
    return;
  }

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const roomId = String(row[idxOf("room_id")] || "").trim();
    const partNumStr = row[idxOf("participant_number")];
    const partNum = clampInt(partNumStr, 1, 25, NaN);
    if (!roomId || !Number.isFinite(partNum)) { stats.room_participants.skipped++; continue; }
    stats.room_participants.read++;

    const status = String(row[idxOf("status")] || "active").trim();
    const validStatus = ["active", "left", "kicked", "pending"].includes(status) ? status : "active";

    let answers = null;
    const rawAnswers = row[idxOf("answers_json")];
    if (rawAnswers != null && rawAnswers !== "") {
      const parsed = safeJsonParse(rawAnswers);
      if (parsed && typeof parsed === "object") {
        answers = parsed;
      } else {
        stats.room_participants.errors.push(`${roomId}#${partNum}: answers_json unparseable`);
      }
    }

    out.push({
      room_id: roomId,
      participant_number: partNum,
      participant_token_hash: String(row[idxOf("participant_token_hash")] || ""),
      status: validStatus,
      joined_at: parseIso(row[idxOf("joined_at")]) || new Date().toISOString(),
      submitted_at: parseIso(row[idxOf("submitted_at")]),
      answers_json: answers,
    });
  }

  console.log(`room_participants: parsed ${out.length} rows`);
  if (DRY_RUN) {
    stats.room_participants.upserted += out.length;
    return;
  }
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const batch = out.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("room_participants")
      .upsert(batch, { onConflict: "room_id,participant_number" });
    if (error) {
      stats.room_participants.errors.push(`batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      stats.room_participants.upserted += batch.length;
    }
  }
}

/* ----------------- helpers ----------------- */

function ensureEnv(keys) {
  const missing = keys.filter((k) => !process.env[k] || !String(process.env[k]).trim());
  if (missing.length > 0) {
    console.error("Missing env vars:", missing.join(", "));
    console.error("Tip: run `vercel env pull .env.migrate` then re-run with --env-file=.env.migrate");
    process.exit(1);
  }
}

async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: normalizePrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n");
}

async function listTabTitles(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  return (meta.data.sheets || [])
    .map((s) => s?.properties?.title)
    .filter((t) => typeof t === "string");
}

async function readTab(sheets, spreadsheetId, title) {
  const range = `'${String(title).replace(/'/g, "''")}'!A1:ZZ`;
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: "ROWS",
    });
    return result.data.values || [];
  } catch (err) {
    console.warn(`readTab(${title}) failed: ${err.message || err}`);
    return [];
  }
}

function parseIso(value) {
  if (value == null || value === "") return null;
  const s = typeof value === "string" ? value.trim() : String(value);
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(+d)) return null;
  return d.toISOString();
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function safeJsonParse(value) {
  if (typeof value !== "string") {
    if (value && typeof value === "object") return value;
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}
