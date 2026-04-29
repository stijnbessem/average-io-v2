import { hasPaidCookie, methodNotAllowed } from "./_lib/rooms.js";

export default function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ paid: hasPaidCookie(req) });
}
