import crypto from "node:crypto";
import { getSupabase } from "./supabase.js";

const ACCESS_COOKIE = "comparizzon_paid_overview";
const ROOM_ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_ID_LENGTH = 8;

export const ROOM_DEFAULTS = Object.freeze({
  MAX_PARTICIPANTS: 25,
  MIN_PARTICIPANTS: 2,
  TTL_DAYS: 30,
  MAX_TITLE_LENGTH: 80,
  MAX_ANSWERS_BYTES: 200000,
  ROOM_ID_PATTERN: /^[A-Z0-9]{6,12}$/,
});

/* ------------------------------------------------------------------ */
/*  Body / IP / cookies                                               */
/* ------------------------------------------------------------------ */

export function parseBody(req) {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) {
    try {
      return JSON.parse(raw.toString("utf8"));
    } catch (_) {
      return {};
    }
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return {};
}

export function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export function parseCookies(raw = "") {
  return String(raw)
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const idx = entry.indexOf("=");
      if (idx === -1) return acc;
      acc[entry.slice(0, idx)] = entry.slice(idx + 1);
      return acc;
    }, {});
}

export function hasPaidCookie(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[ACCESS_COOKIE] === "1";
}

export const PAID_COOKIE_NAME = ACCESS_COOKIE;

/* ------------------------------------------------------------------ */
/*  Rate limiting (in-memory, per serverless instance)                */
/* ------------------------------------------------------------------ */

const RATE_LIMITS = new Map();

export function rateLimit({ ip, bucket, windowMs, max }) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const prior = RATE_LIMITS.get(key) || [];
  const recent = prior.filter((ts) => now - ts < windowMs);
  recent.push(now);
  RATE_LIMITS.set(key, recent);
  return recent.length > max;
}

/* ------------------------------------------------------------------ */
/*  Tokens                                                            */
/* ------------------------------------------------------------------ */

/**
 * HMAC key for hashing participant/owner tokens. Same derivation as before
 * the Supabase migration so existing room links keep working — DO NOT rotate.
 * Prefer ROOM_TOKEN_SECRET; if unset, derive from GOOGLE_WEBHOOK_SECRET.
 */
function getRoomTokenSecret() {
  const explicit = process.env.ROOM_TOKEN_SECRET;
  if (explicit && String(explicit).trim()) {
    return String(explicit).trim();
  }
  const webhook = process.env.GOOGLE_WEBHOOK_SECRET;
  if (webhook && String(webhook).trim()) {
    // Salt is fixed forever: changing it invalidates every existing room's
    // owner_token_hash and participant_token_hash. Do NOT rename.
    return crypto
      .createHash("sha256")
      .update(`average-io:room-token-derive:v1:${String(webhook).trim()}`)
      .digest("hex");
  }
  throw new Error(
    "Set ROOM_TOKEN_SECRET or GOOGLE_WEBHOOK_SECRET in environment variables.",
  );
}

export function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  const secret = getRoomTokenSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(String(token))
    .digest("hex");
}

export function isValidRoomId(roomId) {
  return typeof roomId === "string" && ROOM_DEFAULTS.ROOM_ID_PATTERN.test(roomId);
}

export function safeTitle(value) {
  return String(value || "").trim().slice(0, ROOM_DEFAULTS.MAX_TITLE_LENGTH);
}

function generateRoomId() {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    const idx = Math.floor(Math.random() * ROOM_ID_ALPHABET.length);
    id += ROOM_ID_ALPHABET.charAt(idx);
  }
  return id;
}

/* ------------------------------------------------------------------ */
/*  Supabase helpers                                                  */
/* ------------------------------------------------------------------ */

export async function readRoomFromDb(roomId) {
  if (!isValidRoomId(roomId)) {
    throw new Error("Invalid room id");
  }
  const supabase = getSupabase();
  const [roomRes, partRes] = await Promise.all([
    supabase.from("rooms").select("*").eq("room_id", roomId).maybeSingle(),
    supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .order("participant_number", { ascending: true }),
  ]);
  if (roomRes.error) throw new Error(roomRes.error.message);
  if (partRes.error) throw new Error(partRes.error.message);

  return {
    room: roomRes.data,
    participants: (partRes.data || []).map((p) => ({
      participant_number: Number(p.participant_number),
      participant_token_hash: String(p.participant_token_hash || ""),
      status: String(p.status || ""),
      joined_at: p.joined_at || "",
      submitted_at: p.submitted_at || "",
      answers_json: p.answers_json,
    })),
  };
}

export async function createRoomInDb({
  ownerTokenHash,
  title,
  questionnaireVersion,
  maxParticipants,
  ttlDays,
}) {
  const supabase = getSupabase();
  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  let lastError = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const roomId = generateRoomId();
    const { error: roomErr } = await supabase.from("rooms").insert({
      room_id: roomId,
      owner_token_hash: ownerTokenHash,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      max_participants: maxParticipants,
      title,
      questionnaire_version: questionnaireVersion,
      status: "active",
    });
    if (roomErr) {
      // 23505 = unique_violation (room_id collision). Retry.
      if (roomErr.code === "23505") {
        lastError = roomErr;
        continue;
      }
      throw new Error(roomErr.message);
    }

    const { error: partErr } = await supabase.from("room_participants").insert({
      room_id: roomId,
      participant_number: 1,
      participant_token_hash: ownerTokenHash,
      status: "active",
      joined_at: now.toISOString(),
    });
    if (partErr) {
      // Best-effort rollback so we don't leave an orphan room.
      await supabase.from("rooms").delete().eq("room_id", roomId);
      throw new Error(partErr.message);
    }

    return {
      room_id: roomId,
      owner_number: 1,
      expires_at: expires.toISOString(),
      max_participants: maxParticipants,
      title,
      questionnaire_version: questionnaireVersion,
    };
  }
  throw new Error(lastError ? `Could not generate unique room id (${lastError.message})` : "Could not generate unique room id");
}

export async function joinRoomInDb({ roomId, participantTokenHash }) {
  const supabase = getSupabase();
  const { room, participants } = await readRoomFromDb(roomId);
  if (!room || !isRoomActive(room)) throw new Error("Room not found");

  const existing = participants.find(
    (p) => p.status === "active" && p.participant_token_hash === participantTokenHash,
  );
  if (existing) {
    return {
      room_id: roomId,
      participant_number: existing.participant_number,
      already_member: true,
    };
  }

  const max = Number(room.max_participants) || ROOM_DEFAULTS.MAX_PARTICIPANTS;
  const used = new Set(
    participants.filter((p) => p.status === "active").map((p) => p.participant_number),
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    let next = -1;
    for (let n = 1; n <= max; n++) {
      if (!used.has(n)) {
        next = n;
        break;
      }
    }
    if (next === -1) throw new Error("Room is full");

    const { error } = await supabase.from("room_participants").insert({
      room_id: roomId,
      participant_number: next,
      participant_token_hash: participantTokenHash,
      status: "active",
      joined_at: new Date().toISOString(),
    });
    if (!error) {
      return { room_id: roomId, participant_number: next, already_member: false };
    }
    if (error.code !== "23505") {
      throw new Error(error.message);
    }
    // Slot raced; mark it used and retry with next slot.
    used.add(next);
  }
  throw new Error("Could not allocate participant slot");
}

export async function submitAnswersInDb({ roomId, participantTokenHash, answersJson }) {
  const supabase = getSupabase();
  const { room } = await readRoomFromDb(roomId);
  if (!room || !isRoomActive(room)) throw new Error("Room not found");

  const parsed = typeof answersJson === "string" ? safeJsonParse(answersJson) : answersJson;

  const { data, error } = await supabase
    .from("room_participants")
    .update({
      submitted_at: new Date().toISOString(),
      answers_json: parsed,
    })
    .eq("room_id", roomId)
    .eq("participant_token_hash", participantTokenHash)
    .eq("status", "active")
    .select("participant_number");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Not a participant");
  return { ok: true };
}

export async function leaveRoomInDb({ roomId, participantTokenHash }) {
  const supabase = getSupabase();
  const { participants } = await readRoomFromDb(roomId);
  const me = participants.find(
    (p) => p.status === "active" && p.participant_token_hash === participantTokenHash,
  );
  if (!me) throw new Error("Not a participant");

  if (me.participant_number === 1) {
    return deleteRoomCascade(roomId);
  }

  const { error } = await supabase
    .from("room_participants")
    .update({ status: "left", answers_json: null })
    .eq("room_id", roomId)
    .eq("participant_number", me.participant_number);
  if (error) throw new Error(error.message);
  return { deleted_room: false };
}

export async function kickParticipantInDb({ roomId, ownerTokenHash, targetNumber }) {
  const supabase = getSupabase();
  if (!(await verifyOwner(roomId, ownerTokenHash))) {
    throw new Error("Unauthorized");
  }
  const { error } = await supabase
    .from("room_participants")
    .update({ status: "kicked", answers_json: null })
    .eq("room_id", roomId)
    .eq("participant_number", targetNumber)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteRoomInDb({ roomId, ownerTokenHash }) {
  if (!(await verifyOwner(roomId, ownerTokenHash))) {
    throw new Error("Unauthorized");
  }
  return deleteRoomCascade(roomId);
}

async function deleteRoomCascade(roomId) {
  const supabase = getSupabase();
  const { error: roomErr } = await supabase
    .from("rooms")
    .update({ status: "deleted" })
    .eq("room_id", roomId);
  if (roomErr) throw new Error(roomErr.message);

  const { error: partErr } = await supabase
    .from("room_participants")
    .update({ status: "left", answers_json: null })
    .eq("room_id", roomId)
    .neq("status", "left");
  if (partErr) throw new Error(partErr.message);

  return { deleted_room: true };
}

async function verifyOwner(roomId, ownerTokenHash) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("room_participants")
    .select("participant_number")
    .eq("room_id", roomId)
    .eq("participant_number", 1)
    .eq("participant_token_hash", ownerTokenHash)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch (_) {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Read-side helpers (unchanged shape — used by the dispatcher)      */
/* ------------------------------------------------------------------ */

export function isRoomActive(room) {
  if (!room) return false;
  if (String(room.status || "").trim() !== "active") return false;
  const expires = room.expires_at ? new Date(room.expires_at) : null;
  if (!expires || isNaN(+expires)) return true;
  return Date.now() <= +expires;
}

export function summarizeParticipants(participants) {
  return participants
    .filter((p) => p.status === "active" || p.status === "left" || p.status === "kicked")
    .map((p) => ({
      number: p.participant_number,
      status: p.status,
      has_submitted: Boolean(p.submitted_at),
    }));
}

export function findActiveParticipantByTokenHash(participants, tokenHash) {
  if (!tokenHash) return null;
  return (
    participants.find(
      (p) => p.status === "active" && p.participant_token_hash === tokenHash,
    ) || null
  );
}

/* ------------------------------------------------------------------ */
/*  Standard error helper                                             */
/* ------------------------------------------------------------------ */

export function methodNotAllowed(res, allow) {
  res.setHeader("Allow", Array.isArray(allow) ? allow.join(", ") : allow);
  return res.status(405).json({ error: "Method not allowed" });
}
