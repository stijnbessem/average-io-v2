/**
 * Live peer pool: reads finished sessions from Supabase and emits the
 * wide-format gviz table that App.jsx:buildPeersFromSheet expects.
 *
 * Output shape: { table: { cols: [{label}], rows: [{c:[{v}, ...]}] } }
 * Columns emitted: session_id, q_<qid> for every question id seen across
 * all rows. Values are unwrapped from the rich {value, unit, ...} object.
 */
import { getSupabase } from "./_lib/supabase.js";

// Each row's `answers` JSONB is ~50KB (full enriched object with stats per Q).
// 500 × 50KB = ~25MB per fetch, ~6s server-side, fits inside Supabase's 8s
// statement timeout with margin. Long-term: add a Postgres view that
// pre-strips the JSONB to {qid: value} before returning.
const PEER_LIMIT = 500;
const PAGE_SIZE = 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabase();
    // Fetch pages in parallel to stay under Supabase's per-statement timeout.
    const ranges = [];
    for (let offset = 0; offset < PEER_LIMIT; offset += PAGE_SIZE) {
      ranges.push([offset, Math.min(offset + PAGE_SIZE, PEER_LIMIT) - 1]);
    }
    const results = await Promise.all(
      ranges.map(([from, to]) =>
        supabase
          .from("sessions")
          .select("id, version, segment_filter, finished_at, answers")
          .eq("finished", true)
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
    );
    const all = [];
    for (const { data, error } of results) {
      if (error) throw new Error(error.message);
      if (data && data.length > 0) all.push(...data);
    }

    const table = buildGvizTable(all);
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
    return res.status(200).json({ table });
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
