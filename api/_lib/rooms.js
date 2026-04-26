import crypto from "node:crypto";
import { google } from "googleapis";

const ACCESS_COOKIE = "comparizzon_paid_overview";
const ROOMS_SHEET_NAME = "rooms";
const PARTICIPANTS_SHEET_NAME = "room_participants";
const ROOMS_HEADERS = [
  "room_id",
  "owner_token_hash",
  "created_at",
  "expires_at",
  "max_participants",
  "title",
  "questionnaire_version",
  "status",
];
const PARTICIPANTS_HEADERS = [
  "room_id",
  "participant_number",
  "participant_token_hash",
  "status",
  "joined_at",
  "submitted_at",
  "answers_json",
];

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

function parseCookies(raw = "") {
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

export function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ROOM_TOKEN_SECRET is not configured");
  }
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

/* ------------------------------------------------------------------ */
/*  Apps Script writer                                                */
/* ------------------------------------------------------------------ */

export async function callAppsScript(action, args = {}) {
  const url = process.env.GOOGLE_WEBHOOK_URL;
  const secret = process.env.GOOGLE_WEBHOOK_SECRET;
  if (!url || !secret) {
    throw new Error("Apps Script webhook is not configured (GOOGLE_WEBHOOK_URL / GOOGLE_WEBHOOK_SECRET).");
  }
  const payload = { secret, action, ...args };
  const body = "payload=" + encodeURIComponent(JSON.stringify(payload));

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
    redirect: "follow",
  });
  const text = await upstream.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    throw new Error(`Apps Script returned non-JSON (${upstream.status})`);
  }
  if (!upstream.ok) {
    throw new Error(json?.error || `Apps Script HTTP ${upstream.status}`);
  }
  if (!json.ok) {
    const err = new Error(json.error || "Apps Script action failed");
    err.appsScript = true;
    throw err;
  }
  return json;
}

/* ------------------------------------------------------------------ */
/*  Direct Sheet reads (fast, no Apps Script round-trip)              */
/* ------------------------------------------------------------------ */

function normalizePrivateKey(value) {
  if (!value) return "";
  return value.replace(/\\n/g, "\n");
}

let sheetsClientPromise = null;
async function getSheetsClient() {
  if (sheetsClientPromise) return sheetsClientPromise;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY);
  if (!clientEmail || !privateKey) {
    throw new Error("Google Sheets read is not configured (GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY).");
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  sheetsClientPromise = Promise.resolve(google.sheets({ version: "v4", auth }));
  return sheetsClientPromise;
}

function rowsToObjects(values, headers) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const headerRow = (values[0] || []).map((h) => String(h || "").trim());
  const headerMap = headers.map((name) => headerRow.indexOf(name));
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      const idx = headerMap[i];
      obj[headers[i]] = idx === -1 ? "" : (row[idx] == null ? "" : row[idx]);
    }
    out.push(obj);
  }
  return out;
}

async function readSheetTab(spreadsheetId, sheets, sheetName, headers) {
  const range = `'${sheetName}'!A1:Z`;
  let response;
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: "ROWS",
    });
  } catch (err) {
    if (err && err.code === 400) {
      return [];
    }
    throw err;
  }
  return rowsToObjects(response.data.values || [], headers);
}

export async function readRoomFromSheet(roomId) {
  if (!isValidRoomId(roomId)) {
    throw new Error("Invalid room id");
  }
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not configured.");
  }
  const sheets = await getSheetsClient();
  const [roomsRows, partRows] = await Promise.all([
    readSheetTab(spreadsheetId, sheets, ROOMS_SHEET_NAME, ROOMS_HEADERS),
    readSheetTab(spreadsheetId, sheets, PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS),
  ]);

  const room = roomsRows.find((r) => String(r.room_id) === roomId) || null;
  const participants = partRows
    .filter((p) => String(p.room_id) === roomId)
    .map((p) => ({
      participant_number: Number(p.participant_number),
      participant_token_hash: String(p.participant_token_hash || ""),
      status: String(p.status || ""),
      joined_at: String(p.joined_at || ""),
      submitted_at: String(p.submitted_at || ""),
      answers_json: String(p.answers_json || ""),
    }))
    .sort((a, b) => a.participant_number - b.participant_number);

  return { room, participants };
}

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
      (p) => p.status === "active" && p.participant_token_hash === tokenHash
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
