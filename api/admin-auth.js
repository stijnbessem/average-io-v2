/**
 * Admin panel authentication.
 *
 * The client posts a candidate password; the server compares it (constant-time)
 * against process.env.ADMIN_PASSWORD and returns 200/401. The admin panel
 * unlocks UI affordances on the client (markdown export, debug log, webhook
 * test). It does not currently gate any privileged data — moving the
 * comparison off the client just removes the need to ship the password to
 * every visitor.
 */
import { createHash, timingSafeEqual } from "node:crypto";

function digest(input) {
  return createHash("sha256").update(String(input ?? ""), "utf8").digest();
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return await new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (_) { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(503).json({ error: "Admin password not configured." });
  }

  const body = await readJsonBody(req);
  const submitted = typeof body?.password === "string" ? body.password : "";

  const ok = timingSafeEqual(digest(submitted), digest(expected));
  if (!ok) {
    // Small fixed delay reduces utility of online guessing without serving as
    // real rate-limiting — Vercel function cold-starts already throttle this.
    await new Promise((r) => setTimeout(r, 250));
    return res.status(401).json({ error: "Invalid password." });
  }

  return res.status(200).json({ ok: true });
}
