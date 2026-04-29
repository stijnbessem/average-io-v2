/**
 * Public read-side for the daily peer snapshot.
 *
 * Looks up the `peers-snapshot.json` blob by pathname and 302-redirects to
 * its public URL. Keeping the redirect inside this serverless route means
 * the client uses a stable origin URL (`/api/peers-snapshot`) and we don't
 * have to leak the project's blob store hash into client env vars.
 *
 * Cached at the edge for 1h; falls through to live pagination on the client
 * if the snapshot does not yet exist.
 */
import { head } from "@vercel/blob";

const SNAPSHOT_PATH = "peers-snapshot.json";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const blob = await head(SNAPSHOT_PATH);
    if (!blob?.url) {
      return res.status(404).json({ error: "Snapshot not yet generated." });
    }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("X-Snapshot-Uploaded-At", String(blob.uploadedAt || ""));
    return res.redirect(302, blob.url);
  } catch (error) {
    const message = error && typeof error.message === "string" ? error.message : "Snapshot lookup failed.";
    // 404 from @vercel/blob's head() throws — surface a clean 404 so the
    // client knows to fall back to /api/live-peers without alarming logs.
    if (/not\s*found/i.test(message)) {
      return res.status(404).json({ error: "Snapshot not yet generated." });
    }
    return res.status(502).json({ error: message });
  }
}
