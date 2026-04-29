/**
 * Receives session snapshots from the client and upserts them into the
 * `sessions` table. Fire-and-forget — always returns 200/204 unless the
 * payload is structurally bad. Tolerates sendBeacon (Buffer body) and
 * fetch (string body) alike.
 */
import { getSupabase } from "./_lib/supabase.js";
import { getIp, methodNotAllowed, rateLimit } from "./_lib/rooms.js";

const MAX_BODY_BYTES = 200_000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, "POST");
  }

  const ip = getIp(req);
  if (rateLimit({ ip, bucket: "log-session", windowMs: 60_000, max: 60 })) {
    return res.status(429).json({ ok: false, error: "Too many requests" });
  }

  let body;
  try {
    body = readBody(req);
  } catch (_) {
    return res.status(400).json({ ok: false, error: "Bad body" });
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "Bad body" });
  }

  const snapshot = body.snapshot;
  const meta = body.meta || {};
  if (!snapshot || typeof snapshot !== "object" || !snapshot.id) {
    return res.status(400).json({ ok: false, error: "Missing snapshot" });
  }

  const row = buildRow(snapshot, meta);

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("sessions")
      .upsert(row, { onConflict: "id" });
    if (error) {
      // Log server-side; still return 204 — telemetry is fire-and-forget.
      console.warn("log-session upsert failed:", error.message);
    }
  } catch (err) {
    console.warn("log-session error:", err && err.message ? err.message : err);
  }

  return res.status(204).end();
}

function readBody(req) {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) {
    if (raw.length > MAX_BODY_BYTES) throw new Error("Body too large");
    return JSON.parse(raw.toString("utf8"));
  }
  if (typeof raw === "string") {
    if (raw.length > MAX_BODY_BYTES) throw new Error("Body too large");
    return JSON.parse(raw);
  }
  if (typeof raw === "object") return raw;
  return {};
}

function buildRow(snap, meta) {
  const totalAnswered = Number(snap.total_answered) || 0;
  const totalQuestions = Number(snap.total_questions) || 0;
  const completionPct = totalQuestions
    ? Math.round((totalAnswered / totalQuestions) * 100)
    : 0;
  const overallUniq = computeOverallUniqueness(snap.category_uniqueness);

  return {
    id: String(snap.id),
    created_at: toIso(snap.created_at) || new Date().toISOString(),
    last_updated: new Date().toISOString(),
    finished: Boolean(snap.finished),
    finished_at: toIso(snap.finished_at),
    version: clampSmallInt(snap.version, 0, 32767, 2),
    segment_filter: typeof snap.segment_filter === "string" ? snap.segment_filter : "all",
    total_answered: totalAnswered,
    total_questions: totalQuestions,
    completion_pct: clampSmallInt(completionPct, 0, 100, 0),
    categories_completed: clampSmallInt(snap.categories_completed, 0, 200, 0),
    overall_uniqueness: overallUniq,
    language: typeof meta.language === "string" ? meta.language.slice(0, 32) : "",
    timezone: typeof meta.timezone === "string" ? meta.timezone.slice(0, 64) : "",
    answers: snap.answers && typeof snap.answers === "object" ? snap.answers : {},
    category_uniqueness:
      snap.category_uniqueness && typeof snap.category_uniqueness === "object"
        ? snap.category_uniqueness
        : {},
  };
}

function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(+d) ? null : d.toISOString();
}

function clampSmallInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function computeOverallUniqueness(catUniq) {
  if (!catUniq || typeof catUniq !== "object") return null;
  const keys = Object.keys(catUniq);
  if (keys.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (const k of keys) {
    const score = catUniq[k] && typeof catUniq[k].score === "number" ? catUniq[k].score : null;
    if (score == null || !Number.isFinite(score)) continue;
    sum += score;
    n += 1;
  }
  if (n === 0) return null;
  return Math.round((sum / n) * 100);
}
