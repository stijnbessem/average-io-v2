/**
 * Daily peer snapshot generator.
 *
 * Paginates every finished session out of Supabase, strips each row's
 * `answers` JSONB to a slim {qid: value} record (the same shape the client
 * already consumes after `buildGvizTable` unwrap), and writes the assembled
 * payload to Vercel Blob as `peers-snapshot.json` for fast cached loads.
 *
 * Authorization: requires `Authorization: Bearer ${CRON_SECRET}` — Vercel
 * Cron sends this automatically; manual triggers must include it too.
 *
 * Hobby-plan note: each page (~500 rows × ~50KB) takes ~6s server-side.
 * `maxDuration` in vercel.json is set to 60s, which covers the current
 * dataset comfortably (~5k rows). If volume grows past that, this endpoint
 * will start hitting the timeout and the cron will partially fail — at
 * which point either upgrade the plan, raise maxDuration, or move
 * generation to a Supabase function.
 */
import { put } from "@vercel/blob";
import { getSupabase } from "./_lib/supabase.js";

const SNAPSHOT_PATH = "peers-snapshot.json";
const PAGE_SIZE = 500;

function slimAnswers(answers) {
  if (!answers || typeof answers !== "object") return null;
  const out = {};
  for (const [qid, entry] of Object.entries(answers)) {
    if (entry == null) continue;
    const value = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
    if (value == null || value === "") continue;
    out[qid] = value;
  }
  return Object.keys(out).length ? out : null;
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(503).json({ error: "CRON_SECRET is not configured." });
  }
  const auth = req.headers?.authorization || req.headers?.Authorization || "";
  if (auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: "BLOB_READ_WRITE_TOKEN is not configured." });
  }

  try {
    const supabase = getSupabase();
    const records = [];
    let offset = 0;
    let totalCount = 0;
    let pages = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from("sessions")
        .select("id, answers", { count: "exact" })
        .eq("finished", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);

      if (pages === 0 && Number.isFinite(Number(count))) {
        totalCount = Number(count);
      }
      pages += 1;

      const rows = data || [];
      for (const row of rows) {
        const slim = slimAnswers(row?.answers);
        if (slim) records.push(slim);
      }

      if (rows.length < PAGE_SIZE) break;
      offset += rows.length;
      if (totalCount > 0 && offset >= totalCount) break;
    }

    const generatedAt = new Date().toISOString();
    const payload = { generatedAt, count: records.length, peers: records };

    const { url } = await put(SNAPSHOT_PATH, JSON.stringify(payload), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 3600,
    });

    return res.status(200).json({
      ok: true,
      count: records.length,
      pages,
      sourceTotal: totalCount,
      generatedAt,
      url,
    });
  } catch (error) {
    const message = error && typeof error.message === "string" ? error.message : "Snapshot generation failed.";
    return res.status(500).json({ error: message });
  }
}
