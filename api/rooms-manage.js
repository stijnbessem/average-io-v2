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
  if (rateLimit({ ip, bucket: "rooms-manage", windowMs: 60_000, max: 30 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = parseBody(req);
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

    // kick
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
