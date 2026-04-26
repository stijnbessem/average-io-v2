/**
 * average-io / comparizzon — Private Comparison Rooms (Apps Script)
 *
 * Adds private "comparison room" actions on top of your existing Sheet
 * webhook. The legacy session-logging behavior keeps working untouched: when
 * a request arrives WITHOUT an `action` field, this script delegates to your
 * existing `doPostLegacy_(e)` (i.e. your previous `doPost`).
 *
 * SETUP (also see SETUP.md in the same folder):
 *   1. In your Apps Script project, RENAME your current `doPost(e)` to
 *      `doPostLegacy_(e)`. Then create a new file (e.g. "Rooms.gs") and
 *      paste the contents of THIS file into it.
 *   2. (Optional but recommended) add two new tabs to your Sheet:
 *        - "rooms"               with headers: room_id, owner_token_hash,
 *                                created_at, expires_at, max_participants,
 *                                title, questionnaire_version, status
 *        - "room_participants"   with headers: room_id, participant_number,
 *                                participant_token_hash, status, joined_at,
 *                                submitted_at, answers_json
 *      The script will create them automatically on first use if missing.
 *   3. Project Settings → Script properties:
 *        - WEBHOOK_SECRET     = same value as Vercel GOOGLE_WEBHOOK_SECRET
 *        - ROOM_TOKEN_SECRET  = a fresh 32+ char random string. Add the same
 *                               value to Vercel as ROOM_TOKEN_SECRET.
 *   4. Triggers → add a daily trigger for `cleanupExpiredRoomsTrigger`.
 *   5. Deploy → Manage deployments → Edit → New version → Deploy.
 *
 * The Vercel side hashes participant/owner tokens with
 *   HMAC-SHA256(token, ROOM_TOKEN_SECRET) → hex digest
 * before sending them to this script, so the Sheet never holds a usable
 * token.
 */

const ROOMS_SHEET_NAME = "rooms";
const PARTICIPANTS_SHEET_NAME = "room_participants";
const DEFAULT_MAX_PARTICIPANTS = 25;
const MIN_PARTICIPANTS = 2;
const DEFAULT_TTL_DAYS = 30;
const MAX_TTL_DAYS = 90;
const ROOM_ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_ID_LENGTH = 8;
const MAX_ANSWERS_BYTES = 200000;
const MAX_TITLE_LENGTH = 80;

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

/* ------------------------------------------------------------------ */
/*  Top-level dispatcher                                              */
/* ------------------------------------------------------------------ */

function doPost(e) {
  let payload = null;
  try {
    payload = roomsParsePayload_(e);
  } catch (_) {
    payload = null;
  }

  if (payload && payload.action) {
    if (payload.secret !== roomsGetProp_("WEBHOOK_SECRET")) {
      return roomsJsonOut_({ ok: false, error: "Unauthorized" });
    }
    return roomsDispatch_(payload);
  }

  // No action field present — delegate to your existing logger.
  if (typeof doPostLegacy_ === "function") {
    return doPostLegacy_(e);
  }
  return roomsJsonOut_({
    ok: false,
    error: "No legacy doPostLegacy_(e) found. Rename your previous doPost.",
  });
}

function roomsDispatch_(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15 * 1000);
  } catch (_) {
    return roomsJsonOut_({ ok: false, error: "Busy, try again" });
  }
  try {
    switch (payload.action) {
      case "create_room":      return roomsJsonOut_(roomsCreate_(payload));
      case "join_room":        return roomsJsonOut_(roomsJoin_(payload));
      case "submit_answers":   return roomsJsonOut_(roomsSubmit_(payload));
      case "leave_room":       return roomsJsonOut_(roomsLeave_(payload));
      case "kick_participant": return roomsJsonOut_(roomsKick_(payload));
      case "delete_room":      return roomsJsonOut_(roomsDelete_(payload));
      case "cleanup_expired":  return roomsJsonOut_(roomsCleanupExpired_());
      default:                 return roomsJsonOut_({ ok: false, error: "Unknown action" });
    }
  } catch (err) {
    return roomsJsonOut_({
      ok: false,
      error: String((err && err.message) || err),
    });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/** Run from Apps Script Triggers (daily). */
function cleanupExpiredRoomsTrigger() {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30 * 1000); } catch (_) { return; }
  try {
    roomsCleanupExpired_();
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ------------------------------------------------------------------ */
/*  Actions                                                           */
/* ------------------------------------------------------------------ */

function roomsCreate_(payload) {
  const ownerTokenHash = roomsClean_(payload.owner_token_hash);
  if (!ownerTokenHash) return { ok: false, error: "Missing owner token" };

  const title = roomsClean_(payload.title).slice(0, MAX_TITLE_LENGTH);
  const questionnaireVersion = roomsClean_(payload.questionnaire_version).slice(0, 32);
  const maxParticipants = roomsClampInt_(
    payload.max_participants, MIN_PARTICIPANTS, DEFAULT_MAX_PARTICIPANTS, DEFAULT_MAX_PARTICIPANTS
  );
  const ttlDays = roomsClampInt_(payload.ttl_days, 1, MAX_TTL_DAYS, DEFAULT_TTL_DAYS);

  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  const roomsSheet = roomsGetSheet_(ROOMS_SHEET_NAME, ROOMS_HEADERS);
  const partsSheet = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);

  const roomId = roomsGenerateUniqueId_(roomsSheet);
  roomsSheet.appendRow([
    roomId,
    ownerTokenHash,
    now.toISOString(),
    expires.toISOString(),
    maxParticipants,
    title,
    questionnaireVersion,
    "active",
  ]);
  partsSheet.appendRow([
    roomId,
    1,
    ownerTokenHash,
    "active",
    now.toISOString(),
    "",
    "",
  ]);

  return {
    ok: true,
    room_id: roomId,
    owner_number: 1,
    expires_at: expires.toISOString(),
    max_participants: maxParticipants,
    title: title,
    questionnaire_version: questionnaireVersion,
  };
}

function roomsJoin_(payload) {
  const roomId = roomsClean_(payload.room_id);
  const tokenHash = roomsClean_(payload.participant_token_hash);
  if (!roomId || !tokenHash) return { ok: false, error: "Missing fields" };

  const room = roomsGetRoom_(roomId);
  if (!room || room.status !== "active") return { ok: false, error: "Room not found" };
  if (new Date() > new Date(room.expires_at)) return { ok: false, error: "Room expired" };

  const partsSheet = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);
  const rows = roomsReadRows_(partsSheet);

  const existing = rows.find(function (r) {
    return r.room_id === roomId
      && r.participant_token_hash === tokenHash
      && r.status === "active";
  });
  if (existing) {
    return {
      ok: true,
      room_id: roomId,
      participant_number: Number(existing.participant_number),
      already_member: true,
    };
  }

  const max = Number(room.max_participants) || DEFAULT_MAX_PARTICIPANTS;
  const used = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.room_id === roomId && r.status === "active") {
      used[Number(r.participant_number)] = true;
    }
  }
  let nextNumber = -1;
  for (let n = 1; n <= max; n++) {
    if (!used[n]) { nextNumber = n; break; }
  }
  if (nextNumber === -1) return { ok: false, error: "Room is full" };

  partsSheet.appendRow([
    roomId,
    nextNumber,
    tokenHash,
    "active",
    new Date().toISOString(),
    "",
    "",
  ]);

  return { ok: true, room_id: roomId, participant_number: nextNumber };
}

function roomsSubmit_(payload) {
  const roomId = roomsClean_(payload.room_id);
  const tokenHash = roomsClean_(payload.participant_token_hash);
  let answersJson;
  if (typeof payload.answers_json === "string") {
    answersJson = payload.answers_json;
  } else {
    try { answersJson = JSON.stringify(payload.answers_json || {}); }
    catch (_) { answersJson = "{}"; }
  }
  if (!roomId || !tokenHash) return { ok: false, error: "Missing fields" };
  if (answersJson.length > MAX_ANSWERS_BYTES) return { ok: false, error: "Answers too large" };

  const room = roomsGetRoom_(roomId);
  if (!room || room.status !== "active") return { ok: false, error: "Room not found" };
  if (new Date() > new Date(room.expires_at)) return { ok: false, error: "Room expired" };

  const partsSheet = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);
  const idx = roomsFindParticipantByToken_(partsSheet, roomId, tokenHash);
  if (idx === -1) return { ok: false, error: "Not a participant" };

  const submittedCol = PARTICIPANTS_HEADERS.indexOf("submitted_at") + 1;
  const answersCol = PARTICIPANTS_HEADERS.indexOf("answers_json") + 1;
  partsSheet.getRange(idx + 2, submittedCol).setValue(new Date().toISOString());
  partsSheet.getRange(idx + 2, answersCol).setValue(answersJson);

  return { ok: true };
}

function roomsLeave_(payload) {
  const roomId = roomsClean_(payload.room_id);
  const tokenHash = roomsClean_(payload.participant_token_hash);
  if (!roomId || !tokenHash) return { ok: false, error: "Missing fields" };

  const partsSheet = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);
  const idx = roomsFindParticipantByToken_(partsSheet, roomId, tokenHash);
  if (idx === -1) return { ok: false, error: "Not a participant" };

  const row = roomsReadRowAt_(partsSheet, idx);
  if (Number(row.participant_number) === 1) {
    return roomsDeleteById_(roomId);
  }
  roomsUpdateStatus_(partsSheet, idx, "left", { clearAnswers: true });
  return { ok: true };
}

function roomsKick_(payload) {
  const roomId = roomsClean_(payload.room_id);
  const ownerTokenHash = roomsClean_(payload.owner_token_hash);
  const targetNumber = roomsClampInt_(payload.target_number, 2, DEFAULT_MAX_PARTICIPANTS, -1);
  if (!roomId || !ownerTokenHash || targetNumber < 2) return { ok: false, error: "Invalid request" };
  if (!roomsVerifyOwner_(roomId, ownerTokenHash)) return { ok: false, error: "Unauthorized" };

  const partsSheet = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);
  const idx = roomsFindParticipantByNumber_(partsSheet, roomId, targetNumber);
  if (idx === -1) return { ok: false, error: "Participant not found" };

  roomsUpdateStatus_(partsSheet, idx, "kicked", { clearAnswers: true });
  return { ok: true };
}

function roomsDelete_(payload) {
  const roomId = roomsClean_(payload.room_id);
  const ownerTokenHash = roomsClean_(payload.owner_token_hash);
  if (!roomId || !ownerTokenHash) return { ok: false, error: "Missing fields" };
  if (!roomsVerifyOwner_(roomId, ownerTokenHash)) return { ok: false, error: "Unauthorized" };
  return roomsDeleteById_(roomId);
}

function roomsDeleteById_(roomId) {
  const roomsSheet = roomsGetSheet_(ROOMS_SHEET_NAME, ROOMS_HEADERS);
  const partsSheet = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);

  const rRows = roomsReadRows_(roomsSheet);
  const rIdx = rRows.findIndex(function (r) { return r.room_id === roomId; });
  if (rIdx !== -1) {
    const statusCol = ROOMS_HEADERS.indexOf("status") + 1;
    roomsSheet.getRange(rIdx + 2, statusCol).setValue("deleted");
  }

  const pRows = roomsReadRows_(partsSheet);
  const statusCol = PARTICIPANTS_HEADERS.indexOf("status") + 1;
  const answersCol = PARTICIPANTS_HEADERS.indexOf("answers_json") + 1;
  for (let i = 0; i < pRows.length; i++) {
    if (pRows[i].room_id !== roomId) continue;
    partsSheet.getRange(i + 2, statusCol).setValue("left");
    partsSheet.getRange(i + 2, answersCol).setValue("");
  }

  return { ok: true, deleted_room: true };
}

function roomsCleanupExpired_() {
  const roomsSheet = roomsGetSheet_(ROOMS_SHEET_NAME, ROOMS_HEADERS);
  const partsSheet = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);

  const rRows = roomsReadRows_(roomsSheet);
  const now = new Date();
  const expiredIds = {};
  let count = 0;
  for (let i = 0; i < rRows.length; i++) {
    const r = rRows[i];
    if (!r.room_id) continue;
    const expires = r.expires_at ? new Date(r.expires_at) : null;
    if (r.status === "deleted" || (expires && now > expires)) {
      if (!expiredIds[r.room_id]) {
        expiredIds[r.room_id] = true;
        count++;
      }
    }
  }

  for (let i = rRows.length - 1; i >= 0; i--) {
    if (expiredIds[rRows[i].room_id]) {
      roomsSheet.deleteRow(i + 2);
    }
  }

  const pRows = roomsReadRows_(partsSheet);
  for (let i = pRows.length - 1; i >= 0; i--) {
    if (expiredIds[pRows[i].room_id]) {
      partsSheet.deleteRow(i + 2);
    }
  }

  return { ok: true, cleaned: count };
}

/* ------------------------------------------------------------------ */
/*  Helpers (all prefixed `rooms` to avoid colliding with your script) */
/* ------------------------------------------------------------------ */

function roomsGetProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

function roomsJsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function roomsParsePayload_(e) {
  let raw = "";
  if (e && e.parameter && e.parameter.payload) raw = e.parameter.payload;
  else if (e && e.postData && e.postData.contents) raw = e.postData.contents;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function roomsClean_(v) {
  return v == null ? "" : String(v).trim();
}

function roomsClampInt_(v, min, max, fallback) {
  const n = Number(v);
  if (!isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function roomsGetSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function roomsReadRows_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(2, 1, last - 1, lastCol).getValues();
  const out = [];
  for (let r = 0; r < data.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[String(headers[c]).trim()] = data[r][c];
    }
    out.push(obj);
  }
  return out;
}

function roomsReadRowAt_(sheet, zeroBasedIndex) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sheet.getRange(zeroBasedIndex + 2, 1, 1, lastCol).getValues()[0];
  const obj = {};
  for (let c = 0; c < headers.length; c++) obj[String(headers[c]).trim()] = data[c];
  return obj;
}

function roomsGetRoom_(roomId) {
  const sh = roomsGetSheet_(ROOMS_SHEET_NAME, ROOMS_HEADERS);
  const rows = roomsReadRows_(sh);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].room_id === roomId) return rows[i];
  }
  return null;
}

function roomsFindParticipantByToken_(sheet, roomId, tokenHash) {
  const rows = roomsReadRows_(sheet);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (
      r.room_id === roomId
      && r.participant_token_hash === tokenHash
      && r.status === "active"
    ) {
      return i;
    }
  }
  return -1;
}

function roomsFindParticipantByNumber_(sheet, roomId, number) {
  const rows = roomsReadRows_(sheet);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (
      r.room_id === roomId
      && Number(r.participant_number) === Number(number)
      && r.status === "active"
    ) {
      return i;
    }
  }
  return -1;
}

function roomsVerifyOwner_(roomId, ownerTokenHash) {
  const sh = roomsGetSheet_(PARTICIPANTS_SHEET_NAME, PARTICIPANTS_HEADERS);
  const rows = roomsReadRows_(sh);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (
      r.room_id === roomId
      && Number(r.participant_number) === 1
      && r.participant_token_hash === ownerTokenHash
      && r.status === "active"
    ) {
      return true;
    }
  }
  return false;
}

function roomsUpdateStatus_(sheet, zeroBasedIndex, newStatus, opts) {
  const statusCol = PARTICIPANTS_HEADERS.indexOf("status") + 1;
  sheet.getRange(zeroBasedIndex + 2, statusCol).setValue(newStatus);
  if (opts && opts.clearAnswers) {
    const answersCol = PARTICIPANTS_HEADERS.indexOf("answers_json") + 1;
    sheet.getRange(zeroBasedIndex + 2, answersCol).setValue("");
  }
}

function roomsGenerateUniqueId_(roomsSheet) {
  const rows = roomsReadRows_(roomsSheet);
  const taken = {};
  for (let i = 0; i < rows.length; i++) taken[String(rows[i].room_id)] = true;
  for (let attempt = 0; attempt < 50; attempt++) {
    let id = "";
    for (let i = 0; i < ROOM_ID_LENGTH; i++) {
      const idx = Math.floor(Math.random() * ROOM_ID_ALPHABET.length);
      id += ROOM_ID_ALPHABET.charAt(idx);
    }
    if (!taken[id]) return id;
  }
  throw new Error("Could not generate unique room id");
}
