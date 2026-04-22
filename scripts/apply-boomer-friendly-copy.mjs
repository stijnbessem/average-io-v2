#!/usr/bin/env node
/**
 * Applies clearer question stems (boomer-friendly / plain English) and simplifies option labels:
 * removes emoji clutter, trims whitespace, fixes a few typos.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../data/average_io_full_questions.json");
const STEMS = JSON.parse(readFileSync(join(__dirname, "./boomer-question-stems.json"), "utf8"));

/** Remove most emoji symbols from answer labels for readability. */
function stripEmojis(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/\p{Extended_Pictographic}/gu, "")
    /* Flag emoji (two regional indicators) — not always matched by Extended_Pictographic */
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\u200D/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

/** Light-touch wording fixes after emoji strip. Idempotent-safe for re-runs. */
function polishLabel(str) {
  let s = stripEmojis(str);
  /* IOP: expand only when not already parenthetical "(IOP)" */
  s = s.replace(/(?<!\()IOP\b/g, "intensive outpatient (IOP)");
  const fixes = [
    [/^Never stuck$/i, "Never really tried it"],
    [/Administrative \/ dumb fines only/i, "Administrative or minor fines only"],
    [/Pot-era charges/i, "Marijuana-related charges (past)"],
    [/\bdx\b/gi, "diagnosis"],
    [/\bPRN\b/g, "as needed"],
    [/\bDBT\b(?! skills group)/g, "DBT skills group"],
    [/\bSSRI \/ SNRI lane\b/i, "SSRI or SNRI antidepressants"],
    [/\bGAD\b/g, "general anxiety"],
    [/\bND\b/g, "neurodivergent"],
  ];
  for (const [re, rep] of fixes) {
    s = s.replace(re, rep);
  }
  return s.trim();
}

function main() {
  const data = JSON.parse(readFileSync(DATA, "utf8"));
  let stemCount = 0;
  let labelCount = 0;

  for (const block of data.questionnaire || []) {
    for (const q of block.questions || []) {
      const stem = STEMS[q.id];
      if (stem) {
        q.question = stem;
        stemCount++;
      }
      for (const o of q.options || []) {
        if (typeof o.label === "string") {
          const next = polishLabel(o.label);
          if (next !== o.label) labelCount++;
          o.label = next;
        }
      }
    }
  }

  const ids = Object.keys(STEMS);
  if (ids.length !== 138) console.warn("Expected 138 stems, got", ids.length);

  writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Updated ${DATA}`);
  console.log(`Question stems applied: ${stemCount}, option labels touched: ${labelCount}`);
}

main();
