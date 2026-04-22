#!/usr/bin/env node
/**
 * POST N simulated V2 questionnaire sessions to the Google Apps Script webhook.
 * Answers respect question dependencies (gender → penis_length / bra_cup, etc.)
 * and use weighted random choices for plausible distributions (not uniform noise).
 *
 * Usage: node scripts/simulate-v2-sessions.mjs [count] [concurrency]
 * Example: node scripts/simulate-v2-sessions.mjs 100 4
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbywAaq9Ry5Cl9KH5EnfsIeOn8doBdQK6BQSTmpNLCfO89IabjvTNYYLQB4wTA5E3l5h/exec";
const WEBHOOK_SECRET = "stijnbessem";

const TOTAL = Math.max(1, Number(process.argv[2] || 100));
const CONCURRENCY = Math.max(1, Math.min(16, Number(process.argv[3] || 4)));

function slugCategoryId(name) {
  const s = String(name || "category")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return s || "category";
}

/** Mirrors App.jsx QUESTION_DEPENDENCIES for V2 (only questions that exist in JSON). */
const DEPENDENCIES = {
  penis_length: { dependsOn: "gender", showIf: ["Male ♂️"] },
  bra_cup: { dependsOn: "gender", showIf: ["Female ♀️"] },
  plastic_detail: {
    dependsOn: "plastic_surgery",
    showIf: [
      "Minor tweaks only",
      "Injectables / tweak era 💉",
      "Revision / fix-up round 🔁",
      "Full storyline arc 🔪",
    ],
  },
};

function flattenQuestions(raw) {
  const out = [];
  for (const block of raw.questionnaire || []) {
    const cat = slugCategoryId(block.category);
    const blockSensitive = Boolean(block.sensitive);
    for (const q of block.questions || []) {
      const labels = (q.options || []).map((o) => (typeof o === "string" ? o : o.label));
      const dep = DEPENDENCIES[q.id] || {};
      out.push({
        id: q.id,
        cat,
        label: q.question,
        options: labels,
        sensitive: blockSensitive || Boolean(q.sensitive),
        ...dep,
      });
    }
  }
  return out;
}

function isVisible(q, answers) {
  if (!q.dependsOn) return true;
  const parent = answers[q.dependsOn];
  if (parent == null || parent === "") return false;
  return Array.isArray(q.showIf) && q.showIf.includes(parent);
}

function pickWeighted(options, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

function bellWeights(n) {
  const w = [];
  for (let i = 0; i < n; i++) w.push((i + 1) * (n - i));
  return w;
}

function downweightAvoid(opts, baseWeights) {
  return baseWeights.map((wi, i) =>
    /rather not|prefer not|🤐|skip/i.test(opts[i]) ? wi * 0.28 : wi
  );
}

/**
 * Plausible distributions: age/gender/region skew; bell-ish for long Likert-style lists;
 * sensitive blocks slightly more "rather not" via downweightAvoid (still answered).
 */
function pickAnswer(q) {
  const opts = q.options;
  const n = opts.length;

  if (q.id === "age") {
    const w = [2, 20, 32, 22, 14, 8, 2];
    return pickWeighted(opts, w.slice(0, n));
  }
  if (q.id === "gender") {
    return pickWeighted(opts, [46, 46, 4, 2, 2].slice(0, n));
  }
  if (q.id === "region") {
    const w = [36, 24, 8, 12, 6, 5, 4, 3, 2];
    return pickWeighted(opts, w.slice(0, n));
  }
  if (q.id === "relationship") {
    const w = [22, 18, 26, 14, 4, 5, 2, 4, 4, 3, 2];
    return pickWeighted(opts, w.slice(0, n));
  }
  if (q.id === "plastic_surgery") {
    const w = [48, 18, 12, 8, 6, 3, 2, 3];
    return pickWeighted(opts, w.slice(0, n));
  }
  if (q.id === "education_level") {
    const w = [2, 6, 14, 8, 6, 28, 18, 6, 8, 4];
    return pickWeighted(opts, w.slice(0, n));
  }

  let w = bellWeights(n);
  if (q.sensitive) w = downweightAvoid(opts, w);
  return pickWeighted(opts, w);
}

function buildAnswers(flatQuestions) {
  const answers = {};
  for (const q of flatQuestions) {
    if (!isVisible(q, answers)) continue;
    answers[q.id] = pickAnswer(q);
  }
  return answers;
}

function buildSnapshot(i, flatQuestions) {
  const rawAnswers = buildAnswers(flatQuestions);
  const id = `${Date.now()}-sim-v2-${i}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const answers = {};
  for (const [qid, value] of Object.entries(rawAnswers)) {
    const meta = flatQuestions.find((q) => q.id === qid);
    if (!meta) continue;
    answers[qid] = {
      value,
      category: meta.cat,
      label: meta.label,
      type: "single",
    };
  }

  const answeredQids = Object.keys(answers);
  return {
    id,
    created_at: now,
    finished: true,
    finished_at: now,
    version: 1,
    segment_filter: "all",
    total_answered: answeredQids.length,
    total_questions: flatQuestions.length,
    categories_completed: new Set(
      answeredQids.map((qid) => flatQuestions.find((q) => q.id === qid)?.cat).filter(Boolean)
    ).size,
    answers,
    category_uniqueness: {},
  };
}

async function sendSnapshot(snapshot) {
  const payload = {
    secret: WEBHOOK_SECRET,
    snapshot,
    meta: {
      user_agent: "simulate-v2-sessions.mjs",
      language: "en-GB",
      timezone: "Europe/Amsterdam",
    },
  };

  const body = new URLSearchParams({
    payload: JSON.stringify(payload),
  }).toString();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body,
      });
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, attempt * 300));
  }
  return false;
}

async function main() {
  const raw = JSON.parse(
    readFileSync(join(__dirname, "../data/average_io_full_questions.json"), "utf8")
  );
  const flatQuestions = flattenQuestions(raw);

  let success = 0;
  let fail = 0;
  const queue = Array.from({ length: TOTAL }, (_, i) => i + 1);

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      const snapshot = buildSnapshot(i, flatQuestions);
      const ok = await sendSnapshot(snapshot);
      if (ok) success++;
      else fail++;
      const done = success + fail;
      if (done % 25 === 0 || done === TOTAL) {
        console.log(`Progress: ${done}/${TOTAL} (ok=${success}, fail=${fail}) · last id ${snapshot.id.slice(-12)}`);
      }
    }
  }

  console.log(
    `Simulating ${TOTAL} V2 sessions (${flatQuestions.length} questions max, dependencies respected), concurrency=${CONCURRENCY}`
  );
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`Done. ok=${success}, fail=${fail}, total=${TOTAL}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
