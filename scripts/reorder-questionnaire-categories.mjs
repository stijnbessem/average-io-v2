#!/usr/bin/env node
/**
 * Reorders questionnaire blocks for funnel: hook → engaging → structured → sensitive → optional heavy.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = join(__dirname, "../data/average_io_full_questions.json");

/** Target order (category titles must match JSON exactly). */
const ORDER = [
  "Basic Info",
  "Lifestyle",
  "Hobbies",
  "Personality",
  "Education",
  "Work",
  "Body & Stats",
  "Habits",
  "Health & Mishaps",
  "Travel & World",
  "Mind & Mood",
  "Private sparks",
  "Real Talk",
];

function main() {
  const data = JSON.parse(readFileSync(PATH, "utf8"));
  const blocks = data.questionnaire || [];
  const byCat = new Map(blocks.map((b) => [b.category, b]));
  const missing = ORDER.filter((name) => !byCat.has(name));
  const extra = blocks.map((b) => b.category).filter((name) => !ORDER.includes(name));
  if (missing.length) console.error("Missing categories:", missing);
  if (extra.length) console.error("Unknown categories not in ORDER:", extra);
  if (missing.length || extra.length || blocks.length !== ORDER.length) {
    process.exit(1);
  }
  data.questionnaire = ORDER.map((name) => byCat.get(name));
  writeFileSync(PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("Reordered", ORDER.length, "categories.");
}

main();
