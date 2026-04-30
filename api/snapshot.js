/**
 * Daily peer snapshot generator.
 *
 * Paginates every finished session out of Supabase, strips each row's
 * `answers` JSONB to a slim {qid: value} record, then pivots into a
 * column-oriented payload before writing to Vercel Blob as
 * `peers-snapshot.json` for fast cached loads.
 *
 * Wire format (version 2, column-oriented):
 *   {
 *     version: 2,
 *     generatedAt: ISO string,
 *     count: number,                 // number of peers
 *     columns: { [qid]: any[] }      // each array has length = count;
 *                                    // null cells = peer didn't answer that q
 *   }
 *
 * Why column-oriented: per-peer objects repeat every question id (avg 15
 * chars × 200 keys × 6k peers ≈ 22 MB of pure key strings, which was ~46%
 * of the v1 payload). Columnar stores each key once and Brotli compresses
 * uniform-shape arrays much better. Expected wire-size reduction: ~70%.
 *
 * Authorization: requires `Authorization: Bearer ${CRON_SECRET}` — Vercel
 * Cron sends this automatically; manual triggers must include it too.
 *
 * Pro-plan note: each page (~500 rows × ~50KB) takes ~6s server-side.
 * `maxDuration` in vercel.json is set to 60s, which covers the current
 * dataset comfortably (~6k rows). If volume grows past that, raise
 * maxDuration to 300 (Pro caps) or move generation to a Supabase function.
 */
import { put } from "@vercel/blob";
import { getSupabase } from "./_lib/supabase.js";

const SNAPSHOT_PATH = "peers-snapshot.json";
const SNAPSHOT_VERSION = 2;
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

/**
 * Pivot an array of slim per-peer objects into column-oriented arrays.
 * Each output column has exactly `records.length` entries; cells for peers
 * who didn't answer that question are `null`. Stable iteration order so the
 * output is deterministic across runs (helps with diffing/debugging blobs).
 */
function pivotToColumns(records) {
  const allQids = new Set();
  for (const rec of records) {
    if (rec && typeof rec === "object") {
      for (const k of Object.keys(rec)) allQids.add(k);
    }
  }
  const orderedQids = Array.from(allQids).sort();
  const columns = {};
  for (const qid of orderedQids) {
    columns[qid] = new Array(records.length).fill(null);
  }
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (!rec || typeof rec !== "object") continue;
    for (const [qid, v] of Object.entries(rec)) {
      if (v == null || v === "") continue;
      columns[qid][i] = v;
    }
  }
  return columns;
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
    const columns = pivotToColumns(records);
    const payload = {
      version: SNAPSHOT_VERSION,
      generatedAt,
      count: records.length,
      columns,
    };

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
    // Surface full error to runtime logs so failed cron runs are debuggable
    // from the dashboard without having to capture the response body.
    console.error("[snapshot] generation failed:", error);
    const message = error && typeof error.message === "string" ? error.message : "Snapshot generation failed.";
    return res.status(500).json({ error: message });
  }
}
