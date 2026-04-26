import {
  findActiveParticipantByTokenHash,
  getIp,
  hashToken,
  isRoomActive,
  isValidRoomId,
  methodNotAllowed,
  rateLimit,
  readRoomFromSheet,
} from "./_lib/rooms.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");

  const ip = getIp(req);
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

  // Reveal answers for ALL active participants who have submitted.
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
