import {
  ROOM_DEFAULTS,
  callAppsScript,
  generateToken,
  getIp,
  hashToken,
  methodNotAllowed,
  parseBody,
  rateLimit,
  safeTitle,
} from "./_lib/rooms.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");

  const ip = getIp(req);
  if (rateLimit({ ip, bucket: "rooms-create", windowMs: 60_000, max: 10 })) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = parseBody(req);
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

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
