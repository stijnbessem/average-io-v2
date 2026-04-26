import {
  callAppsScript,
  generateToken,
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
  if (rateLimit({ ip, bucket: "rooms-join", windowMs: 60_000, max: 30 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = parseBody(req);
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
