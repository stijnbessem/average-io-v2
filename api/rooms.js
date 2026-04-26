/**
 * Single Vercel function for all room HTTP APIs (Hobby plan: max 12 functions).
 * GET  ?op=status|results  — public / gated reads
 * POST { op: create|join|submit|leave|manage } — mutations
 */
import {
  ROOM_DEFAULTS,
  callAppsScript,
  findActiveParticipantByTokenHash,
  generateToken,
  getIp,
  hashToken,
  isRoomActive,
  isValidRoomId,
  methodNotAllowed,
  parseBody,
  rateLimit,
  readRoomFromSheet,
  safeTitle,
  summarizeParticipants,
} from "./_lib/rooms.js";

export default async function handler(req, res) {
  const ip = getIp(req);

  if (req.method === "GET") {
    const op = typeof req.query?.op === "string" ? req.query.op.trim().toLowerCase() : "";
    if (op === "status") return handleStatus(req, res, ip);
    if (op === "results") return handleResults(req, res, ip);
    return res.status(400).json({ error: "Invalid or missing op (use status or results)" });
  }

  if (req.method === "POST") {
    const body = parseBody(req);
    const op = typeof body?.op === "string" ? body.op.trim().toLowerCase() : "";
    switch (op) {
      case "create":
        return handleCreate(req, res, ip, body);
      case "join":
        return handleJoin(req, res, ip, body);
      case "submit":
        return handleSubmit(req, res, ip, body);
      case "leave":
        return handleLeave(req, res, ip, body);
      case "manage":
        return handleManage(req, res, ip, body);
      default:
        return res.status(400).json({ error: "Invalid or missing op in body" });
    }
  }

  return methodNotAllowed(res, "GET, POST");
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

async function handleCreate(_req, res, ip, body) {
  if (rateLimit({ ip, bucket: "rooms-create", windowMs: 60_000, max: 10 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const title = safeTitle(body?.title);
  const questionnaireVersion =
    typeof body?.questionnaire_version === "string"
      ? body.questionnaire_version.trim().slice(0, 32)
      : "";
  const maxParticipants = clampInt(
    body?.max_participants,
    ROOM_DEFAULTS.MIN_PARTICIPANTS,
    ROOM_DEFAULTS.MAX_PARTICIPANTS,
    ROOM_DEFAULTS.MAX_PARTICIPANTS
  );
  const ttlDays = clampInt(body?.ttl_days, 1, 90, ROOM_DEFAULTS.TTL_DAYS);

  let ownerToken;
  try {
    ownerToken = generateToken();
  } catch (err) {
    return res.status(500).json({ error: "Could not generate token" });
  }

  let ownerTokenHash;
  try {
    ownerTokenHash = hashToken(ownerToken);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const result = await callAppsScript("create_room", {
      owner_token_hash: ownerTokenHash,
      title,
      questionnaire_version: questionnaireVersion,
      max_participants: maxParticipants,
      ttl_days: ttlDays,
    });

    return res.status(200).json({
      ok: true,
      room_id: result.room_id,
      owner_token: ownerToken,
      owner_number: result.owner_number,
      expires_at: result.expires_at,
      max_participants: result.max_participants,
      title: result.title,
      questionnaire_version: result.questionnaire_version,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || "Failed to create room" });
  }
}

async function handleJoin(_req, res, ip, body) {
  if (rateLimit({ ip, bucket: "rooms-join", windowMs: 60_000, max: 30 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const roomId = typeof body?.room_id === "string" ? body.room_id.trim().toUpperCase() : "";
  if (!isValidRoomId(roomId)) {
    return res.status(400).json({ error: "Invalid room id" });
  }

  let participantToken;
  try {
    participantToken = generateToken();
  } catch (err) {
    return res.status(500).json({ error: "Could not generate token" });
  }

  let tokenHash;
  try {
    tokenHash = hashToken(participantToken);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const result = await callAppsScript("join_room", {
      room_id: roomId,
      participant_token_hash: tokenHash,
    });

    return res.status(200).json({
      ok: true,
      room_id: result.room_id,
      participant_token: participantToken,
      participant_number: result.participant_number,
      already_member: Boolean(result.already_member),
    });
  } catch (err) {
    const message = err.message || "Failed to join room";
    const status = /not found|expired|full/i.test(message) ? 404 : 502;
    return res.status(status).json({ error: message });
  }
}

async function handleSubmit(_req, res, ip, body) {
  if (rateLimit({ ip, bucket: "rooms-submit", windowMs: 60_000, max: 20 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const roomId = typeof body?.room_id === "string" ? body.room_id.trim().toUpperCase() : "";
  const participantToken = typeof body?.participant_token === "string" ? body.participant_token : "";
  const answers = body?.answers;

  if (!isValidRoomId(roomId)) return res.status(400).json({ error: "Invalid room id" });
  if (!participantToken) return res.status(400).json({ error: "Missing participant token" });

  let answersJson;
  try {
    answersJson = typeof answers === "string" ? answers : JSON.stringify(answers ?? {});
  } catch (_) {
    return res.status(400).json({ error: "Answers must be JSON-serializable" });
  }
  if (answersJson.length > ROOM_DEFAULTS.MAX_ANSWERS_BYTES) {
    return res.status(413).json({ error: "Answers too large" });
  }

  let tokenHash;
  try {
    tokenHash = hashToken(participantToken);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    await callAppsScript("submit_answers", {
      room_id: roomId,
      participant_token_hash: tokenHash,
      answers_json: answersJson,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err.message || "Failed to submit answers";
    const status = /not a participant|not found|expired/i.test(message) ? 404 : 502;
    return res.status(status).json({ error: message });
  }
}

async function handleLeave(_req, res, ip, body) {
  if (rateLimit({ ip, bucket: "rooms-leave", windowMs: 60_000, max: 30 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const roomId = typeof body?.room_id === "string" ? body.room_id.trim().toUpperCase() : "";
  const participantToken = typeof body?.participant_token === "string" ? body.participant_token : "";

  if (!isValidRoomId(roomId)) return res.status(400).json({ error: "Invalid room id" });
  if (!participantToken) return res.status(400).json({ error: "Missing participant token" });

  let tokenHash;
  try {
    tokenHash = hashToken(participantToken);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const result = await callAppsScript("leave_room", {
      room_id: roomId,
      participant_token_hash: tokenHash,
    });
    return res.status(200).json({
      ok: true,
      deleted_room: Boolean(result.deleted_room),
    });
  } catch (err) {
    const message = err.message || "Failed to leave room";
    const status = /not a participant|not found/i.test(message) ? 404 : 502;
    return res.status(status).json({ error: message });
  }
}

async function handleManage(_req, res, ip, body) {
  if (rateLimit({ ip, bucket: "rooms-manage", windowMs: 60_000, max: 30 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const roomId = typeof body?.room_id === "string" ? body.room_id.trim().toUpperCase() : "";
  const ownerToken = typeof body?.owner_token === "string" ? body.owner_token : "";
  const action = typeof body?.action === "string" ? body.action : "";

  if (!isValidRoomId(roomId)) return res.status(400).json({ error: "Invalid room id" });
  if (!ownerToken) return res.status(400).json({ error: "Missing owner token" });
  if (action !== "kick" && action !== "delete") {
    return res.status(400).json({ error: "Unsupported action" });
  }

  let ownerTokenHash;
  try {
    ownerTokenHash = hashToken(ownerToken);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    if (action === "delete") {
      await callAppsScript("delete_room", {
        room_id: roomId,
        owner_token_hash: ownerTokenHash,
      });
      return res.status(200).json({ ok: true, deleted_room: true });
    }

    const targetNumber = Number(body?.target_number);
    if (
      !Number.isFinite(targetNumber)
      || targetNumber < 2
      || targetNumber > ROOM_DEFAULTS.MAX_PARTICIPANTS
    ) {
      return res.status(400).json({ error: "Invalid target_number" });
    }
    await callAppsScript("kick_participant", {
      room_id: roomId,
      owner_token_hash: ownerTokenHash,
      target_number: targetNumber,
    });
    return res.status(200).json({ ok: true, kicked_number: targetNumber });
  } catch (err) {
    const message = err.message || "Action failed";
    const status = /unauthorized/i.test(message)
      ? 403
      : /not found/i.test(message)
        ? 404
        : 502;
    return res.status(status).json({ error: message });
  }
}

async function handleStatus(req, res, ip) {
  if (rateLimit({ ip, bucket: "rooms-status", windowMs: 60_000, max: 60 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const roomId = typeof req.query?.room_id === "string"
    ? req.query.room_id.trim().toUpperCase()
    : "";
  const token = typeof req.query?.token === "string" ? req.query.token : "";

  if (!isValidRoomId(roomId)) return res.status(400).json({ error: "Invalid room id" });

  let room;
  let participants;
  try {
    ({ room, participants } = await readRoomFromSheet(roomId));
  } catch (err) {
    return res.status(502).json({ error: err.message || "Failed to read room" });
  }

  if (!room || !isRoomActive(room)) {
    return res.status(404).json({ error: "Room not found" });
  }

  let yourNumber = null;
  let canViewResults = false;

  if (token) {
    let tokenHash;
    try {
      tokenHash = hashToken(token);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
    const me = findActiveParticipantByTokenHash(participants, tokenHash);
    if (me) {
      yourNumber = me.participant_number;
      canViewResults = Boolean(me.submitted_at);
    }
  }

  const summary = summarizeParticipants(participants);
  const activeCount = summary.filter((p) => p.status === "active").length;
  const submittedCount = summary.filter(
    (p) => p.status === "active" && p.has_submitted
  ).length;

  return res.status(200).json({
    ok: true,
    room: {
      room_id: roomId,
      title: String(room.title || ""),
      max_participants: Number(room.max_participants) || 25,
      questionnaire_version: String(room.questionnaire_version || ""),
      expires_at: String(room.expires_at || ""),
      created_at: String(room.created_at || ""),
    },
    participants: summary,
    spots_left: Math.max(0, (Number(room.max_participants) || 25) - activeCount),
    active_count: activeCount,
    submitted_count: submittedCount,
    your_number: yourNumber,
    can_view_results: canViewResults,
  });
}

async function handleResults(req, res, ip) {
  if (rateLimit({ ip, bucket: "rooms-results", windowMs: 60_000, max: 60 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const roomId = typeof req.query?.room_id === "string"
    ? req.query.room_id.trim().toUpperCase()
    : "";
  const token = typeof req.query?.token === "string" ? req.query.token : "";

  if (!isValidRoomId(roomId)) return res.status(400).json({ error: "Invalid room id" });
  if (!token) return res.status(401).json({ error: "Token required" });

  let room;
  let participants;
  try {
    ({ room, participants } = await readRoomFromSheet(roomId));
  } catch (err) {
    return res.status(502).json({ error: err.message || "Failed to read room" });
  }

  if (!room || !isRoomActive(room)) {
    return res.status(404).json({ error: "Room not found" });
  }

  let tokenHash;
  try {
    tokenHash = hashToken(token);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const me = findActiveParticipantByTokenHash(participants, tokenHash);
  if (!me) return res.status(403).json({ error: "Not a participant" });
  if (!me.submitted_at) {
    return res.status(403).json({
      error: "Submit your answers to unlock the comparison.",
      requires_submission: true,
    });
  }

  const revealed = participants
    .filter((p) => p.status === "active" && p.submitted_at)
    .map((p) => ({
      number: p.participant_number,
      submitted_at: p.submitted_at,
      is_you: p.participant_number === me.participant_number,
      answers: safeParseAnswers(p.answers_json),
    }))
    .sort((a, b) => a.number - b.number);

  return res.status(200).json({
    ok: true,
    room: {
      room_id: roomId,
      title: String(room.title || ""),
      questionnaire_version: String(room.questionnaire_version || ""),
      max_participants: Number(room.max_participants) || 25,
      expires_at: String(room.expires_at || ""),
    },
    your_number: me.participant_number,
    participants: revealed,
  });
}

function safeParseAnswers(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch (_) {
    return null;
  }
}
