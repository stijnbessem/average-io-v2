import {
  ROOM_DEFAULTS,
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
  if (rateLimit({ ip, bucket: "rooms-submit", windowMs: 60_000, max: 20 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = parseBody(req);
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
