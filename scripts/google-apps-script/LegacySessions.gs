/**
 * average.io — session webhook (legacy logger)
 * Accepts POSTed session snapshots and upserts them into rotating "sessions"
 * tabs. Each tab stores at most 5000 data rows (header excluded):
 *   sessions_001, sessions_002, sessions_003, ...
 *
 * This file is meant to be used as doPostLegacy_(e) while Rooms.gs owns doPost(e).
 */

const SECRET = "stijnbessem";
const SESSION_SHEET_PREFIX = "sessions_";
const SESSION_ROWS_PER_TAB = 5000; // data rows (row 1 is header)

const BASE_COLS = [
  "session_id",
  "created_at",
  "last_updated",
  "finished",
  "finished_at",
  "total_answered",
  "total_questions",
  "completion_pct",
  "categories_completed",
  "overall_uniqueness",
  "segment_filter",
  "user_agent",
  "language",
  "timezone",
  "version",
];

function legacySecret_() {
  return PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || SECRET;
}

function doPostLegacy_(e) {
  try {
    let rawBody = null;
    if (e && e.parameter && e.parameter.payload) {
      rawBody = e.parameter.payload;
    } else if (e && e.postData && e.postData.contents) {
      rawBody = e.postData.contents;
    }
    if (!rawBody) return json_({ ok: false, error: "no payload" });

    const body = JSON.parse(rawBody);
    if (!body || body.secret !== legacySecret_()) {
      return json_({ ok: false, error: "unauthorized" });
    }
    const snapshot = body.snapshot;
    if (!snapshot || !snapshot.id) {
      return json_({ ok: false, error: "missing snapshot" });
    }

    const sh = getOrCreateWriteSheet_();
    ensureHeaders_(sh);
    const row = buildRow_(snapshot, body.meta || {});
    upsert_(sh, snapshot.id, row);
    return json_({ ok: true, sheet: sh.getName() });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doGet() {
  return ContentService
    .createTextOutput("average.io webhook is live")
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ---------- helpers ---------- */

function getOrCreateWriteSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const sessionSheets = [];

  sheets.forEach((sh) => {
    const m = String(sh.getName()).match(/^sessions_(\d{3})$/);
    if (!m) return;
    sessionSheets.push({ sh, n: Number(m[1]) });
  });

  // Backwards compatibility: adopt existing "sessions" tab as sessions_001.
  if (sessionSheets.length === 0) {
    const legacy = ss.getSheetByName("sessions");
    if (legacy) {
      legacy.setName("sessions_001");
      ensureHeaders_(legacy);
      return legacy;
    }
  }

  if (sessionSheets.length === 0) {
    const created = ss.insertSheet("sessions_001");
    ensureHeaders_(created);
    return created;
  }

  sessionSheets.sort((a, b) => a.n - b.n);
  const active = sessionSheets[sessionSheets.length - 1].sh;
  ensureHeaders_(active);

  const dataRows = Math.max(0, active.getLastRow() - 1);
  if (dataRows < SESSION_ROWS_PER_TAB) return active;

  const nextNum = sessionSheets[sessionSheets.length - 1].n + 1;
  const nextName = `${SESSION_SHEET_PREFIX}${String(nextNum).padStart(3, "0")}`;
  let next = ss.getSheetByName(nextName);
  if (!next) {
    next = ss.insertSheet(nextName);
  }
  ensureHeaders_(next);
  return next;
}

function ensureHeaders_(sh) {
  if (sh.getLastRow() !== 0) return;
  const headers = BASE_COLS.concat(["_json"]);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
}

function getHeaders_(sh) {
  const n = sh.getLastColumn();
  if (n === 0) return [];
  return sh.getRange(1, 1, 1, n).getValues()[0];
}

function buildRow_(snap, meta) {
  const ans = snap.answers || {};
  const flat = {
    session_id: snap.id,
    created_at: snap.created_at,
    last_updated: new Date().toISOString(),
    finished: !!snap.finished,
    finished_at: snap.finished_at || "",
    total_answered: snap.total_answered || 0,
    total_questions: snap.total_questions || 0,
    completion_pct: snap.total_questions
      ? Math.round((snap.total_answered / snap.total_questions) * 100)
      : 0,
    categories_completed: snap.categories_completed || 0,
    overall_uniqueness: computeOverallUniq_(snap.category_uniqueness || {}),
    segment_filter: snap.segment_filter || "all",
    user_agent: meta.user_agent || "",
    language: meta.language || "",
    timezone: meta.timezone || "",
    version: snap.version || 1,
    _json: JSON.stringify(snap),
  };

  Object.keys(ans).forEach((qid) => {
    const v = ans[qid];
    const value = v && typeof v === "object" ? v.value : v;
    flat[`q_${qid}`] = value;
  });
  return flat;
}

function computeOverallUniq_(catUniq) {
  const keys = Object.keys(catUniq);
  if (keys.length === 0) return "";
  let sum = 0;
  keys.forEach((k) => { sum += (catUniq[k] && catUniq[k].score) || 0; });
  return Math.round((sum / keys.length) * 100);
}

function upsert_(sh, sessionId, flatRow) {
  let headers = getHeaders_(sh);

  const knownSet = {};
  headers.forEach((h) => { knownSet[h] = true; });
  const newCols = Object.keys(flatRow).filter((k) => !knownSet[k] && k !== "_json");
  if (newCols.length > 0) {
    const jsonIdx = headers.indexOf("_json");
    if (jsonIdx >= 0) {
      sh.insertColumnsBefore(jsonIdx + 1, newCols.length);
      sh.getRange(1, jsonIdx + 1, 1, newCols.length).setValues([newCols]).setFontWeight("bold");
    } else {
      const start = headers.length + 1;
      sh.getRange(1, start, 1, newCols.length).setValues([newCols]).setFontWeight("bold");
    }
    headers = getHeaders_(sh);
  }

  const rowArr = headers.map((h) => (h in flatRow ? flatRow[h] : ""));

  const sessionCol = headers.indexOf("session_id") + 1;
  const lastRow = sh.getLastRow();
  let targetRow = -1;
  if (lastRow > 1) {
    const ids = sh.getRange(2, sessionCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === sessionId) { targetRow = i + 2; break; }
    }
  }

  if (targetRow === -1) {
    sh.appendRow(rowArr);
  } else {
    sh.getRange(targetRow, 1, 1, rowArr.length).setValues([rowArr]);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- diagnostics ---------- */

function diagnoseSessionSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabs = ss.getSheets()
    .map((s) => s.getName())
    .filter((n) => /^sessions_\d{3}$/.test(n))
    .sort();
  const rows = tabs.map((name) => {
    const sh = ss.getSheetByName(name);
    return `${name}: ${Math.max(0, sh.getLastRow() - 1)} rows`;
  });
  Logger.log(`session tabs: ${tabs.length ? tabs.join(", ") : "(none)"}`);
  rows.forEach((r) => Logger.log(r));
}

