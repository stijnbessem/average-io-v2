import { google } from "googleapis";

const DEFAULT_RANGE = "A:ZZ";
const SESSION_TAB_REGEX = /^sessions_\d{3}$/i;

function normalizePrivateKey(value) {
  if (!value) return "";
  return value.replace(/\\n/g, "\n");
}

function toGvizTable(values) {
  if (!Array.isArray(values) || values.length < 2) {
    return { cols: [], rows: [] };
  }

  const headers = values[0].map((h) => String(h || "").trim());
  const cols = headers.map((label) => ({ label }));
  const rows = values.slice(1).map((row) => {
    const c = headers.map((_, idx) => {
      const v = row[idx];
      return { v: v == null ? "" : String(v) };
    });
    return { c };
  });
  return { cols, rows };
}

function normalizeRows(values) {
  if (!Array.isArray(values) || values.length < 2) return { headers: [], rows: [] };
  const headers = (values[0] || []).map((h) => String(h || "").trim());
  const rows = values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] == null ? "" : String(row[idx]);
    });
    return obj;
  });
  return { headers, rows };
}

function mergeNormalizedTables(tables) {
  const headerSet = new Set();
  tables.forEach((t) => t.headers.forEach((h) => { if (h) headerSet.add(h); }));
  const headers = Array.from(headerSet);
  if (headers.length === 0) return { cols: [], rows: [] };

  const values = [headers];
  tables.forEach((t) => {
    t.rows.forEach((rowObj) => {
      values.push(headers.map((h) => rowObj[h] ?? ""));
    });
  });
  return toGvizTable(values);
}

function quoteSheetTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'!A:ZZ`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY);
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE || DEFAULT_RANGE;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return res.status(500).json({
      error:
        "Google Sheets read is not configured. Missing GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, or GOOGLE_SHEETS_SPREADSHEET_ID.",
    });
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    let table = null;
    /* Backward compatible: if a specific tab range is configured, keep using it.
       Otherwise auto-aggregate rotating sessions_### tabs so live peer counts
       reflect all session shards, not just sessions_001. */
    if (range && range.includes("!")) {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        majorDimension: "ROWS",
      });
      table = toGvizTable(result.data.values || []);
    } else {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
        fields: "sheets(properties(title))",
      });
      const titles = (meta.data.sheets || [])
        .map((s) => s?.properties?.title)
        .filter((t) => typeof t === "string");
      const sessionTabs = titles
        .filter((t) => SESSION_TAB_REGEX.test(t))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (sessionTabs.length === 0) {
        const result = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
          majorDimension: "ROWS",
        });
        table = toGvizTable(result.data.values || []);
      } else {
        const batch = await sheets.spreadsheets.values.batchGet({
          spreadsheetId,
          ranges: sessionTabs.map(quoteSheetTitle),
          majorDimension: "ROWS",
        });
        const tables = (batch.data.valueRanges || [])
          .map((vr) => normalizeRows(vr.values || []))
          .filter((t) => t.headers.length > 0 && t.rows.length > 0);
        table = mergeNormalizedTables(tables);
      }
    }

    return res.status(200).json({ table });
  } catch (error) {
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Failed to fetch live peers from Google Sheets.";
    return res.status(502).json({ error: message });
  }
}
