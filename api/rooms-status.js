import {
  findActiveParticipantByTokenHash,
  getIp,
  hashToken,
  isRoomActive,
  isValidRoomId,
  methodNotAllowed,
  rateLimit,
  readRoomFromSheet,
  summarizeParticipants,
} from "./_lib/rooms.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");

  const ip = getIp(req);
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
