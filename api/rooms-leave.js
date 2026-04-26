import {
  callAppsScript,
  getIp,
  hashToken,
  isValidRoomId,
  methodNotAllowed,
  parseBody,
  rateLimit,
} from "./_lib/rooms.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");

  const ip = getIp(req);
  if (rateLimit({ ip, bucket: "rooms-leave", windowMs: 60_000, max: 30 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = parseBody(req);
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
