/**
 * Live peer pool: reads finished sessions from Supabase one batch at a time
 * and emits the wide-format gviz table that App.jsx:buildPeersFromSheet
 * expects. The client paginates by passing ?offset=N&limit=500 and stitches
 * pages together, displaying a running "X / Y loaded" indicator.
 *
 * Output shape:
 *   {
 *     table: { cols: [{label}], rows: [{c:[{v}, ...]}] },
 *     totalCount: number,   // total finished sessions in Supabase
 *     offset: number,       // echo of requested offset
 *     nextOffset: number,   // offset to request next (offset + rows.length)
 *     hasMore: boolean      // false when we've reached totalCount
 *   }
 *
 * Each row's `answers` JSONB is ~50KB. 500 rows ≈ 25MB, ~6s server-side —
 * fits inside Supabase's 8s statement timeout with margin.
 */
import { getSupabase } from "./_lib/supabase.js";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

function parseNonNegativeInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const offset = parseNonNegativeInt(req.query?.offset, 0);
  const requestedLimit = parseNonNegativeInt(req.query?.limit, DEFAULT_LIMIT);
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

  try {
    const supabase = getSupabase();
    const { data, error, count } = await supabase
      .from("sessions")
      .select("id, version, segment_filter, finished_at, answers", { count: "exact" })
      .eq("finished", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    const rows = data || [];
    const totalCount = Number.isFinite(Number(count)) ? Number(count) : rows.length;
    const nextOffset = offset + rows.length;
    const hasMore = rows.length > 0 && nextOffset < totalCount;

    const table = buildGvizTable(rows);
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
    return res.status(200).json({ table, totalCount, offset, nextOffset, hasMore });
  } catch (error) {
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Failed to fetch live peers.";
    return res.status(502).json({ error: message });
  }
}

function buildGvizTable(rows) {
  if (rows.length === 0) return { cols: [], rows: [] };

  const questionIds = new Set();
  for (const row of rows) {
    const ans = row?.answers;
    if (ans && typeof ans === "object") {
      for (const k of Object.keys(ans)) questionIds.add(k);
    }
  }

  const headers = ["session_id", ...Array.from(questionIds).map((q) => `q_${q}`)];
  const cols = headers.map((label) => ({ label }));

  const outRows = rows.map((row) => {
    const ans = row?.answers && typeof row.answers === "object" ? row.answers : {};
    const c = headers.map((h) => {
      if (h === "session_id") return { v: String(row.id || "") };
      const qid = h.slice(2);
      const entry = ans[qid];
      if (entry == null) return { v: "" };
      const value = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
      return { v: stringifyCell(value) };
    });
    return { c };
  });

  return { cols, rows: outRows };
}

function stringifyCell(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
