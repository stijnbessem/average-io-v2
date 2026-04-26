import React, { useState, useEffect, useLayoutEffect, useReducer, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import questionnaireRaw from "./data/average_io_full_questions.json";

/* ============================================================================
   Comparizzon — immersive comparison questionnaire
   Single-file React artifact. Persistent state via window.storage.
   ============================================================================ */

/* Bump APP_VERSION whenever anything user-visible changes — semver-ish,
   nothing formal. Shown in the footer so you can verify you're on the
   latest build. APP_BUILD is the approximate ship date. */
const APP_VERSION = "0.16.0";
const APP_BUILD = "2026-04-23";

/* ---------- Design tokens (minimalist-ui: warm monochrome + spot pastels) --- */
const FONT_HREFS = [
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&display=swap",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap",
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&display=swap",
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap",
];

const STYLE = `
  :root {
    color-scheme: light;
    --bg: #FBFBFA;
    --bg-raised: #FFFFFF;
    --ink: #111111;
    --ink-2: #2F3437;
    --ink-3: #787774;
    --ink-4: #8F8B84;
    --line: #EAEAEA;
    --line-soft: rgba(0,0,0,0.06);
    --faq-line: rgba(17, 17, 17, 0.24);
    --comparison-preview-border: rgba(17, 17, 17, 0.24);
    --share-btn-border: rgba(17, 17, 17, 0.24);

    --accent-solid: #111111;
    --btn-solid-bg: #111111;
    --btn-solid-fg: #FFFFFF;
    --surface-muted: #F2F1EE;
    --surface-live: #F2FBF4;
    --surface-live-border: #CFE8D3;
    --surface-fallback: #F7F6F3;
    --surface-fallback-border: #E2E0D9;
    --topbar-bg: rgba(251,251,250,0.82);
    --mobile-menu-bg: #FBFBFA;
    --icon-stroke: #111111;
    --selection-bg: #111111;
    --selection-fg: #FFFFFF;
    --meta-theme: #FBFBFA;
    --tag-neutral-bg: #F2F1EE;
    --tag-neutral-fg: #5a5a55;

    --pale-red-bg: #FDEBEC;   --pale-red-ink: #9F2F2D;
    --pale-blue-bg: #E1F3FE;  --pale-blue-ink: #1F6C9F;
    --pale-green-bg: #EDF3EC; --pale-green-ink: #346538;
    --pale-yellow-bg: #FBF3DB;--pale-yellow-ink: #956400;
    --pale-violet-bg: #EFEAFB;--pale-violet-ink: #5A3E9F;

    --metal-mesh-a: rgba(122,124,128,0.42);
    --metal-mesh-b: rgba(108,110,115,0.36);
    --metal-mesh-c: rgba(196,197,201,0.24);
    --metal-orb-core: rgba(214,216,220,0.58);
    --metal-orb-mid: rgba(174,177,184,0.28);
    --metal-sheen-core: rgba(236,237,240,0.54);
    --metal-pointer-core: rgba(238,239,244,0.68);
    --metal-pointer-mid: rgba(198,201,209,0.22);

    --radius-s: 6px;
    --radius-m: 10px;
    --radius-l: 14px;

    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
    --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

    --modal-scrim: rgba(17, 17, 17, 0.22);

    --serif: 'Fraunces', 'Source Serif Pro', Georgia, serif;
    --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif;
    --mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
  }

  html.dark {
    color-scheme: dark;
    --bg: #121210;
    --bg-raised: #1A1A18;
    --ink: #ECEBE7;
    --ink-2: #D4D2CC;
    --ink-3: #9B9890;
    --ink-4: #7A776F;
    --line: #2E2E2C;
    --line-soft: rgba(255,255,255,0.08);
    --faq-line: rgba(255, 255, 255, 0.24);
    --comparison-preview-border: rgba(255, 255, 255, 0.24);
    --share-btn-border: rgba(255, 255, 255, 0.24);

    --accent-solid: #E8E7E3;
    --btn-solid-bg: #ECEBE7;
    --btn-solid-fg: #141413;
    --surface-muted: #252523;
    --surface-live: #162318;
    --surface-live-border: #2A4A32;
    --surface-fallback: #1E1E1C;
    --surface-fallback-border: #3A3A38;
    --topbar-bg: rgba(18,18,16,0.88);
    --mobile-menu-bg: #161614;
    --icon-stroke: #ECEBE7;
    --selection-bg: #ECEBE7;
    --selection-fg: #121210;
    --meta-theme: #121210;
    --tag-neutral-bg: #2A2A28;
    --tag-neutral-fg: #C8C6BF;

    --pale-red-bg: #2A181A;   --pale-red-ink: #E8A8A8;
    --pale-blue-bg: #14252F;  --pale-blue-ink: #8BC4EA;
    --pale-green-bg: #172520; --pale-green-ink: #9DC9A4;
    --pale-yellow-bg: #2A2618;--pale-yellow-ink: #E6C96C;
    --pale-violet-bg: #231E30;--pale-violet-ink: #C4B4EB;

    --metal-mesh-a: rgba(180,182,188,0.22);
    --metal-mesh-b: rgba(160,162,168,0.18);
    --metal-mesh-c: rgba(90,92,96,0.35);
    --metal-orb-core: rgba(120,122,128,0.35);
    --metal-orb-mid: rgba(90,92,98,0.28);
    --metal-sheen-core: rgba(70,72,76,0.42);
    --metal-pointer-core: rgba(88,90,94,0.45);
    --metal-pointer-mid: rgba(56,58,62,0.35);

    --modal-scrim: rgba(0, 0, 0, 0.58);
  }

  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  html, body { overflow-x: hidden; max-width: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink-2);
    font-family: var(--sans);
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  ::selection { background: var(--selection-bg); color: var(--selection-fg); }

  .serif { font-family: var(--serif); letter-spacing: -0.025em; line-height: 1.02; font-weight: 400; }
  .mono { font-family: var(--mono); }
  .label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3); font-weight: 500;
  }

  button { font-family: inherit; }
  input, select { font-family: inherit; }

  /* Segmented control becomes horizontally scrollable on narrow screens
     so a long set of options never pushes layout wider than the viewport. */
  @media (max-width: 639px) {
    .seg-scroll {
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .seg-scroll::-webkit-scrollbar { display: none; }
  }

  /* Snapshot grid on Overview:
     - ≥640px: auto-fit so cards sit on one row when space allows
     - ≤639px: force exactly 2 columns so the 4 tiles are always 2×2 (393px friendly) */
  .overview-snapshot-grid {
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }
  @media (max-width: 639px) {
    .overview-snapshot-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  /* FAQ accordion — native <details> with rotating + icon. */
  .faq-item > summary::-webkit-details-marker { display: none; }
  .faq-item > summary::marker { content: ""; }
  .faq-item > summary:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
    border-radius: 4px;
  }
  .faq-item[open] .faq-chevron {
    transform: rotate(45deg);
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }
  }
`;

/* ---------- Motion constants ------------------------------------------------ */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_DRAWER = [0.32, 0.72, 0, 1];
const FADE_UP = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.28, ease: EASE_OUT },
};

/* ============================================================================
   CATEGORIES & QUESTIONS
   answer_type: 'single' | 'multi' | 'number' | 'slider' | 'segmented' | 'country'
   global: rounded-language benchmark statement (per spec §7.3 rules)
   ============================================================================ */

const CATEGORY_UI_META = {
  basics: { title: "The Basics", blurb: "Background, place, relationships, and life satisfaction.", accent: "blue" },
  looks_identity: { title: "Looks & Identity", blurb: "Appearance and how you describe yourself.", accent: "green" },
  personality: { title: "Personality", blurb: "Energy, decisions, conflict, and social style.", accent: "violet" },
  lifestyle: { title: "Lifestyle", blurb: "Daily rhythm, pets, entertainment, and movement.", accent: "yellow" },
  hobbies: { title: "Hobbies", blurb: "Interests, collections, and how you spend free time.", accent: "blue" },
  dating_scene: { title: "Dating Scene", blurb: "Dating habits, intentions, and modern romance.", accent: "red" },
  education: { title: "Education", blurb: "Schooling, learning, and growth.", accent: "green" },
  work: { title: "Work", blurb: "Role, pace, workplace culture, and ambition.", accent: "violet" },
  money: { title: "Money", blurb: "Income habits, investing, stress, and side hustles.", accent: "yellow" },
  habits_vices: { title: "Habits & Vices", blurb: "Substances, impulses, and routines.", accent: "red" },
  food_biohacking: { title: "Food & Biohacking", blurb: "Nutrition, supplements, and body experiments.", accent: "green" },
  health_body: { title: "Health & Body", blurb: "Fitness, symptoms, sleep, and medical history.", accent: "blue" },
  mind_mood: { title: "Mind & Mood", blurb: "Mental health and emotional patterns.", accent: "violet" },
  intimate_history: { title: "Intimate History", blurb: "Private topics — skip anything you want.", accent: "red" },
  anatomy: { title: "Anatomy (Optional)", blurb: "Optional body questions.", accent: "red" },
  ai_digital: { title: "AI & Digital Life", blurb: "AI tools, online identity, and privacy.", accent: "violet" },
  travel_world: { title: "Travel & World", blurb: "Trips, languages, and global outlook.", accent: "yellow" },
  real_talk: { title: "Real Talk", blurb: "Harder topics — fully optional.", accent: "red" },
  demographics: { title: "Demographics", blurb: "Identity, location, and background.", accent: "blue" },
  body: { title: "Body", blurb: "Physical traits and characteristics.", accent: "green" },
  digital: { title: "Digital", blurb: "Phone and app usage patterns.", accent: "violet" },
  micro: { title: "Micro Habits", blurb: "Tiny habits and day-to-day signals.", accent: "blue" },
  sexual: { title: "Sexual", blurb: "Private and sensitive answers.", accent: "red" },
  fitness: { title: "Fitness", blurb: "Exercise and training.", accent: "green" },
  daily: { title: "Daily Behaviour", blurb: "Phone, work, coffee, food.", accent: "violet" },
  relationships: { title: "Relationships & Family", blurb: "Partners, children, siblings.", accent: "blue" },
  living: { title: "Living & Finance", blurb: "Home and household.", accent: "yellow" },
  intimate: { title: "Intimate", blurb: "Private. Fully optional.", accent: "red" },
  basic_info: { title: "Basic Info", blurb: "Age, background, household — the basics.", accent: "blue" },
  body_stats: { title: "Body & Stats", blurb: "Measurements, appearance, sleep.", accent: "green" },
  habits: { title: "Habits", blurb: "Alcohol, smoking, substances.", accent: "red" },
  health_mishaps: { title: "Health & Mishaps", blurb: "Bodies, checkups, injuries.", accent: "green" },
  private_sparks: { title: "Private sparks", blurb: "Very personal — all optional.", accent: "red" },
};

const CATEGORY_ORDER_OVERRIDES = {};

const CATEGORY_ACCENT_FALLBACK = ["blue", "green", "violet", "yellow", "red"];

const QUESTION_DEPENDENCIES = {};

function slugCategoryId(name) {
  const s = String(name || "category")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return s || "category";
}

const IS_V2_QUESTIONNAIRE = Array.isArray(questionnaireRaw?.questionnaire);

function normalizeQuestionnaireV2(raw) {
  return {
    categories: (raw.questionnaire || []).map((block) => ({
      id: slugCategoryId(block.category),
      sensitive: Boolean(block.sensitive),
      questions: (block.questions || []).map((q) => {
        const question = {
          id: q.id,
          label: q.question,
          type: q.multi ? "multi" : "select",
          options: (q.options || []).map((o) => (typeof o === "string" ? o : o.label)),
          sensitive: Boolean(q.sensitive),
          global: typeof q.global === "string" ? q.global : "",
        };
        if (q.dependsOn) question.dependsOn = q.dependsOn;
        if (Array.isArray(q.showIf)) question.showIf = q.showIf;
        if (Array.isArray(q.hideIf)) question.hideIf = q.hideIf;
        return question;
      }),
    })),
  };
}

const canonicalQuestionSet = IS_V2_QUESTIONNAIRE
  ? normalizeQuestionnaireV2(questionnaireRaw)
  : questionnaireRaw;

const LEGACY_CATEGORIES = [
  { id: "demographics", title: "Demographics", blurb: "Age, place, work.", accent: "blue", optional: false },
  { id: "body", title: "Body", blurb: "Height, weight, traits.", accent: "green", optional: false },
  { id: "lifestyle", title: "Lifestyle", blurb: "Sleep, drink, smoke, steps.", accent: "yellow", optional: false },
  { id: "fitness", title: "Fitness", blurb: "Exercise and training.", accent: "green", optional: false },
  { id: "daily", title: "Daily Behaviour", blurb: "Phone, work, coffee, food.", accent: "violet", optional: false },
  { id: "relationships", title: "Relationships & Family", blurb: "Partners, children, siblings.", accent: "blue", optional: false },
  { id: "living", title: "Living & Finance", blurb: "Home and household.", accent: "yellow", optional: false },
  { id: "intimate", title: "Intimate", blurb: "Private. Fully optional.", accent: "red", optional: true },
];

const LEGACY_QUESTIONS = [
  { id: "age", cat: "demographics", label: "How old are you?", type: "number", min: 13, max: 100, unit: "years", global: "The median age worldwide is about 30.", sensitive: false },
  { id: "birth_month", cat: "demographics", label: "Birth month?", type: "single", options: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], global: "Birth months are typically close to evenly distributed across the year.", sensitive: false },
  { id: "gender", cat: "demographics", label: "Which best describes you?", type: "single", options: ["Female", "Male", "Non-binary", "Prefer not to say"], global: "Roughly half of people identify as female, half as male; a small share identify otherwise.", sensitive: false },
  { id: "country", cat: "demographics", label: "Where do you live?", type: "country", global: "About 1 in 8 people worldwide live in India or China.", sensitive: false },
  { id: "years_in_country", cat: "demographics", label: "Years lived in your current country?", type: "number", min: 0, max: 100, unit: "years", global: "Many adults have lived in their current country for more than 10 years.", sensitive: false },
  { id: "languages_spoken", cat: "demographics", label: "Languages you can converse in?", type: "number", min: 1, max: 10, unit: "languages", global: "Most people speak 1–2 languages conversationally.", sensitive: false },
  { id: "area_type", cat: "demographics", label: "Where do you live mostly?", type: "single", options: ["Urban", "Suburban", "Rural"], global: "A majority of people worldwide now live in urban areas.", sensitive: false },
  { id: "has_pet", cat: "demographics", label: "Do you currently have a pet?", type: "single", options: ["Yes", "No"], global: "Pet ownership is common, especially in multi-person households.", sensitive: false },
  { id: "education", cat: "demographics", label: "Your highest completed education?", type: "single", options: ["No formal schooling", "Primary", "Secondary / high school", "Vocational", "Bachelor's", "Master's", "Doctorate"], global: "Roughly 40% of adults worldwide have some form of tertiary education.", sensitive: false },
  { id: "employment", cat: "demographics", label: "Current employment status?", type: "single", options: ["Full-time employed", "Part-time employed", "Self-employed", "Studying", "Looking for work", "Retired", "Other"], global: "About 6 in 10 working-age adults are employed.", sensitive: false },
  { id: "height", cat: "body", label: "How tall are you?", type: "slider", min: 140, max: 210, unit: "cm", step: 1, global: "The average adult height is around 171 cm for men and 159 cm for women.", sensitive: false },
  { id: "weight", cat: "body", label: "How much do you weigh?", type: "slider", min: 40, max: 160, unit: "kg", step: 1, global: "The average adult weight is around 75 kg worldwide, with wide regional variation.", sensitive: true },
  { id: "shoe_size", cat: "body", label: "Your shoe size (EU)?", type: "number", min: 30, max: 52, unit: "EU", global: "Most adults wear between EU 37 and EU 44.", sensitive: false },
  { id: "eye_color", cat: "body", label: "Eye colour?", type: "single", options: ["Brown", "Blue", "Green", "Hazel", "Grey", "Amber"], global: "About 3 in 4 people worldwide have brown eyes.", sensitive: false },
  { id: "hair_color", cat: "body", label: "Natural hair colour?", type: "single", options: ["Black", "Brown", "Blonde", "Red", "Grey / white", "Other"], global: "Around 75-85% of people are born with black or brown hair.", sensitive: false },
  { id: "tattoos", cat: "body", label: "Do you have any tattoos?", type: "single", options: ["None", "One", "A few (2–5)", "Many (6+)"], global: "Roughly 1 in 3 adults in Western countries have at least one tattoo.", sensitive: false },
  { id: "piercings", cat: "body", label: "Piercings (beyond standard ear lobes)?", type: "single", options: ["None", "One", "A few", "Many"], global: "About 1 in 4 adults have a piercing beyond the ear lobes.", sensitive: false },
  { id: "sleep", cat: "lifestyle", label: "Hours of sleep per night on average?", type: "slider", min: 3, max: 12, step: 0.5, unit: "hrs", global: "Adults average around 7 hours of sleep per night.", sensitive: false },
  { id: "smoking", cat: "lifestyle", label: "Do you smoke?", type: "single", options: ["Never", "Former smoker", "Occasionally", "Daily"], global: "About 1 in 5 adults worldwide smoke regularly.", sensitive: false },
  { id: "cigs_day", cat: "lifestyle", label: "Cigarettes per day (if you smoke)?", type: "number", min: 0, max: 60, unit: "/day", global: "Regular smokers average around 10–15 cigarettes per day.", sensitive: false, dependsOn: "smoking", showIf: ["Occasionally", "Daily"] },
  { id: "alcohol", cat: "lifestyle", label: "How often do you drink alcohol?", type: "single", options: ["Never", "Rarely", "Monthly", "Weekly", "Several times a week", "Daily"], global: "Roughly 40% of adults worldwide drink alcohol at least occasionally.", sensitive: false },
  { id: "alcohol_units", cat: "lifestyle", label: "Alcoholic drinks per week?", type: "number", min: 0, max: 50, unit: "drinks", global: "Among drinkers, the average is around 4–7 drinks per week.", sensitive: false, dependsOn: "alcohol", showIf: ["Rarely", "Monthly", "Weekly", "Several times a week", "Daily"] },
  { id: "water", cat: "lifestyle", label: "Glasses of water per day?", type: "number", min: 0, max: 20, unit: "glasses", global: "Most adults drink about 6–8 glasses of water per day.", sensitive: false },
  { id: "steps", cat: "lifestyle", label: "Steps per day (typical)?", type: "slider", min: 1000, max: 20000, step: 500, unit: "steps", global: "The average adult walks around 5,000–7,000 steps per day.", sensitive: false },
  { id: "exercise_freq", cat: "fitness", label: "How often do you exercise?", type: "single", options: ["Never", "Rarely", "1x week", "2–3x week", "4–5x week", "Daily"], global: "About 1 in 4 adults does not meet basic physical activity guidelines.", sensitive: false },
  { id: "exercise_type", cat: "fitness", label: "Main type of exercise?", type: "single", options: ["Walking", "Running", "Cycling", "Gym / weights", "Yoga / pilates", "Team sports", "Swimming", "Other", "None"], global: "Walking is the most common form of physical activity for adults.", sensitive: false },
  { id: "years_exercising", cat: "fitness", label: "For how many years have you exercised regularly?", type: "number", min: 0, max: 60, unit: "years", global: "Most regular exercisers report 2–10 years of consistent practice.", sensitive: false },
  { id: "gym_member", cat: "fitness", label: "Do you have a gym membership?", type: "single", options: ["Yes", "No"], global: "Roughly 1 in 5 adults in high-income countries has a gym membership.", sensitive: false },
  { id: "gym_visits", cat: "fitness", label: "Gym visits per week?", type: "number", min: 0, max: 14, unit: "/week", global: "Active gym members average about 2–3 visits per week.", sensitive: false, dependsOn: "gym_member", showIf: ["Yes"] },
  { id: "phone_hours", cat: "daily", label: "Hours on your phone per day?", type: "slider", min: 0, max: 14, step: 0.5, unit: "hrs", global: "The average adult spends around 3–4 hours per day on their phone.", sensitive: false },
  { id: "social_hours", cat: "daily", label: "Hours on social media per day?", type: "slider", min: 0, max: 10, step: 0.5, unit: "hrs", global: "Average social media use is about 2.5 hours per day.", sensitive: false },
  { id: "work_hours", cat: "daily", label: "Working hours per week?", type: "number", min: 0, max: 90, unit: "hrs", global: "Full-time workers average around 38–42 hours per week.", sensitive: false },
  { id: "commute_time", cat: "daily", label: "Average one-way commute time?", type: "number", min: 0, max: 180, unit: "mins", global: "Urban commuters often spend 20–45 minutes each way.", sensitive: false, dependsOn: "employment", showIf: ["Full-time employed", "Part-time employed", "Self-employed", "Studying"] },
  { id: "work_setting", cat: "daily", label: "Primary work setting?", type: "single", options: ["Remote", "Hybrid", "On-site", "Not currently working"], global: "Hybrid work remains common across many office jobs.", sensitive: false },
  { id: "meetings_week", cat: "daily", label: "Meetings per week?", type: "number", min: 0, max: 60, unit: "/week", global: "Knowledge workers often report 6–15 meetings per week.", sensitive: false, dependsOn: "employment", showIf: ["Full-time employed", "Part-time employed", "Self-employed"] },
  { id: "devices_owned", cat: "daily", label: "Connected devices you own?", type: "number", min: 1, max: 20, unit: "devices", global: "Most adults use 3–6 connected devices regularly.", sensitive: false },
  { id: "messaging_apps_weekly", cat: "daily", label: "Messaging apps used weekly?", type: "number", min: 1, max: 20, unit: "apps", global: "Most people actively use 2–5 messaging apps each week.", sensitive: false },
  { id: "emails_sent_day", cat: "daily", label: "Emails sent per day (typical)?", type: "number", min: 0, max: 300, unit: "emails", global: "Outside email-heavy roles, many adults send 0–20 emails daily.", sensitive: false },
  { id: "video_calls_week", cat: "daily", label: "Video calls per week?", type: "number", min: 0, max: 60, unit: "/week", global: "Typical weekly video calls range from 0 to 10 for many adults.", sensitive: false },
  { id: "streaming_hours", cat: "daily", label: "Video streaming hours per week?", type: "slider", min: 0, max: 60, step: 1, unit: "hrs", global: "Many adults stream around 5–15 hours per week.", sensitive: false },
  { id: "subscriptions_count", cat: "daily", label: "Paid digital subscriptions?", type: "number", min: 0, max: 30, unit: "subs", global: "Many households pay for 2–6 digital subscriptions.", sensitive: false },
  { id: "meals", cat: "daily", label: "Meals per day (including snacks)?", type: "number", min: 1, max: 8, unit: "/day", global: "Most adults eat 3 main meals plus 1–2 snacks.", sensitive: false },
  { id: "home_cooked_meals", cat: "daily", label: "Meals cooked at home per week?", type: "number", min: 0, max: 21, unit: "/week", global: "Many households cook at home 6–12 times per week.", sensitive: false },
  { id: "fruit_servings", cat: "daily", label: "Fruit servings per day?", type: "number", min: 0, max: 12, unit: "servings", global: "Typical intake is around 1–2 fruit servings per day.", sensitive: false },
  { id: "coffee", cat: "daily", label: "Cups of coffee per day?", type: "number", min: 0, max: 10, unit: "cups", global: "Coffee drinkers average around 2 cups per day.", sensitive: false },
  { id: "eat_out", cat: "daily", label: "How often do you eat out or order in?", type: "single", options: ["Never", "Monthly", "Weekly", "Several times a week", "Daily"], global: "The average adult eats out or orders in 2–3 times per week.", sensitive: false },
  { id: "weekday_bedtime", cat: "lifestyle", label: "Typical weekday bedtime?", type: "single", options: ["Before 21:00", "21:00–22:59", "23:00–00:59", "01:00 or later"], global: "Most adults go to bed between 22:00 and 00:00 on weekdays.", sensitive: false },
  { id: "weekday_wakeup", cat: "lifestyle", label: "Typical weekday wake-up time?", type: "single", options: ["Before 05:00", "05:00–06:59", "07:00–08:59", "09:00 or later"], global: "Many working adults wake between 06:00 and 08:00 on weekdays.", sensitive: false },
  { id: "sleep_latency", cat: "lifestyle", label: "Minutes to fall asleep (typical)?", type: "number", min: 0, max: 120, unit: "mins", global: "Typical sleep latency is around 10–25 minutes.", sensitive: false },
  { id: "sleep_quality", cat: "lifestyle", label: "Sleep quality (past 2 weeks)?", type: "single", options: ["Very poor", "Poor", "Okay", "Good", "Very good"], global: "Most adults rate their sleep between okay and good.", sensitive: false },
  { id: "night_wakeups", cat: "lifestyle", label: "How many times do you wake up at night?", type: "number", min: 0, max: 10, unit: "times", global: "Most adults report 0–2 wake-ups on a typical night.", sensitive: false },
  { id: "naps_per_week", cat: "lifestyle", label: "Naps per week?", type: "number", min: 0, max: 21, unit: "/week", global: "Many adults nap 0–3 times per week.", sensitive: false },
  { id: "resting_hr", cat: "lifestyle", label: "Resting heart rate (if known)?", type: "number", min: 35, max: 140, unit: "bpm", global: "Typical adult resting heart rate is around 60–90 bpm.", sensitive: false },
  { id: "exercise_minutes_week", cat: "lifestyle", label: "Exercise minutes per week?", type: "number", min: 0, max: 1200, unit: "mins", global: "Many adults report 60–240 exercise minutes per week.", sensitive: false },
  { id: "strength_sessions_week", cat: "lifestyle", label: "Strength sessions per week?", type: "number", min: 0, max: 14, unit: "/week", global: "A common range is 0–3 strength sessions per week.", sensitive: false },
  { id: "alcohol_days_month", cat: "lifestyle", label: "Alcohol days per month?", type: "number", min: 0, max: 31, unit: "/month", global: "Alcohol drinking days vary widely; many adults report 2–12 days per month.", sensitive: false },
  { id: "caffeine_drinks_day", cat: "lifestyle", label: "Caffeinated drinks per day?", type: "number", min: 0, max: 15, unit: "drinks", global: "Many adults consume 1–3 caffeinated drinks per day.", sensitive: false },
  { id: "fruit_veg_servings_day", cat: "lifestyle", label: "Fruit + veg servings per day?", type: "number", min: 0, max: 20, unit: "servings", global: "A common intake is 2–5 servings of fruit and vegetables per day.", sensitive: false },
  { id: "relationship", cat: "relationships", label: "Your relationship status?", type: "single", options: ["Single", "Dating", "In a relationship", "Married / partnered", "Separated", "Divorced", "Widowed"], global: "Roughly half of adults are married or in a committed partnership.", sensitive: false },
  { id: "long_term_count", cat: "relationships", label: "Number of long-term relationships you've had?", type: "number", min: 0, max: 20, unit: "", global: "Most adults report 1–3 long-term relationships over a lifetime.", sensitive: false },
  { id: "children", cat: "relationships", label: "Do you have children?", type: "single", options: ["No", "Yes"], global: "About 3 in 4 adults over 40 have at least one child.", sensitive: false },
  { id: "children_count", cat: "relationships", label: "How many children?", type: "number", min: 1, max: 12, unit: "", global: "Parents in high-income countries average around 2 children.", sensitive: false, dependsOn: "children", showIf: ["Yes"] },
  { id: "first_child_age", cat: "relationships", label: "Your age when your first child was born?", type: "number", min: 14, max: 60, unit: "years", global: "The average age at first childbirth is around 28–31 in high-income countries.", sensitive: false, dependsOn: "children", showIf: ["Yes"] },
  { id: "siblings", cat: "relationships", label: "Number of siblings?", type: "number", min: 0, max: 15, unit: "", global: "The global average is around 2 siblings per person.", sensitive: false },
  { id: "close_contacts_week", cat: "relationships", label: "Close friends/family you contact weekly?", type: "number", min: 0, max: 50, unit: "people", global: "Many adults stay in weekly contact with 5–15 close connections.", sensitive: false },
  { id: "family_same_city", cat: "relationships", label: "Family members living in your city?", type: "number", min: 0, max: 30, unit: "people", global: "Many adults have 1–6 family members in the same city.", sensitive: false },
  { id: "visits_family_month", cat: "relationships", label: "In-person family visits per month?", type: "number", min: 0, max: 30, unit: "/month", global: "A common range is 1–6 family visits per month.", sensitive: false },
  { id: "living", cat: "living", label: "Your current living situation?", type: "single", options: ["Alone", "With partner", "With family", "With roommates", "With parents", "Other"], global: "Living alone has become the most common arrangement in many cities.", sensitive: false },
  { id: "own_rent", cat: "living", label: "Do you own or rent?", type: "single", options: ["Own", "Rent", "Living with family", "Other"], global: "In high-income countries, roughly 60% of adults own their home.", sensitive: false },
  { id: "household", cat: "living", label: "People in your household?", type: "number", min: 1, max: 12, unit: "people", global: "The average household has around 2.5 people.", sensitive: false },
  { id: "income", cat: "living", label: "Your household income range (USD/yr)?", type: "single", options: ["Under 20k", "20–40k", "40–70k", "70–120k", "120–200k", "Over 200k", "Prefer not to say"], global: "The global median household income is around 10,000 USD; high-income countries median around 40–60k.", sensitive: true },
  { id: "orientation", cat: "intimate", label: "Sexual orientation?", type: "single", options: ["Straight", "Gay / lesbian", "Bisexual", "Pansexual", "Asexual", "Other", "Prefer not to say"], global: "Most surveys find around 90% of adults identify as straight.", sensitive: true },
  { id: "first_sex_age", cat: "intimate", label: "Age of first sexual experience?", type: "number", min: 12, max: 50, unit: "years", global: "The median age of first sexual experience is around 17.", sensitive: true },
  { id: "active", cat: "intimate", label: "Currently sexually active?", type: "single", options: ["Yes", "No", "Prefer not to say"], global: "About 2 in 3 adults report being sexually active in the past year.", sensitive: true },
];

function titleCase(value) {
  return String(value || "")
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function mapQuestionType(question) {
  if (question.type === "multi") return "multi";
  if (question.type === "select" && question.options === "dynamic_country_list") return "single";
  if (question.type === "select") return "single";
  if (question.type === "toggle") return "single";
  if (question.type === "text") return "single";
  if (question.type === "number") return "single";
  if (question.type === "slider") return "single";
  return "single";
}

const canonicalCategories = canonicalQuestionSet.categories.map((category, idx) => {
  const meta = CATEGORY_UI_META[category.id] || {};
  const fallbackAccent = CATEGORY_ACCENT_FALLBACK[idx % CATEGORY_ACCENT_FALLBACK.length];
  return {
    id: category.id,
    title: meta.title || titleCase(category.id),
    blurb: meta.blurb || "Answer and compare with peers.",
    accent: meta.accent || fallbackAccent,
    order: CATEGORY_ORDER_OVERRIDES[category.id] || idx + 1,
    optional: Boolean(category.sensitive),
  };
});

const legacyOnlyCategories = IS_V2_QUESTIONNAIRE
  ? []
  : LEGACY_CATEGORIES.filter(
    (legacyCategory) => !canonicalCategories.some((category) => category.id === legacyCategory.id)
  ).map((category, idx) => ({
    ...category,
    order: canonicalCategories.length + idx + 1,
  }));

const CATEGORIES = [...canonicalCategories, ...legacyOnlyCategories]
  .sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  })
  .map((category, idx) => ({
    ...category,
    order: idx + 1,
  }));

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Netherlands", "Spain", "Italy",
  "Sweden", "Norway", "Denmark", "Poland", "Ireland", "Portugal", "Belgium", "Austria",
  "Switzerland", "Canada", "Australia", "New Zealand", "Japan", "South Korea", "Singapore",
  "Brazil", "Mexico", "Argentina", "India", "Indonesia", "Vietnam", "South Africa",
  "United Arab Emirates", "Turkey", "Greece", "Czechia", "Finland", "Romania", "Hungary", "Other",
];

const DEDUPED_QUESTION_IDS = IS_V2_QUESTIONNAIRE
  ? new Set()
  : new Set([
    "sleep",
    "water",
    "phone_hours",
    "social_hours",
    "caffeine_drinks_day",
    "alcohol_days_month",
    "exercise_minutes_week",
  ]);

const MULTI_CHOICE_OVERRIDE_OPTIONS = IS_V2_QUESTIONNAIRE
  ? {}
  : {
    age: ["18–24", "25–34", "35–44", "45–54", "55–64", "65+"],
    height: ["Under 155 cm", "155–164 cm", "165–174 cm", "175–184 cm", "185–194 cm", "195+ cm"],
    weight: ["Under 55 kg", "55–69 kg", "70–84 kg", "85–99 kg", "100–119 kg", "120+ kg"],
    screen_time: ["Under 1h", "1–2h", "2–4h", "4–6h", "6–8h", "8h+"],
    sleep_hours: ["Under 5h", "5–6h", "6–7h", "7–8h", "8–9h", "9h+"],
    steps: ["Under 2k", "2k–5k", "5k–8k", "8k–12k", "12k–16k", "16k+"],
    coffee: ["0", "1", "2", "3", "4–5", "6+"],
    city: ["Capital city", "Large city", "Medium city", "Small city/town", "Village/rural", "Prefer not to say"],
    notifications: ["0–25", "26–75", "76–150", "151–250", "251–400", "400+"],
    phone_unlocks: ["0–20", "21–50", "51–90", "91–140", "141–220", "220+"],
    tabs: ["0–10", "11–25", "26–50", "51–100", "101–200", "200+"],
  };

function buildRangeOptionSet(min, max, unit = "", count = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  const format = (n) => {
    if (Math.abs(n) >= 1000) return `${Math.round(n / 100) / 10}k`;
    return Number.isInteger(n) ? `${n}` : `${Math.round(n * 10) / 10}`;
  };
  const span = max - min;
  const step = span / count;
  const ranges = [];
  for (let i = 0; i < count; i += 1) {
    const lo = i === 0 ? min : min + step * i;
    const hi = i === count - 1 ? max : min + step * (i + 1);
    const loLabel = format(Math.round(lo));
    const hiLabel = format(Math.round(hi));
    const label = i === count - 1
      ? `${loLabel}+${unit ? ` ${unit}` : ""}`
      : `${loLabel}–${hiLabel}${unit ? ` ${unit}` : ""}`;
    ranges.push({
      label,
      min: i === 0 ? Number.NEGATIVE_INFINITY : lo,
      max: i === count - 1 ? Number.POSITIVE_INFINITY : hi,
    });
  }
  return {
    options: ranges.map((r) => r.label),
    ranges,
  };
}

function deriveRangesFromOptionLabels(options) {
  const ranges = [];
  options.forEach((label) => {
    const txt = String(label);
    const exact = txt.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (exact) {
      const n = Number(exact[1]);
      ranges.push({ label: txt, min: n - 0.0001, max: n + 0.0001 });
      return;
    }
    const under = txt.match(/under\s+(\d+(?:\.\d+)?)/i);
    if (under) {
      ranges.push({ label: txt, min: Number.NEGATIVE_INFINITY, max: Number(under[1]) });
      return;
    }
    const plus = txt.match(/(\d+(?:\.\d+)?)\s*\+/);
    if (plus) {
      ranges.push({ label: txt, min: Number(plus[1]), max: Number.POSITIVE_INFINITY });
      return;
    }
    const between = txt.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
    if (between) {
      ranges.push({ label: txt, min: Number(between[1]), max: Number(between[2]) + 0.0001 });
    }
  });
  return ranges.length > 0 ? ranges : null;
}

function toMultiChoiceQuestion(question) {
  const q = { ...question };
  const overrideOptions = MULTI_CHOICE_OVERRIDE_OPTIONS[q.id];
  let options = Array.isArray(q.options) ? [...q.options] : null;
  let ranges = null;

  if (q.id === "country") {
    options = [...COUNTRIES];
  } else if (overrideOptions) {
    options = [...overrideOptions];
  } else if (q.type === "number" || q.type === "slider") {
    const rangeSet = buildRangeOptionSet(q.min, q.max, q.unit || "", 6);
    if (rangeSet) {
      options = rangeSet.options;
      ranges = rangeSet.ranges;
    }
  } else if (q.type === "text") {
    options = ["Prefer not to say", "Other"];
  }

  if (!Array.isArray(options) || options.length === 0) {
    options = ["Prefer not to say", "Other"];
  }

  if (!ranges) {
    ranges = deriveRangesFromOptionLabels(options);
  }

  return {
    ...q,
    type: q.type === "multi" ? "multi" : "single",
    options,
    optionRanges: ranges,
  };
}

function normalizeAnswerForQuestion(raw, question) {
  if (!question) return raw;
  const options = Array.isArray(question.options) ? question.options : [];
  if (question.type === "multi") {
    let arr = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === "string") {
      const t = raw.trim();
      if (t.startsWith("[")) {
        try {
          const p = JSON.parse(t);
          if (Array.isArray(p)) arr = p;
        } catch (_) {}
      } else if (t.includes("||")) {
        arr = t.split("||").map((s) => s.trim());
      } else if (t) arr = [t];
    }
    const seen = new Set();
    const out = [];
    arr.forEach((item) => {
      const lab = typeof item === "string" ? item.trim() : String(item);
      if (!options.includes(lab) || seen.has(lab)) return;
      seen.add(lab);
      out.push(lab);
    });
    return out.length ? out : null;
  }

  if (raw == null || raw === "") return null;
  const asString = String(raw).trim();
  if (options.includes(asString)) return asString;

  const asNumber = Number(raw);
  const ranges = Array.isArray(question.optionRanges) && question.optionRanges.length > 0
    ? question.optionRanges
    : deriveRangesFromOptionLabels(options);
  if (Number.isFinite(asNumber) && Array.isArray(ranges) && ranges.length > 0) {
    const hit = ranges.find((r) => asNumber >= r.min && asNumber < r.max);
    return hit ? hit.label : ranges[ranges.length - 1].label;
  }

  // Best-effort: if this used to be free text/numeric and no exact option matches now,
  // map to a neutral fallback so old sessions still hydrate.
  if (options.includes("Other")) return "Other";
  if (options.includes("Prefer not to say")) return "Prefer not to say";
  return options[0] || null;
}

const canonicalQuestions = canonicalQuestionSet.categories.flatMap((category) =>
  (category.questions || []).map((question) => {
    const mappedType = mapQuestionType(question);
    const fromFileDeps = {};
    if (question.dependsOn) {
      fromFileDeps.dependsOn = question.dependsOn;
      if (Array.isArray(question.showIf)) fromFileDeps.showIf = question.showIf;
      if (Array.isArray(question.hideIf)) fromFileDeps.hideIf = question.hideIf;
    }
    const dependency = { ...(QUESTION_DEPENDENCIES[question.id] || {}), ...fromFileDeps };
    const fromCategorySensitive = Boolean(category.sensitive);
    const fromQuestionSensitive = Boolean(question.sensitive);
    const options = question.type === "toggle"
      ? ["Yes", "No"]
      : Array.isArray(question.options)
        ? question.options
        : undefined;
    return {
      id: question.id,
      cat: category.id,
      label: question.label,
      type: mappedType,
      min: question.min,
      max: question.max,
      unit: question.unit,
      step: question.step,
      options,
      sensitive: fromCategorySensitive || fromQuestionSensitive,
      global: question.global || "",
      ...dependency,
    };
  })
);

const legacyOnlyQuestions = IS_V2_QUESTIONNAIRE
  ? []
  : LEGACY_QUESTIONS.filter(
    (legacyQuestion) => !canonicalQuestions.some((question) => question.id === legacyQuestion.id)
  );

const QUESTIONS = [...canonicalQuestions, ...legacyOnlyQuestions]
  .filter((question) => !DEDUPED_QUESTION_IDS.has(question.id))
  .map(toMultiChoiceQuestion);

/* Index helpers */
const QUESTIONS_BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
const QUESTIONS_BY_CAT = CATEGORIES.reduce((acc, c) => {
  acc[c.id] = QUESTIONS.filter(q => q.cat === c.id);
  return acc;
}, {});
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

async function shareSiteHome() {
  const url = "https://comparizzon.com/";
  const payload = { title: "Comparizzon", text: "Check out Comparizzon", url };
  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  if (hasNativeShare) {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
    }
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch (_) {
    // Fall through to textarea copy fallback.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return "copied";
  } catch (_) {
    return "failed";
  }
}

function answerIsFilled(val) {
  if (val == null || val === "") return false;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

/* Parent answer satisfies conditional visibility (showIf and/or hideIf). */
function dependencyMatchesParentAnswer(q, parentVal) {
  if (parentVal === undefined || parentVal === null || parentVal === "") return false;
  if (Array.isArray(q.showIf) && q.showIf.length > 0) {
    return q.showIf.includes(parentVal);
  }
  if (Array.isArray(q.hideIf) && q.hideIf.length > 0) {
    return !q.hideIf.includes(parentVal);
  }
  return true;
}

/* Should a question be shown given current answers? (handles dependencies) */
function isQuestionVisible(q, answers) {
  if (!q.dependsOn) return true;
  const parent = answers[q.dependsOn];
  return dependencyMatchesParentAnswer(q, parent);
}

/* ============================================================================
   SEEDED PEER POOL — deterministic synthetic "local users"
   Generated once per app load so distributions feel stable.
   Size: 480 peers. Correlations are intentional (height~gender, etc.).
   Labelled clearly as demo data in the UI.
   ============================================================================ */

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand, mean, sd) {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pick(rand, arr, weights) {
  if (!weights) return arr[Math.floor(rand() * arr.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function generatePeer(rand) {
  const p = {};
  QUESTIONS.forEach((q) => {
    if (q.dependsOn && !dependencyMatchesParentAnswer(q, p[q.dependsOn])) {
      return;
    }
    if (!Array.isArray(q.options) || q.options.length === 0) return;
    if (q.type === "multi") {
      const opts = [...q.options];
      const maxK = Math.min(4, opts.length);
      const k = 1 + Math.floor(rand() * maxK);
      const picks = [];
      for (let i = 0; i < k && opts.length > 0; i++) {
        picks.push(opts.splice(Math.floor(rand() * opts.length), 1)[0]);
      }
      p[q.id] = picks;
      return;
    }
    p[q.id] = pick(rand, q.options);
  });
  return p;
}

function buildPeerPool(size = 480, seed = 20260421) {
  const rand = mulberry32(seed);
  const peers = [];
  for (let i = 0; i < size; i++) peers.push(generatePeer(rand));
  return peers;
}

const LIVE_PEER_POOL_ENDPOINT = "/api/live-peers";
const LIVE_PEER_POOL_URL = "https://docs.google.com/spreadsheets/d/1wKOyr9XtI9CEvcp3V7QrGFX42YvopkTxQghkW-dGqr0/gviz/tq?tqx=out:json";
const LIVE_PEER_REFRESH_MS = 30000;

function parseGvizResponse(text) {
  if (typeof text !== "string" || text.trim() === "") throw new Error("empty gviz response");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) throw new Error("invalid gviz envelope");
  return JSON.parse(text.slice(start, end + 1));
}

function toNumberOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractAnswerValuesFromJsonCell(rawJsonCell) {
  if (!rawJsonCell || typeof rawJsonCell !== "string") return {};
  try {
    const parsed = JSON.parse(rawJsonCell);
    const answers = parsed?.answers || {};
    return Object.fromEntries(
      Object.entries(answers).map(([qid, payload]) => [qid, payload?.value])
    );
  } catch (_) {
    return {};
  }
}

function buildPeersFromSheet(table) {
  const cols = table?.cols || [];
  const rows = table?.rows || [];
  if (!cols.length || !rows.length) return [];

  const questionColumns = [];
  let sessionIdColIndex = -1;
  let jsonColIndex = -1;
  cols.forEach((col, idx) => {
    const label = (col?.label || "").trim();
    if (label === "session_id") sessionIdColIndex = idx;
    if (label === "_json") jsonColIndex = idx;
    if (!label.startsWith("q_")) return;
    const qid = label.slice(2);
    if (!QUESTIONS_BY_ID[qid]) return;
    if (questionColumns.some((c) => c.qid === qid)) return; // ignore duplicate sheet columns
    questionColumns.push({ idx, qid });
  });

  const peers = [];
  rows.forEach((row) => {
    const cells = row?.c || [];
    const sessionId = sessionIdColIndex >= 0 ? String(cells[sessionIdColIndex]?.v || "") : "";
    // Ignore earlier synthetic bootstrap rows so varied replacements can take over.
    if (sessionId.includes("-seed-")) return;
    const fallbackFromJson = jsonColIndex >= 0
      ? extractAnswerValuesFromJsonCell(cells[jsonColIndex]?.v)
      : {};
    const peer = {};

    questionColumns.forEach(({ idx, qid }) => {
      const raw = cells[idx]?.v ?? fallbackFromJson[qid];
      if (raw == null || raw === "") return;
      const normalized = normalizeAnswerForQuestion(raw, QUESTIONS_BY_ID[qid]);
      if (normalized != null && normalized !== "") peer[qid] = normalized;
    });

    if (Object.keys(peer).length > 0) peers.push(peer);
  });

  return peers;
}

function usePeerPool() {
  const syntheticPeers = useMemo(() => buildPeerPool(480, 20260421), []);
  const [peers, setPeers] = useState(syntheticPeers);
  const [source, setSource] = useState("synthetic");
  const [sheetState, setSheetState] = useState({
    source: "synthetic",
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: "",
    sheetPeerCount: 0,
    sample: [],
  });

  useEffect(() => {
    let cancelled = false;
    let refreshTimer = null;

    const load = async () => {
      const attemptedAt = new Date().toISOString();
      let attemptedSheetCount = 0;
      let attemptedSample = [];
      try {
        let table = null;
        let sourceLabel = "api";
        try {
          const res = await fetch(LIVE_PEER_POOL_ENDPOINT, { cache: "no-store" });
          if (!res.ok) throw new Error(`api fetch failed (${res.status})`);
          const payload = await res.json();
          table = payload?.table;
          if (!table) throw new Error("api response missing table");
        } catch (apiError) {
          // Fallback to direct public sheet read when the sheet is link-accessible.
          const res = await fetch(LIVE_PEER_POOL_URL, { cache: "no-store" });
          if (!res.ok) throw new Error(`sheet fetch failed (${res.status})`);
          const raw = await res.text();
          const gviz = parseGvizResponse(raw);
          table = gviz?.table;
          sourceLabel = "public-sheet";
        }

        const livePeers = buildPeersFromSheet(table);
        attemptedSheetCount = livePeers.length;
        attemptedSample = livePeers.slice(0, 10);
        if (livePeers.length === 0) throw new Error("sheet returned no usable rows");
        if (!cancelled) {
          setPeers(livePeers);
          setSource("live");
          setSheetState({
            source: "live",
            lastAttemptAt: attemptedAt,
            lastSuccessAt: attemptedAt,
            lastError: "",
            sheetPeerCount: livePeers.length,
            sample: attemptedSample,
          });
          debug("live-peers", `loaded ${livePeers.length} live peers from sheet (${sourceLabel})`);
        }
      } catch (e) {
        if (!cancelled) {
          setPeers(syntheticPeers);
          setSource("synthetic");
          setSheetState((prev) => ({
            source: "synthetic",
            lastAttemptAt: attemptedAt,
            lastSuccessAt: prev.lastSuccessAt,
            lastError: e && e.message ? e.message : String(e),
            sheetPeerCount: attemptedSheetCount || prev.sheetPeerCount,
            sample: attemptedSample.length ? attemptedSample : prev.sample,
          }));
          debug("live-peers-error", e && e.message ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          refreshTimer = setTimeout(load, LIVE_PEER_REFRESH_MS);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [syntheticPeers]);

  return { peers, source, sheetState };
}

/* ============================================================================
   COMPARISON MATH — percentile, distribution, uniqueness, rounding
   ============================================================================ */

/* Spec §8: round percentages to friendly buckets, soft-precision language */
function roundPct(pct) {
  const buckets = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95];
  return buckets.reduce((best, b) => (Math.abs(b - pct) < Math.abs(best - pct) ? b : best), 50);
}
function friendlyShare(pct) {
  if (pct <= 7) return "about 1 in 20";
  if (pct <= 14) return "about 1 in 10";
  if (pct <= 22) return "about 1 in 5";
  if (pct <= 30) return "about 1 in 4";
  if (pct <= 40) return "about 1 in 3";
  if (pct <= 55) return "about half";
  if (pct <= 70) return "about 2 in 3";
  if (pct <= 85) return `roughly ${roundPct(pct)}%`;
  return "the vast majority";
}

/* Build a segmented peer list given the user's current filter */
function segmentPeers(peers, user, segment) {
  const ageBandFor = (value) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.floor(numeric / 10) * 10;
    const firstNum = String(value || "").match(/\d{1,3}/);
    if (!firstNum) return null;
    return Math.floor(Number(firstNum[0]) / 10) * 10;
  };
  if (!segment || segment === "all") return peers;
  if (segment === "gender" && user.gender) return peers.filter(p => p.gender === user.gender);
  if (segment === "country" && user.country) return peers.filter(p => p.country === user.country);
  if (segment === "age" && user.age != null) {
    const band = ageBandFor(user.age);
    if (band == null) return peers;
    return peers.filter((p) => ageBandFor(p.age) === band);
  }
  if (segment === "age_gender" && user.age != null && user.gender) {
    const band = ageBandFor(user.age);
    if (band == null) return peers;
    return peers.filter((p) => p.gender === user.gender && ageBandFor(p.age) === band);
  }
  return peers;
}

/* Numeric percentile: share of peers with answer <= user's answer */
function computeNumericStats(peers, qid, userVal) {
  const vals = peers.map(p => p[qid]).filter(v => v != null && !isNaN(v));
  if (vals.length < 1) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const below = sorted.filter(v => v < userVal).length;
  const same = sorted.filter(v => v === userVal).length;
  const percentile = Math.round(((below + same / 2) / sorted.length) * 100);
  return { vals: sorted, mean, median, percentile, n: vals.length };
}

/* Categorical distribution: {option: count, pct} */
function computeCategoricalStats(peers, qid, userVal) {
  const counts = {};
  let total = 0;
  peers.forEach(p => {
    const v = p[qid];
    if (v == null) return;
    counts[v] = (counts[v] || 0) + 1;
    total++;
  });
  if (total < 1) return null;
  const dist = Object.entries(counts)
    .map(([k, n]) => ({ option: k, n, pct: (n / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);
  const userCount = counts[userVal] || 0;
  const userPct = (userCount / total) * 100;
  const mostCommon = dist[0];
  return { dist, userPct, userCount, mostCommon, n: total };
}

/** Peer cell may be a label, JSON array string, or array (multi-select). */
function peerValueToMultiArray(v) {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== "");
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("[")) {
      try {
        const p = JSON.parse(t);
        if (Array.isArray(p)) return p.map((x) => String(x).trim()).filter(Boolean);
      } catch (_) {}
    }
    if (t.includes("||")) return t.split("||").map((s) => s.trim()).filter(Boolean);
    return [t];
  }
  return [];
}

function setsIntersect(a, b) {
  const A = new Set(a);
  for (let i = 0; i < b.length; i++) if (A.has(b[i])) return true;
  return false;
}

/* Multi-select: per-option prevalence among respondents; overlap % shares ≥1 tag with user */
function computeMultiCategoricalStats(peers, qid, userVal) {
  const q = QUESTIONS_BY_ID[qid];
  const userSet = Array.isArray(userVal) ? userVal : (userVal != null && userVal !== "" ? [userVal] : []);
  if (!userSet.length) return null;
  const optionList = Array.isArray(q?.options) ? q.options : [];
  const counts = {};
  let n = 0;
  peers.forEach((p) => {
    const arr = peerValueToMultiArray(p[qid]);
    if (!arr.length) return;
    n++;
    const set = new Set(arr);
    optionList.forEach((opt) => {
      if (set.has(opt)) counts[opt] = (counts[opt] || 0) + 1;
    });
  });
  if (n < 1) return null;
  const dist = optionList
    .map((opt) => ({ option: opt, n: counts[opt] || 0, pct: ((counts[opt] || 0) / n) * 100 }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.pct - a.pct);
  let overlap = 0;
  peers.forEach((p) => {
    const arr = peerValueToMultiArray(p[qid]);
    if (!arr.length) return;
    if (setsIntersect(userSet, arr)) overlap++;
  });
  const overlapPct = (overlap / n) * 100;
  const tagPcts = userSet.map((tag) => ((counts[tag] || 0) / n) * 100);
  const userPct = tagPcts.length ? tagPcts.reduce((a, b) => a + b, 0) / tagPcts.length : 0;
  const mostCommon = dist[0];
  return { dist, userPct, overlapPct, mostCommon, n };
}

/* Per-answer rarity (0 = very common, 1 = very unique) */
function answerRarity(peers, qid, userVal) {
  if (userVal == null) return null;
  const q = QUESTIONS_BY_ID[qid];
  if (!q) return null;
  if (["number", "slider"].includes(q.type)) {
    const s = computeNumericStats(peers, qid, userVal);
    if (!s) return null;
    // rarity = how far from the median, as a share of the spread
    const range = q.max - q.min || 1;
    const dist = Math.abs(userVal - s.median) / range;
    return clamp(dist * 2.2, 0, 1);
  }
  if (q.type === "multi") {
    const s = computeMultiCategoricalStats(peers, qid, userVal);
    if (!s) return null;
    return clamp(1 - s.overlapPct / 100, 0, 1);
  }
  const s = computeCategoricalStats(peers, qid, userVal);
  if (!s) return null;
  return clamp(1 - s.userPct / 100, 0, 1);
}

/* Category uniqueness = mean rarity across answered questions in that category */
function computeCategoryUniqueness(peers, answers, catId) {
  const qs = QUESTIONS_BY_CAT[catId].filter(q => answerIsFilled(answers[q.id]) && isQuestionVisible(q, answers));
  if (qs.length === 0) return null;
  const rarities = qs.map(q => answerRarity(peers, q.id, answers[q.id])).filter(r => r != null);
  if (rarities.length === 0) return null;
  const avg = rarities.reduce((a, b) => a + b, 0) / rarities.length;
  let label = "Very common";
  if (avg > 0.75) label = "Highly unique";
  else if (avg > 0.55) label = "Rare";
  else if (avg > 0.35) label = "Somewhat uncommon";
  else if (avg > 0.18) label = "A bit above average";
  return { score: avg, label, n: rarities.length };
}

/* Comparison phrase generator (spec §18 tone) */
function comparisonPhrase(kind, peerStat) {
  if (kind === "numeric") {
    const p = peerStat.percentile;
    if (p <= 10) return `You're lower than most — roughly the bottom ${roundPct(p)}%.`;
    if (p <= 30) return `Below average. About ${roundPct(p)}% of users sit lower than you.`;
    if (p <= 45) return `A little below average.`;
    if (p <= 55) return `You're close to average here.`;
    if (p <= 70) return `A bit above average.`;
    if (p <= 90) return `Above most — roughly top ${roundPct(100 - p)}%.`;
    return `You're higher than almost everyone — top ${roundPct(100 - p)}%.`;
  }
  if (kind === "categorical") {
    const share = roundPct(peerStat.userPct);
    if (peerStat.userPct >= 50) return `The most common answer — ${friendlyShare(peerStat.userPct)} share it.`;
    if (peerStat.userPct >= 25) return `A common pick — ${friendlyShare(peerStat.userPct)} of users chose the same.`;
    if (peerStat.userPct >= 10) return `Less common — about ${share}% picked this.`;
    return `Uncommon — only around ${share}% of users chose this.`;
  }
  if (kind === "multi") {
    const o = peerStat.overlapPct;
    const share = roundPct(o);
    if (o >= 62) return `Heavy overlap — ${friendlyShare(o)} picked at least one of the same options you did.`;
    if (o >= 38) return `Solid overlap — about ${share}% share one or more picks with you.`;
    if (o >= 18) return `Selective overlap — roughly ${share}% touched one of your choices.`;
    return `Distinct combo — only about ${share}% picked any of the same options.`;
  }
  return "";
}

function buildRealityCheckItems(peers, answers) {
  const items = [];
  Object.keys(answers).forEach((qid) => {
    const q = QUESTIONS_BY_ID[qid];
    const value = answers[qid];
    if (!q || !answerIsFilled(value) || !isQuestionVisible(q, answers)) return;

    if (["number", "slider"].includes(q.type)) {
      const stat = computeNumericStats(peers, qid, value);
      if (!stat) return;
      const pctLower = roundPct(stat.percentile);
      const pctHigher = roundPct(100 - stat.percentile);
      let agreementPct = 50;
      let sentence = "You're close to the middle on this question.";
      if (stat.percentile >= 55) {
        agreementPct = pctLower;
        sentence = `${pctLower}% of users answered lower than you.`;
      } else if (stat.percentile <= 45) {
        agreementPct = pctHigher;
        sentence = `${pctHigher}% of users answered higher than you.`;
      }
      const distance = Math.abs(agreementPct - 50);
      const tone = agreementPct >= 60 ? "positive" : agreementPct <= 30 ? "rare" : "neutral";
      items.push({
        qid,
        label: q.label,
        agreementPct,
        sentence,
        responses: stat.n,
        tone,
        strength: distance,
      });
      return;
    }

    if (q.type === "single") {
      const stat = computeCategoricalStats(peers, qid, value);
      if (!stat) return;
      const samePct = roundPct(stat.userPct);
      const uncommonPct = roundPct(100 - stat.userPct);
      const agreementPct = samePct;
      const sentence = `${samePct}% gave the same answer as you.`;
      const tone = samePct >= 55 ? "positive" : samePct <= 20 ? "rare" : "neutral";
      items.push({
        qid,
        label: q.label,
        agreementPct,
        sentence,
        responses: stat.n,
        tone,
        strength: Math.max(Math.abs(samePct - 50), Math.abs(uncommonPct - 50)),
      });
      return;
    }

    if (q.type === "multi") {
      const stat = computeMultiCategoricalStats(peers, qid, value);
      if (!stat) return;
      const ov = roundPct(stat.overlapPct);
      const agreementPct = ov;
      const sentence = `${ov}% picked at least one of the same options as you.`;
      const tone = ov >= 58 ? "positive" : ov <= 22 ? "rare" : "neutral";
      items.push({
        qid,
        label: q.label,
        agreementPct,
        sentence,
        responses: stat.n,
        tone,
        strength: Math.abs(ov - 50),
      });
    }
  });

  return items
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);
}

function realityToneColor(tone) {
  if (tone === "positive") return "#6AAE90";
  if (tone === "rare") return "#C66E67";
  return "#8A867A";
}

/* ============================================================================
   CHART PRIMITIVES — custom SVG, mobile-first, paired with text summaries
   ============================================================================ */

function DistributionHistogram({ values, userValue, min, max, unit = "", accent = "var(--ink)" }) {
  const bins = 16;
  const range = max - min;
  const binW = range / bins;
  const counts = new Array(bins).fill(0);
  values.forEach(v => {
    const i = clamp(Math.floor((v - min) / binW), 0, bins - 1);
    counts[i]++;
  });
  const maxC = Math.max(...counts, 1);
  const userBin = userValue != null ? clamp(Math.floor((userValue - min) / binW), 0, bins - 1) : -1;

  const W = 100; const H = 60;
  const barW = W / bins;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
        {counts.map((c, i) => {
          const h = (c / maxC) * H;
          const isUser = i === userBin;
          return (
            <motion.rect
              key={i}
              initial={{ height: 0, y: H }}
              animate={{ height: h, y: H - h }}
              transition={{ duration: 0.5, delay: i * 0.015, ease: EASE_OUT }}
              x={i * barW + 0.4}
              width={barW - 0.8}
              fill={isUser ? accent : "#E6E5E0"}
              rx={0.8}
            />
          );
        })}
        {userBin >= 0 && (
          <motion.line
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.3 }}
            x1={userBin * barW + barW / 2} x2={userBin * barW + barW / 2}
            y1={0} y2={H} stroke={accent} strokeWidth={0.4} strokeDasharray="1 1.5"
          />
        )}
        <text x={0} y={H + 12} fontFamily="JetBrains Mono, monospace" fontSize={4.5} fill="#999">{min}{unit}</text>
        <text x={W} y={H + 12} fontFamily="JetBrains Mono, monospace" fontSize={4.5} fill="#999" textAnchor="end">{max}{unit}</text>
      </svg>
    </div>
  );
}

function optionMatchesUserChoice(option, userOption) {
  if (userOption == null) return false;
  if (Array.isArray(userOption)) return userOption.includes(option);
  return userOption === option;
}

function HorizontalBars({ dist, userOption, accent = "var(--ink)" }) {
  const max = Math.max(...dist.map(d => d.pct), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {dist.map((d, i) => {
        const isUser = optionMatchesUserChoice(d.option, userOption);
        return (
          <div key={d.option} style={{ display: "grid", gridTemplateColumns: "minmax(100px, 1fr) 2.2fr 40px", gap: 10, alignItems: "center" }}>
            <div style={{
              fontSize: 13, color: isUser ? "var(--ink)" : "var(--ink-3)",
              fontWeight: isUser ? 500 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{d.option}</div>
            <div style={{ height: 10, background: "var(--surface-muted)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(d.pct / max) * 100}%` }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: EASE_OUT }}
                style={{ height: "100%", background: isUser ? accent : "#CFCDC6", borderRadius: 3 }}
              />
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>
              {Math.round(d.pct)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ dist, userOption, accent = "var(--ink)", size = 120 }) {
  const palette = ["#111111", "#7E7D77", "#B4B2AC", "#D9D7D0", "#ECEAE3", "#F6F4EE"];
  let cumulative = 0;
  const total = dist.reduce((a, b) => a + b.pct, 0) || 1;
  const r = 42; const cx = 50; const cy = 50;
  const segs = dist.map((d, i) => {
    const start = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += d.pct;
    const end = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const isUser = optionMatchesUserChoice(d.option, userOption);
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, isUser, color: isUser ? accent : palette[i % palette.length], option: d.option, pct: d.pct };
  });
  const userSeg = segs.find(s => s.isUser);
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {segs.map((s, i) => (
          <motion.path
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: EASE_OUT }}
            style={{ transformOrigin: "50% 50%" }}
            d={s.d} fill={s.color}
          />
        ))}
        <circle cx={50} cy={50} r={22} fill="var(--bg-raised)" />
        {userSeg && (
          <text x={50} y={48} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={10} fill="var(--ink)" fontWeight={500}>
            {Math.round(userSeg.pct)}%
          </text>
        )}
        {userSeg && (
          <text x={50} y={58} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={6} fill="#999">
            you
          </text>
        )}
      </svg>
    </div>
  );
}

function PercentileBadge({ percentile }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "baseline", gap: 6,
      padding: "6px 12px", background: "transparent", borderRadius: "var(--radius-s)",
      border: "1px solid rgba(17,17,17,0.24)",
    }}>
      <span className="mono" style={{ fontSize: 18, color: "var(--ink)", fontWeight: 500 }}>{percentile}</span>
      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>percentile</span>
    </div>
  );
}

/* Minimal info tooltip — small ⓘ icon that reveals a short explainer on hover/tap */
function InfoTip({ children, align = "right" }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", lineHeight: 0 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="How this is calculated"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        onBlur={() => setOpen(false)}
        style={{
          width: 16, height: 16, padding: 0,
          border: "1px solid var(--line)", borderRadius: "50%",
          background: "transparent", cursor: "help",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--sans)", fontSize: 10, fontWeight: 500,
          color: "var(--ink-3)", lineHeight: 1,
          transition: "color 150ms ease, border-color 150ms ease, background 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; e.currentTarget.style.borderColor = "#B4B2AC"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-3)"; e.currentTarget.style.borderColor = "var(--line)"; }}
      >i</button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
            role="tooltip"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              [align]: 0,
              zIndex: 30,
              minWidth: 220, maxWidth: 280,
              padding: "10px 12px",
              background: "var(--btn-solid-bg)",
              color: "var(--btn-solid-fg)",
              borderRadius: "var(--radius-s)",
              fontSize: 12, lineHeight: 1.5,
              fontFamily: "var(--sans)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              pointerEvents: "none",
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

function UniquenessMeter({ score, size = 80 }) {
  const pct = Math.round(score * 100);
  const r = 32; const c = 2 * Math.PI * r;
  // Scale the inner text proportionally to the circle size
  const numberSize = Math.max(14, size * 0.28);
  const labelSize = Math.max(8, size * 0.13);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="var(--line)" strokeWidth={4} />
        <motion.circle
          cx={40} cy={40} r={r} fill="none"
          stroke="var(--ink)" strokeWidth={4} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: size * 0.02,
      }}>
        <div className="mono" style={{ fontSize: numberSize, color: "var(--ink)", fontWeight: 500, lineHeight: 1 }}>{pct}</div>
        <div style={{ fontSize: labelSize, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>uniq</div>
      </div>
    </div>
  );
}

/**
 * Live, motivational uniqueness meter shown during the questionnaire.
 *
 * It does NOT use real peer data — the score is derived deterministically from a
 * hash of (questionId + answerValue) so that it always reacts to *every* answer
 * change (including adjustments), and gives users a tangible "your score is going
 * up" feedback loop that nudges them through the quiz. Each answered question
 * contributes 0.7–4 percentage points; the score floors at 1% and caps at 92%
 * (intentional headroom — never hits 100% so it always feels earned).
 *
 * On every target change we play a short "calculating" jitter (≈600ms of noise)
 * followed by an ease-out settle (≈500ms) and a pulse ring, so it visually reads
 * as "the system just recomputed your score".
 */
function computeFakeUniquenessScore(answers) {
  let score = 1;
  if (!answers) return score;
  const keys = Object.keys(answers);
  for (let i = 0; i < keys.length; i++) {
    const qid = keys[i];
    const v = answers[qid];
    if (!answerIsFilled(v)) continue;
    const sig = qid + ":" + (typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v));
    let h = 0;
    for (let j = 0; j < sig.length; j++) {
      h = ((h << 5) - h) + sig.charCodeAt(j);
      h |= 0;
    }
    score += 0.7 + (Math.abs(h) % 33) / 10;
  }
  return Math.max(1, Math.min(92, Math.round(score)));
}

function LiveUniquenessMeter({ answers, size = 56 }) {
  const target = useMemo(() => computeFakeUniquenessScore(answers), [answers]);
  const [displayed, setDisplayed] = useState(target);
  const [calculating, setCalculating] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const initRef = useRef(true);
  const rafRef = useRef(0);
  const displayedRef = useRef(target);
  const targetRef = useRef(target);
  useEffect(() => { displayedRef.current = displayed; }, [displayed]);

  useEffect(() => {
    if (initRef.current) {
      initRef.current = false;
      targetRef.current = target;
      setDisplayed(target);
      return;
    }
    if (targetRef.current === target) {
      // Same numeric target but answers reference changed (e.g. user re-selected
      // the same option). Just pulse the ring — no number change, no jitter.
      cancelAnimationFrame(rafRef.current);
      setPulseKey((k) => k + 1);
      setCalculating(true);
      const id = setTimeout(() => setCalculating(false), 750);
      return () => clearTimeout(id);
    }

    // Smooth, monotonic count (no jitter, slow ease-out).
    targetRef.current = target;
    cancelAnimationFrame(rafRef.current);
    const from = displayedRef.current;
    const to = target;
    setCalculating(true);
    setPulseKey((k) => k + 1);

    const dur = 1400;
    const start = performance.now();

    const tick = () => {
      const e = performance.now() - start;
      if (e >= dur) {
        setDisplayed(to);
        setCalculating(false);
        return;
      }
      const t = e / dur;
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic — slow, calm finish
      const v = Math.round(from + (to - from) * eased);
      setDisplayed(Math.max(1, Math.min(99, v)));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const r = 32;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, displayed));
  const dashOffset = c - (pct / 100) * c;
  const numberSize = Math.max(13, size * 0.32);
  const labelSize = Math.max(8, size * 0.16);

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
      aria-live="polite"
      aria-label={`Uniqueness ${pct} percent${calculating ? ", calculating" : ""}`}
      title={`Uniqueness ${pct}%`}
    >
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="var(--line)" strokeWidth={4} />
        <circle
          cx={40} cy={40} r={r} fill="none"
          stroke="var(--ink)" strokeWidth={4} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <AnimatePresence>
        {calculating && (
          <motion.div
            key={`pulse-${pulseKey}`}
            initial={{ scale: 0.92, opacity: 0.55 }}
            animate={{ scale: 1.35, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: EASE_OUT }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1px solid var(--ink)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: size * 0.02, pointerEvents: "none",
      }}>
        <div className="mono" style={{ fontSize: numberSize, color: "var(--ink)", fontWeight: 500, lineHeight: 1 }}>{pct}</div>
        <div style={{ fontSize: labelSize, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>uniq</div>
      </div>
    </div>
  );
}

/* ============================================================================
   SHELL — top nav visible on all post-welcome screens
   ============================================================================ */

/* Matches a CSS media query — lets components react to viewport changes */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    setMatches(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, [query]);
  return matches;
}

const THEME_STORAGE_KEY = "avg_io_theme";

function readInitialMode() {
  if (typeof window === "undefined") return "light";
  try {
    const p = localStorage.getItem("avg_io_theme_phase");
    if (p === "dark" || p === "light") return p;
    const legacy = localStorage.getItem(THEME_STORAGE_KEY);
    if (legacy === "dark") return "dark";
    if (legacy === "light") return "light";
    return "light";
  } catch (_) {
    return "light";
  }
}

function applyDomTheme(mode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    // Keep writing legacy key for backward compatibility with existing clients.
    localStorage.setItem("avg_io_theme_phase", mode);
  } catch (_) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "dark" ? "#121210" : "#FBFBFA");
}

function useTheme() {
  const [mode, setMode] = useState(readInitialMode);

  useEffect(() => {
    applyDomTheme(mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  return { mode, toggleTheme };
}

function ThemeToggle({ mode, onToggle }) {
  const dark = mode === "dark";
  const label = dark ? "Dark mode enabled. Click to switch to light mode." : "Light mode enabled. Click to switch to dark mode.";
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label}
      title={label}
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      style={{
        flexShrink: 0,
        width: 42,
        height: 38,
        borderRadius: "var(--radius-m)",
        border: "1px solid var(--line)",
        background: "var(--surface-muted)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: "background 180ms ease, border-color 180ms ease",
        position: "relative",
      }}
    >
      <span style={{ position: "relative", width: 22, height: 22, display: "block" }}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            opacity: dark ? 0 : 1,
            transform: dark ? "rotate(-70deg) scale(0.5)" : "rotate(0deg) scale(1)",
            transition: "opacity 220ms ease, transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
            color: "var(--ink)",
          }}
        >
          <circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            d="M12 3v2M12 19v2M5.64 5.64l1.41 1.41M17.95 17.95l1.41 1.41M3 12h2M19 12h2M5.64 18.36l1.41-1.41M17.95 6.05l1.41-1.41"
          />
        </svg>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            opacity: dark ? 1 : 0,
            transform: dark ? "rotate(0deg) scale(1)" : "rotate(70deg) scale(0.5)",
            transition: "opacity 220ms ease, transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
            color: "var(--ink)",
          }}
        >
          <path
            fill="currentColor"
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          />
        </svg>
      </span>
    </motion.button>
  );
}

function TopBar({
  state, dispatch, totalAnswered,
  peerSource = "synthetic", peerCount = 0, onOpenSheetData = null,
  themeMode = "light",
  onToggleTheme,
  activeRoom = null,
  activeRoomId = null,
  onOpenRoomDashboard = null,
}) {
  const items = [
    { id: "hub", label: "Categories" },
    { id: "overview", label: "Overview" },
  ];
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu when screen changes
  useEffect(() => { setMenuOpen(false); }, [state.screen]);
  // Close if we cross back to desktop
  useEffect(() => { if (!isMobile) setMenuOpen(false); }, [isMobile]);

  const go = (id) => {
    dispatch({ type: "go", screen: id });
    setMenuOpen(false);
  };

  const openSheetData = () => {
    setMenuOpen(false);
    if (onOpenSheetData) onOpenSheetData();
  };
  const isLive = peerSource === "live";

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "var(--topbar-bg)",
      backdropFilter: "saturate(180%) blur(10px)",
      WebkitBackdropFilter: "saturate(180%) blur(10px)",
      borderBottom: "1px solid var(--line)",
    }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto",
        padding: isMobile ? "12px 18px" : "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <button
          onClick={() => go("welcome")}
          aria-label="Go to start page"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", minWidth: 0 }}
        >
          <Logo size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Active comparison room pill — shown for any user who is in a
              room, not just owners. Tapping opens the dashboard modal where
              they can copy the invite, see members, leave / kick / delete. */}
          {!isMobile && activeRoomId && typeof onOpenRoomDashboard === "function" && (
            <button
              onClick={onOpenRoomDashboard}
              title="Open private comparison room"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: "var(--surface-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                color: "var(--ink-2)",
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--accent-solid)",
              }} />
              <span style={{ fontSize: 11, fontWeight: 500 }}>Room</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                {activeRoomId}
              </span>
              {activeRoom?.number != null && (
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                  · #{activeRoom.number}
                </span>
              )}
            </button>
          )}
          {typeof onToggleTheme === "function" && (
            <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
          )}
          {isMobile ? (
            <button
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: 38, height: 38,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: menuOpen ? "var(--surface-muted)" : "transparent",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-s)",
                cursor: "pointer",
                padding: 0,
                transition: "background 180ms ease",
              }}
            >
              {/* Three-bar icon, drawn inline (minimalist-ui bans Lucide/Feather libs) */}
              <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
                <motion.line
                  x1="0" x2="16" y1="1.5" y2="1.5"
                  stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"
                  animate={menuOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  style={{ transformOrigin: "8px 1.5px" }}
                />
                <motion.line
                  x1="0" x2="16" y1="6" y2="6"
                  stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"
                  animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                />
                <motion.line
                  x1="0" x2="16" y1="10.5" y2="10.5"
                  stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"
                  animate={menuOpen ? { rotate: -45, y: -4.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  style={{ transformOrigin: "8px 10.5px" }}
                />
              </svg>
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {items.map(it => (
                <button key={it.id}
                  onClick={() => go(it.id)}
                  style={{
                    background: state.screen === it.id ? "var(--surface-muted)" : "transparent",
                    border: "none", padding: "8px 14px", borderRadius: "var(--radius-s)",
                    fontFamily: "var(--sans)", fontSize: 13.5, cursor: "pointer",
                    color: state.screen === it.id ? "var(--ink)" : "var(--ink-3)",
                    fontWeight: 500,
                  }}
                >{it.label}</button>
              ))}
              <div style={{ marginLeft: 10, paddingLeft: 14, borderLeft: "1px solid var(--line)", display: "flex", alignItems: "baseline", gap: 12 }}>
                <button
                  onClick={openSheetData}
                  title={isLive ? "Using live community data" : "Using synthetic fallback data"}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: `1px solid ${isLive ? "var(--surface-live-border)" : "var(--surface-fallback-border)"}`,
                    background: isLive ? "var(--surface-live)" : "var(--surface-fallback)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: isLive ? "#2E9B45" : "#8A867A",
                  }} />
                  <span className="mono" style={{ fontSize: 10, color: isLive ? "#6BC77D" : "var(--ink-3)" }}>
                    {isLive ? "LIVE" : "FALLBACK"}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                    {peerCount}
                  </span>
                </button>
                <span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{totalAnswered}</span>
                  <span className="label" style={{ marginLeft: 6 }}>answered</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: EASE_DRAWER }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--line)", background: "var(--mobile-menu-bg)" }}
          >
            <div style={{ padding: "10px 18px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
              {items.map(it => (
                <button key={it.id}
                  onClick={() => go(it.id)}
                  style={{
                    background: state.screen === it.id ? "var(--surface-muted)" : "transparent",
                    border: "none", textAlign: "left",
                    padding: "12px 12px", borderRadius: "var(--radius-s)",
                    fontFamily: "var(--sans)", fontSize: 15, cursor: "pointer",
                    color: state.screen === it.id ? "var(--ink)" : "var(--ink-2)",
                    fontWeight: 500,
                  }}
                >{it.label}</button>
              ))}
              {activeRoomId && typeof onOpenRoomDashboard === "function" && (
                <button
                  onClick={() => { setMenuOpen(false); onOpenRoomDashboard(); }}
                  style={{
                    background: "transparent",
                    border: "none", textAlign: "left",
                    padding: "12px 12px", borderRadius: "var(--radius-s)",
                    fontFamily: "var(--sans)", fontSize: 15, cursor: "pointer",
                    color: "var(--ink-2)",
                    fontWeight: 500,
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--accent-solid)",
                  }} />
                  <span>Private room</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" }}>
                    {activeRoomId}{activeRoom?.number != null ? ` · #${activeRoom.number}` : ""}
                  </span>
                </button>
              )}
              <div style={{
                marginTop: 6, paddingTop: 12, borderTop: "1px solid var(--line)",
                display: "flex", alignItems: "baseline", gap: 6,
                padding: "12px 12px 2px",
              }}>
                <button
                  onClick={openSheetData}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "3px 7px",
                    borderRadius: 999,
                    border: `1px solid ${isLive ? "var(--surface-live-border)" : "var(--surface-fallback-border)"}`,
                    background: isLive ? "var(--surface-live)" : "var(--surface-fallback)",
                    marginRight: 8,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: isLive ? "#2E9B45" : "#8A867A",
                  }} />
                  <span className="mono" style={{ fontSize: 10, color: isLive ? "#6BC77D" : "var(--ink-3)" }}>
                    {isLive ? "LIVE" : "FALLBACK"}
                  </span>
                </button>
                <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{totalAnswered}</span>
                <span className="label">answered</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SheetDataModal({ open, onClose, sheetState }) {
  if (!open) return null;
  const {
    source = "synthetic",
    lastAttemptAt = null,
    lastSuccessAt = null,
    lastError = "",
    sheetPeerCount = 0,
  } = sheetState || {};

  const fmt = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch (_) {
      return iso;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        style={{
          position: "fixed", inset: 0, zIndex: 120,
          background: "var(--modal-scrim)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(920px, 96vw)",
            maxHeight: "88vh",
            overflow: "auto",
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-l)",
            boxShadow: "0 10px 44px rgba(0,0,0,0.16)",
            padding: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div>
              <div className="label">Shared Sheet Data</div>
              <div className="serif" style={{ fontSize: 24, color: "var(--ink)", marginTop: 4 }}>
                Gathered peer rows
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 10, background: "var(--surface-fallback)", border: "1px solid var(--line)", borderRadius: "var(--radius-s)" }}>
              <div className="label">Current source</div>
              <div className="mono" style={{ color: "var(--ink)", marginTop: 6 }}>{source === "live" ? "LIVE" : "FALLBACK"}</div>
            </div>
            <div style={{ padding: 10, background: "var(--surface-fallback)", border: "1px solid var(--line)", borderRadius: "var(--radius-s)" }}>
              <div className="label">User inputs</div>
              <div className="mono" style={{ color: "var(--ink)", marginTop: 6 }}>{sheetPeerCount}</div>
            </div>
            <div style={{ padding: 10, background: "var(--surface-fallback)", border: "1px solid var(--line)", borderRadius: "var(--radius-s)" }}>
              <div className="label">Last refresh attempt</div>
              <div style={{ color: "var(--ink)", marginTop: 6, fontSize: 12 }}>{fmt(lastAttemptAt)}</div>
            </div>
            <div style={{ padding: 10, background: "var(--surface-fallback)", border: "1px solid var(--line)", borderRadius: "var(--radius-s)" }}>
              <div className="label">Last successful sync</div>
              <div style={{ color: "var(--ink)", marginTop: 6, fontSize: 12 }}>{fmt(lastSuccessAt)}</div>
            </div>
          </div>

          {lastError ? (
            <div style={{
              marginBottom: 12, padding: "10px 12px",
              border: "1px solid #ECDCC8", background: "#FFF7EE", borderRadius: "var(--radius-s)",
              fontSize: 12, color: "#7A4B0E",
            }}>
              Latest fetch error: {lastError}
            </div>
          ) : null}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function PageShell({ children, maxWidth = 1120 }) {
  return (
    <div style={{ maxWidth, margin: "0 auto", padding: "40px 24px 80px" }}>
      {children}
    </div>
  );
}

/* ============================================================================
   PRIVATE ROOMS — invite-only comparison rooms
   Server-gated. Up to 25 anonymous participants per room (numbered #1–#25).
   ============================================================================ */

const ROOM_STORAGE_KEY = "comparizzon:rooms";
const ROOM_ACTIVE_KEY = "comparizzon:active-room";
const ROOM_ID_REGEX = /^[A-Z0-9]{6,12}$/;
const ROOMS_MAX_PARTICIPANTS = 25;
const ROOMS_TTL_DAYS = 30;

function getRoomIdFromUrl() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("room");
    if (!raw) return null;
    const id = String(raw).trim().toUpperCase();
    return ROOM_ID_REGEX.test(id) ? id : null;
  } catch (_) { return null; }
}

function buildRoomShareUrl(roomId) {
  if (typeof window === "undefined" || !roomId) return "";
  const origin = window.location.origin || "";
  return `${origin}/?room=${encodeURIComponent(roomId)}`;
}

async function readRoomMap() {
  try {
    const r = await window.storage.get(ROOM_STORAGE_KEY);
    if (!r?.value) return {};
    const parsed = JSON.parse(r.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) { return {}; }
}

async function writeRoomMap(map) {
  try { await window.storage.set(ROOM_STORAGE_KEY, JSON.stringify(map || {})); } catch (_) {}
}

async function persistActiveRoomId(roomId) {
  try {
    if (roomId) await window.storage.set(ROOM_ACTIVE_KEY, roomId);
    else await window.storage.delete(ROOM_ACTIVE_KEY);
  } catch (_) {}
}

async function readActiveRoomId() {
  try {
    const r = await window.storage.get(ROOM_ACTIVE_KEY);
    return r?.value || null;
  } catch (_) { return null; }
}

async function fetchJsonOrThrow(url, init) {
  const res = await fetch(url, init);
  let json = {};
  try { json = await res.json(); } catch (_) { json = {}; }
  if (!res.ok) {
    const err = new Error(json?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.requiresSubmission = Boolean(json?.requires_submission);
    throw err;
  }
  return json;
}

async function apiCreateRoom({ title, maxParticipants, ttlDays }) {
  return fetchJsonOrThrow("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "create",
      title,
      questionnaire_version: String(QUESTIONNAIRE_VERSION),
      max_participants: maxParticipants,
      ttl_days: ttlDays,
    }),
  });
}

async function apiJoinRoom(roomId) {
  return fetchJsonOrThrow("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "join", room_id: roomId }),
  });
}

async function apiSubmitRoom({ roomId, token, answers }) {
  return fetchJsonOrThrow("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "submit",
      room_id: roomId,
      participant_token: token,
      answers,
    }),
  });
}

async function apiRoomStatus({ roomId, token }) {
  const params = new URLSearchParams();
  params.set("op", "status");
  params.set("room_id", roomId);
  if (token) params.set("token", token);
  return fetchJsonOrThrow(`/api/rooms?${params.toString()}`);
}

async function apiRoomResults({ roomId, token }) {
  const params = new URLSearchParams();
  params.set("op", "results");
  params.set("room_id", roomId);
  params.set("token", token);
  return fetchJsonOrThrow(`/api/rooms?${params.toString()}`);
}

async function apiLeaveRoom({ roomId, token }) {
  return fetchJsonOrThrow("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "leave",
      room_id: roomId,
      participant_token: token,
    }),
  });
}

async function apiManageRoom({ roomId, ownerToken, action, targetNumber }) {
  return fetchJsonOrThrow("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "manage",
      room_id: roomId,
      owner_token: ownerToken,
      action,
      ...(targetNumber != null ? { target_number: targetNumber } : {}),
    }),
  });
}

/* Single source of truth for which rooms the user is part of, plus their
   tokens / numbers. Survives page reloads via localStorage. The actual
   answers live server-side; this only stores membership metadata. */
function useRoomSession() {
  const [rooms, setRooms] = useState({});
  const [activeRoomId, setActiveRoomIdState] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = await readRoomMap();
      const stored = await readActiveRoomId();
      const fromUrl = getRoomIdFromUrl();
      if (cancelled) return;
      setRooms(map);
      const candidate = fromUrl && map[fromUrl] ? fromUrl : stored;
      if (candidate && map[candidate]) {
        setActiveRoomIdState(candidate);
        if (candidate !== stored) await persistActiveRoomId(candidate);
      } else {
        setActiveRoomIdState(null);
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const setActive = useCallback(async (roomId) => {
    setActiveRoomIdState(roomId || null);
    await persistActiveRoomId(roomId || null);
  }, []);

  const persistRoom = useCallback((roomId, data) => {
    setRooms((prev) => {
      const next = { ...prev, [roomId]: { ...(prev[roomId] || {}), ...data } };
      writeRoomMap(next);
      return next;
    });
  }, []);

  const removeRoom = useCallback(async (roomId) => {
    setRooms((prev) => {
      const next = { ...prev };
      delete next[roomId];
      writeRoomMap(next);
      return next;
    });
    setActiveRoomIdState((prev) => (prev === roomId ? null : prev));
    const stored = await readActiveRoomId();
    if (stored === roomId) await persistActiveRoomId(null);
  }, []);

  const createRoom = useCallback(async ({ title }) => {
    setError(""); setBusy(true);
    try {
      const result = await apiCreateRoom({
        title,
        maxParticipants: ROOMS_MAX_PARTICIPANTS,
        ttlDays: ROOMS_TTL_DAYS,
      });
      const data = {
        role: "owner",
        token: result.owner_token,
        number: result.owner_number,
        title: result.title,
        expires_at: result.expires_at,
        max_participants: result.max_participants,
        questionnaire_version: result.questionnaire_version,
        created_at: new Date().toISOString(),
      };
      persistRoom(result.room_id, data);
      await setActive(result.room_id);
      return { room_id: result.room_id, ...data };
    } catch (err) {
      setError(err?.message || "Could not create room");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [persistRoom, setActive]);

  const joinRoom = useCallback(async (roomId) => {
    setError(""); setBusy(true);
    try {
      const result = await apiJoinRoom(roomId);
      const data = {
        role: "member",
        token: result.participant_token,
        number: result.participant_number,
        joined_at: new Date().toISOString(),
      };
      persistRoom(result.room_id, data);
      await setActive(result.room_id);
      return { room_id: result.room_id, ...data };
    } catch (err) {
      setError(err?.message || "Could not join room");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [persistRoom, setActive]);

  const leaveRoom = useCallback(async (roomId) => {
    const stored = rooms[roomId];
    if (!stored?.token) return;
    setError(""); setBusy(true);
    try {
      await apiLeaveRoom({ roomId, token: stored.token });
      await removeRoom(roomId);
    } catch (err) {
      setError(err?.message || "Could not leave room");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [rooms, removeRoom]);

  const deleteRoom = useCallback(async (roomId) => {
    const stored = rooms[roomId];
    if (!stored?.token || stored.role !== "owner") return;
    setError(""); setBusy(true);
    try {
      await apiManageRoom({ roomId, ownerToken: stored.token, action: "delete" });
      await removeRoom(roomId);
    } catch (err) {
      setError(err?.message || "Could not delete room");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [rooms, removeRoom]);

  const kickFromRoom = useCallback(async (roomId, targetNumber) => {
    const stored = rooms[roomId];
    if (!stored?.token || stored.role !== "owner") return;
    setError(""); setBusy(true);
    try {
      await apiManageRoom({ roomId, ownerToken: stored.token, action: "kick", targetNumber });
    } catch (err) {
      setError(err?.message || "Could not remove participant");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [rooms]);

  return {
    rooms,
    activeRoom: activeRoomId ? rooms[activeRoomId] : null,
    activeRoomId,
    hydrated,
    error,
    busy,
    setActive,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    kickFromRoom,
    removeRoom,
    clearError: () => setError(""),
  };
}

/* Polls /api/rooms-results for the active room and exposes its participants
   in a peer-shaped array (one object per other member, keyed by question id).
   Server-side gating means we only get results once the user has submitted
   their own answers — that "submission gate" status is mirrored in
   canViewResults. The hook is idempotent: when there's no active room or the
   user has no token yet, it parks itself with empty data. */
function useRoomCompareData({ activeRoomId, token, enabled }) {
  const [state, setState] = useState({
    loading: false,
    canViewResults: false,
    requiresSubmission: false,
    roomPeers: [],
    yourNumber: null,
    submittedCount: 0,
    activeCount: 0,
    error: "",
  });

  useEffect(() => {
    if (!enabled || !activeRoomId || !token) {
      setState({
        loading: false,
        canViewResults: false,
        requiresSubmission: false,
        roomPeers: [],
        yourNumber: null,
        submittedCount: 0,
        activeCount: 0,
        error: "",
      });
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const status = await apiRoomStatus({ roomId: activeRoomId, token });
        if (cancelled) return;
        const submittedCount = Number(status?.submitted_count) || 0;
        const activeCount = Number(status?.active_count) || 0;
        const yourNumber = typeof status?.your_number === "number" ? status.your_number : null;

        if (!status?.can_view_results) {
          setState({
            loading: false,
            canViewResults: false,
            requiresSubmission: true,
            roomPeers: [],
            yourNumber,
            submittedCount,
            activeCount,
            error: "",
          });
          return;
        }

        const results = await apiRoomResults({ roomId: activeRoomId, token });
        if (cancelled) return;
        const list = Array.isArray(results?.participants) ? results.participants : [];
        const roomPeers = list
          .filter((p) => !p.is_you)
          .map((p) => (p && typeof p.answers === "object" && p.answers) || null)
          .filter((a) => a && Object.keys(a).length > 0);

        setState({
          loading: false,
          canViewResults: true,
          requiresSubmission: false,
          roomPeers,
          yourNumber,
          submittedCount,
          activeCount,
          error: "",
        });
      } catch (err) {
        if (cancelled) return;
        const msg = String((err && err.message) || err);
        /* If we got kicked or the room died, stop pretending we're in it.
           App-level submit effect handles the membership cleanup; here we
           just stop showing stale data. */
        setState((prev) => ({
          ...prev,
          loading: false,
          error: msg,
          ...(/not\s*found|expired|forbidden/i.test(msg)
            ? { canViewResults: false, roomPeers: [] }
            : null),
        }));
      }
    };

    setState((prev) => ({ ...prev, loading: true, error: "" }));
    load();
    const interval = setInterval(load, 12000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [enabled, activeRoomId, token]);

  return state;
}

function CreateRoomModal({ open, onClose, onSubmit, busy, error }) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    const cleaned = String(title || "").trim().slice(0, 80);
    try { await onSubmit({ title: cleaned }); }
    catch (_) { /* error surfaced by hook */ }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        style={{
          position: "fixed", inset: 0, zIndex: 130,
          background: "var(--modal-scrim)",
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          padding: isMobile ? 0 : 24,
        }}
        onClick={onClose}
      >
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: isMobile ? "100%" : "min(560px, 100%)",
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: isMobile ? "16px 16px 0 0" : "var(--radius-l)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.18)",
            padding: isMobile ? "20px 18px calc(18px + env(safe-area-inset-bottom, 0px))" : 26,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div>
              <div className="label">Private comparison</div>
              <div className="serif" style={{ fontSize: 26, color: "var(--ink)", marginTop: 4, lineHeight: 1.15 }}>
                Create a private room
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} type="button">Close</Button>
          </div>

          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.55, marginTop: 0, marginBottom: 18 }}>
            Share the link with up to {ROOMS_MAX_PARTICIPANTS} people. Everyone stays
            anonymous — you'll only see each other as <span className="mono">#1</span>,
            <span className="mono"> #2</span>, <span className="mono">#3</span>… and
            answers stay hidden until each person submits their own.
          </p>

          <label style={{ display: "block", marginBottom: 14 }}>
            <div className="label" style={{ marginBottom: 6 }}>Room name (optional)</div>
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Family chat, Roommates, Team Friday"
              style={{
                width: "100%",
                padding: "11px 12px",
                fontSize: 14,
                fontFamily: "inherit",
                color: "var(--ink)",
                background: "var(--surface-fallback)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-s)",
                outline: "none",
              }}
              autoFocus
            />
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>
              Only visible to you and people you invite. {ROOMS_TTL_DAYS}-day lifetime.
            </div>
          </label>

          {error && (
            <div style={{
              marginBottom: 12, padding: "10px 12px",
              border: "1px solid #ECDCC8", background: "#FFF7EE",
              borderRadius: "var(--radius-s)",
              fontSize: 12, color: "#7A4B0E",
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap",
          }}>
            <Button variant="ghost" onClick={onClose} type="button" disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create room"}
            </Button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}

/* ============================================================================
   ROOM DASHBOARD MODAL
   ============================================================================
   Single place to manage an active comparison room: copy invite link, see
   who has joined and submitted, and run owner / participant actions
   (kick, leave, delete). All members see the dashboard; "Remove" buttons
   only appear for the owner. */

function RoomDashboardModal({
  open,
  onClose,
  roomId,
  room,
  busy,
  error,
  onLeave,
  onDelete,
  onKick,
  onClearError,
  onOpenComparison,
}) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [info, setInfo] = useState({
    loading: true,
    error: "",
    title: "",
    expiresAt: "",
    max: 25,
    participants: [],
    yourNumber: null,
    canViewResults: false,
    activeCount: 0,
    submittedCount: 0,
    spotsLeft: null,
  });
  const [copyState, setCopyState] = useState("idle"); /* idle | copied | failed */
  const token = room?.token || "";
  const isOwner = room?.role === "owner";
  const shareUrl = roomId ? buildRoomShareUrl(roomId) : "";

  const refresh = useCallback(async () => {
    if (!roomId) return;
    setInfo((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await apiRoomStatus({ roomId, token });
      setInfo({
        loading: false,
        error: "",
        title: (res && res.room && res.room.title) || "",
        expiresAt: (res && res.room && res.room.expires_at) || "",
        max: (res && res.room && Number(res.room.max_participants)) || 25,
        participants: Array.isArray(res?.participants) ? res.participants : [],
        yourNumber: typeof res?.your_number === "number" ? res.your_number : null,
        canViewResults: Boolean(res?.can_view_results),
        activeCount: Number(res?.active_count) || 0,
        submittedCount: Number(res?.submitted_count) || 0,
        spotsLeft: typeof res?.spots_left === "number" ? res.spots_left : null,
      });
    } catch (err) {
      setInfo((prev) => ({
        ...prev,
        loading: false,
        error: (err && err.message) || "Could not load room",
      }));
    }
  }, [roomId, token]);

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    const interval = setInterval(refresh, 12000);
    return () => clearInterval(interval);
  }, [open, refresh]);

  if (!open) return null;

  const expiresLabel = (() => {
    const d = info.expiresAt ? new Date(info.expiresAt) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    const days = Math.max(0, Math.round((d.getTime() - Date.now()) / 86400000));
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires in 1 day";
    return `Expires in ${days} days`;
  })();

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1600);
    } catch (_) {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleLeave = async () => {
    if (busy) return;
    const msg = isOwner
      ? `Delete this room for everyone? This can't be undone.`
      : `Leave this room? You'll lose access to the comparison.`;
    if (!window.confirm(msg)) return;
    try {
      if (isOwner) {
        await onDelete?.();
      } else {
        await onLeave?.();
      }
      onClose?.();
    } catch (_) { /* surfaced via error prop */ }
  };

  const handleKick = async (number) => {
    if (busy || !isOwner) return;
    if (!window.confirm(`Remove participant #${number} from the room?`)) return;
    try {
      await onKick?.(number);
      await refresh();
    } catch (_) { /* surfaced via error prop */ }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        style={{
          position: "fixed", inset: 0, zIndex: 135,
          background: "var(--modal-scrim)",
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          padding: isMobile ? 0 : 24,
          overflowY: "auto",
        }}
        onClick={() => { onClearError?.(); onClose?.(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: isMobile ? "100%" : "min(640px, 100%)",
            maxHeight: isMobile ? "92vh" : "86vh",
            overflowY: "auto",
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: isMobile ? "16px 16px 0 0" : "var(--radius-l)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.18)",
            padding: isMobile ? "20px 18px calc(20px + env(safe-area-inset-bottom, 0px))" : 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div className="label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Private comparison room</span>
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 9999,
                  color: "var(--ink-2)",
                  background: "var(--surface-fallback)",
                  border: "1px solid var(--line)",
                }}>
                  {isOwner ? "Owner" : "Member"}
                </span>
              </div>
              <div className="serif" style={{ fontSize: 26, color: "var(--ink)", marginTop: 4, lineHeight: 1.15, wordBreak: "break-word" }}>
                {info.title || room?.title || "Untitled comparison"}
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 6 }}>
                {roomId}
                {info.yourNumber != null && (
                  <>
                    <span style={{ color: "var(--line)" }}> · </span>
                    you are <span style={{ color: "var(--ink)" }}>#{info.yourNumber}</span>
                  </>
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { onClearError?.(); onClose?.(); }} type="button">Close</Button>
          </div>

          <div style={{
            marginTop: 8,
            padding: "12px 14px",
            border: "1px solid var(--line)",
            background: "var(--surface-fallback)",
            borderRadius: "var(--radius-s)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}>
            <div style={{ minWidth: 0, flex: "1 1 280px" }}>
              <div className="label" style={{ marginBottom: 4 }}>Invite link</div>
              <div className="mono" style={{
                fontSize: 12,
                color: "var(--ink-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }} title={shareUrl}>
                {shareUrl}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={handleCopy} type="button">
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy link"}
            </Button>
          </div>

          <div style={{
            marginTop: 14,
            display: "flex", gap: 24, flexWrap: "wrap",
            color: "var(--ink-3)", fontSize: 13,
          }}>
            <div>
              <span className="mono" style={{ color: "var(--ink)" }}>
                {info.activeCount}
              </span>{" "}joined
              {info.spotsLeft != null && (
                <span style={{ color: "var(--ink-4)" }}> · {info.spotsLeft} {info.spotsLeft === 1 ? "spot" : "spots"} left</span>
              )}
            </div>
            <div>
              <span className="mono" style={{ color: "var(--ink)" }}>
                {info.submittedCount}
              </span>{" "}submitted
            </div>
            {expiresLabel && (
              <div style={{ color: "var(--ink-4)" }}>{expiresLabel}</div>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="label" style={{ marginBottom: 8 }}>Members</div>
            {info.loading && info.participants.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-4)", padding: "12px 0" }}>Loading…</div>
            ) : info.participants.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-4)", padding: "12px 0" }}>
                No one has joined yet. Share the invite link to get started.
              </div>
            ) : (
              <div style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-s)",
                overflow: "hidden",
              }}>
                {info.participants
                  .filter((p) => p.status === "active")
                  .sort((a, b) => Number(a.number) - Number(b.number))
                  .map((p, idx, arr) => {
                    const isYou = info.yourNumber != null && Number(p.number) === Number(info.yourNumber);
                    return (
                      <div key={`p-${p.number}`} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 12, padding: "12px 14px",
                        borderBottom: idx < arr.length - 1 ? "1px solid var(--line)" : "none",
                        background: isYou ? "var(--surface-muted)" : "transparent",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <span className="mono" style={{
                            fontSize: 13, color: "var(--ink)",
                            minWidth: 30, textAlign: "right",
                          }}>
                            #{p.number}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                            {isYou ? "You" : `Participant ${p.number}`}
                          </span>
                          <span style={{
                            fontSize: 10,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            padding: "2px 7px",
                            borderRadius: 9999,
                            color: p.has_submitted ? "var(--ink)" : "var(--ink-3)",
                            background: p.has_submitted ? "var(--surface-live)" : "var(--surface-fallback)",
                            border: `1px solid ${p.has_submitted ? "var(--surface-live-border)" : "var(--line)"}`,
                          }}>
                            {p.has_submitted ? "Submitted" : "Waiting"}
                          </span>
                        </div>
                        {isOwner && !isYou && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleKick(p.number)}
                            disabled={busy}
                            type="button"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {(error || info.error) && (
            <div style={{
              marginTop: 14, padding: "10px 12px",
              border: "1px solid #ECDCC8", background: "#FFF7EE",
              borderRadius: "var(--radius-s)",
              fontSize: 12, color: "#7A4B0E",
            }}>
              {error || info.error}
            </div>
          )}

          <div style={{
            marginTop: 22,
            display: "flex", gap: 8, flexWrap: "wrap",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="sm" variant="ghost" onClick={refresh} disabled={info.loading} type="button">
                {info.loading ? "Refreshing…" : "Refresh"}
              </Button>
              {typeof onOpenComparison === "function" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { onClose?.(); onOpenComparison(); }}
                  disabled={!info.canViewResults}
                  type="button"
                  title={info.canViewResults ? "Compare answers with this room" : "Submit your own answers first to unlock comparisons"}
                >
                  Compare answers
                </Button>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLeave}
              disabled={busy}
              type="button"
              style={{ color: "var(--ink-3)" }}
            >
              {isOwner ? (busy ? "Deleting…" : "Delete room") : (busy ? "Leaving…" : "Leave room")}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ============================================================================
   COMPARE MODE BANNER
   ============================================================================
   Sticky strip below the TopBar that lets users in a room toggle between
   comparing answers with everyone (the global peer pool) and comparing
   only with this room. While the user hasn't submitted their own answers
   yet, the room tab is disabled and a hint nudges them to finish. */

function CompareModeBanner({
  mode,
  onModeChange,
  roomId,
  yourNumber,
  roomPeerCount,
  globalPeerCount,
  canViewResults,
  requiresSubmission,
  submittedCount,
  activeCount,
  loading,
  onOpenDashboard,
}) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  if (!roomId) return null;

  const tabBase = {
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: "5px 12px",
    fontFamily: "inherit",
    fontSize: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };
  const tabActive = {
    background: "var(--ink)",
    color: "var(--bg-raised)",
    borderColor: "var(--ink)",
  };
  const tabInactive = {
    background: "var(--surface-fallback)",
    color: "var(--ink-2)",
  };
  const tabDisabled = {
    cursor: "not-allowed",
    opacity: 0.55,
  };

  const roomDisabled = !canViewResults;

  return (
    <div style={{
      background: "var(--bg-raised)",
      borderBottom: "1px solid var(--line)",
    }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto",
        padding: isMobile ? "10px 18px" : "10px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
          <div className="label" style={{ color: "var(--ink-3)" }}>
            Comparing with
          </div>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onModeChange("everyone")}
              style={{
                ...tabBase,
                ...(mode === "everyone" ? tabActive : tabInactive),
              }}
              aria-pressed={mode === "everyone"}
            >
              <span>Everyone</span>
              <span className="mono" style={{ opacity: 0.7 }}>{globalPeerCount}</span>
            </button>
            <button
              type="button"
              onClick={() => { if (!roomDisabled) onModeChange("room"); }}
              disabled={roomDisabled}
              title={roomDisabled
                ? "Answer a few questions yourself to unlock comparison with this room"
                : "Compare answers only with this room"}
              style={{
                ...tabBase,
                ...(mode === "room" ? tabActive : tabInactive),
                ...(roomDisabled ? tabDisabled : null),
              }}
              aria-pressed={mode === "room"}
            >
              <span>This room</span>
              <span className="mono" style={{ opacity: 0.7 }}>
                {canViewResults ? roomPeerCount : "—"}
              </span>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {requiresSubmission && (
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              Answer a few questions to unlock this room's comparison.
            </span>
          )}
          {!requiresSubmission && mode === "room" && roomPeerCount === 0 && (
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {submittedCount <= 1
                ? "Waiting for others to start answering…"
                : "No answers from others yet."}
            </span>
          )}
          {!requiresSubmission && mode === "room" && roomPeerCount > 0 && (
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              <span className="mono">{submittedCount}</span> of <span className="mono">{activeCount}</span> submitted
            </span>
          )}
          {typeof onOpenDashboard === "function" && (
            <button
              type="button"
              onClick={onOpenDashboard}
              style={{
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--ink-2)",
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontFamily: "inherit",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
              title="Open the room dashboard"
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-solid)" }} />
              <span className="mono">{roomId}</span>
              {yourNumber != null && (
                <span className="mono" style={{ color: "var(--ink-3)" }}>· #{yourNumber}</span>
              )}
            </button>
          )}
          {loading && (
            <span style={{ fontSize: 11, color: "var(--ink-4)" }}>Refreshing…</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   JOIN ROOM SCREEN
   ============================================================================
   Shown when the URL has ?room=ID but the user has no membership for that
   room yet. We fetch the room's *public* status (counts + title only — no
   answers) so the joiner sees what they're walking into before committing,
   then offer a single "Join" CTA. After joining we drop them at the start of
   the questionnaire so they can start answering. */

function JoinRoomScreen({
  roomId,
  onJoin,
  onDecline,
  busy,
  joinError,
  themeMode = "light",
  onToggleTheme,
}) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [info, setInfo] = useState({
    loading: true,
    error: "",
    title: "",
    spotsLeft: null,
    activeCount: null,
    submittedCount: null,
    expiresAt: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRoomStatus({ roomId });
        if (cancelled) return;
        setInfo({
          loading: false,
          error: "",
          title: (res && res.room && res.room.title) || "",
          spotsLeft: res && typeof res.spots_left === "number" ? res.spots_left : null,
          activeCount: res && typeof res.active_count === "number" ? res.active_count : null,
          submittedCount: res && typeof res.submitted_count === "number" ? res.submitted_count : null,
          expiresAt: (res && res.room && res.room.expires_at) || "",
        });
      } catch (err) {
        if (cancelled) return;
        setInfo({
          loading: false,
          error: (err && err.message) || "Could not load this room.",
          title: "", spotsLeft: null, activeCount: null, submittedCount: null, expiresAt: "",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [roomId]);

  const isFull = info.spotsLeft === 0;
  const blocked = Boolean(info.error) || isFull;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: isMobile ? "40px 24px 80px" : "clamp(56px, 10vh, 120px) 24px 80px",
      background: "transparent",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ width: "min(640px, 100%)", position: "relative", zIndex: 1 }}>
        <motion.div
          {...FADE_UP}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Logo size={36} />
          {typeof onToggleTheme === "function" && (
            <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
          )}
        </motion.div>

        <motion.div {...FADE_UP}
          transition={{ duration: 0.5, delay: 0.06, ease: EASE_OUT }}
          style={{ marginTop: 40, marginBottom: 8 }}
        >
          <div className="label">Private comparison room</div>
        </motion.div>

        <motion.h1 {...FADE_UP}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
          className="serif"
          style={{ fontSize: "clamp(36px, 5.6vw, 60px)", margin: "8px 0 18px", color: "var(--ink)" }}>
          You've been invited<br/>
          <span style={{ color: "var(--ink-3)" }}>to compare answers privately.</span>
        </motion.h1>

        <motion.p {...FADE_UP}
          transition={{ duration: 0.6, delay: 0.18, ease: EASE_OUT }}
          style={{ fontSize: 16, color: "var(--ink-3)", lineHeight: 1.55, marginBottom: 24 }}
        >
          Answer the questionnaire on your own. Nobody in the room sees your
          answers until you've submitted them — and you'll only see theirs
          after you've submitted yours. Everyone stays anonymous; you'll show
          up to each other as <span className="mono">#1</span>, <span className="mono">#2</span>, <span className="mono">#3</span>…
        </motion.p>

        {/* Room summary card */}
        <motion.div {...FADE_UP}
          transition={{ duration: 0.55, delay: 0.24, ease: EASE_OUT }}
          style={{
            padding: "18px 20px",
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-m)",
            position: "relative",
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: 56, height: 1, background: "var(--accent-solid)",
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <div className="label" style={{ marginBottom: 6 }}>Room</div>
              <div style={{ fontSize: 16, color: "var(--ink)", marginBottom: 8, wordBreak: "break-word" }}>
                {info.title || "Untitled comparison"}
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>
                {roomId}
              </div>
            </div>
            <div style={{ textAlign: isMobile ? "left" : "right", flexShrink: 0 }}>
              {info.loading ? (
                <div className="label" style={{ color: "var(--ink-4)" }}>Loading…</div>
              ) : info.error ? (
                <div className="label" style={{ color: "var(--ink-4)" }}>—</div>
              ) : (
                <>
                  <div className="label" style={{ marginBottom: 6 }}>Members</div>
                  <div style={{ fontSize: 14, color: "var(--ink)" }}>
                    <span className="mono">{info.activeCount ?? 0}</span> joined
                    {typeof info.submittedCount === "number" && (
                      <>
                        <span style={{ color: "var(--ink-4)" }}> · </span>
                        <span className="mono">{info.submittedCount}</span> submitted
                      </>
                    )}
                  </div>
                  {typeof info.spotsLeft === "number" && (
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                      {info.spotsLeft > 0
                        ? `${info.spotsLeft} ${info.spotsLeft === 1 ? "spot" : "spots"} left`
                        : "Room is full"}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {(info.error || joinError) && (
          <div style={{
            padding: "12px 14px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-s)",
            background: "var(--surface-fallback)",
            color: "var(--ink-2)",
            fontSize: 13,
            marginBottom: 16,
          }}>
            {joinError || info.error}
          </div>
        )}

        <motion.div {...FADE_UP}
          transition={{ duration: 0.55, delay: 0.32, ease: EASE_OUT }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            ...(isMobile ? { flexDirection: "column", alignItems: "stretch", width: "100%" } : null),
          }}>
          <Button
            onClick={onJoin}
            disabled={busy || blocked}
            style={isMobile ? { width: "100%" } : undefined}
          >
            {busy ? "Joining…" : "Join the room →"}
          </Button>
          <Button
            variant="ghost"
            onClick={onDecline}
            disabled={busy}
            style={isMobile ? { width: "100%" } : undefined}
          >
            Continue without joining
          </Button>
        </motion.div>

        <div style={{ marginTop: 56, fontSize: 12, color: "var(--ink-4)", lineHeight: 1.6 }}>
          Creating and joining a room is free. You can leave at any time, and
          the room owner can remove participants too.
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   WELCOME
   ============================================================================ */

function WelcomeScreen({ dispatch, peerCount = 480, peerSource = "synthetic", themeMode = "light", onToggleTheme, onCreateRoom }) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: isMobile ? "40px 24px 80px" : "clamp(56px, 10vh, 120px) 24px 80px",
      background: "transparent",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ maxWidth: 1120, width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ width: "min(760px, 100%)", margin: "0 auto" }}>
        <motion.div
          {...FADE_UP}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Logo size={44} />
          {typeof onToggleTheme === "function" && (
            <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
          )}
        </motion.div>

        <motion.h1 {...FADE_UP}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE_OUT }}
          className="serif"
          style={{ fontSize: "clamp(44px, 6.4vw, 76px)", margin: "48px 0 18px", color: "var(--ink)" }}>
          See how you compare<br/>
          <span style={{ color: "var(--ink-3)" }}>to answers from real people.</span>
        </motion.h1>

        <motion.p {...FADE_UP}
          transition={{ duration: 0.6, delay: 0.16, ease: EASE_OUT }}
          style={{ fontSize: 17, color: "var(--ink-3)", maxWidth: 520, lineHeight: 1.55 }}>
          Answer plain questions about your life and habits. We show how common or
          unusual each answer is compared with everyone else. The more you answer,
          the fuller your overview becomes.
        </motion.p>

        {typeof onCreateRoom === "function" && (
          <WelcomePrivateRoomCard onCreateRoom={onCreateRoom} isMobile={isMobile} />
        )}

        <motion.div {...FADE_UP}
          transition={{ duration: 0.6, delay: 0.24, ease: EASE_OUT }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 40,
            ...(isMobile ? { flexDirection: "column", alignItems: "stretch", width: "100%", maxWidth: 420 } : null),
          }}>
          <Button onClick={() => {
            dispatch({ type: "seenWelcome" });
            dispatch({ type: "go", screen: "start" });
          }} style={isMobile ? { width: "100%" } : undefined}>
            Start questionnaire →
          </Button>
          <Button
            variant="secondary"
            onClick={() => { dispatch({ type: "seenWelcome" }); dispatch({ type: "go", screen: "hub" }); }}
            style={isMobile ? { width: "100%" } : undefined}
          >
            Browse categories
          </Button>
          <Button
            variant="ghost"
            onClick={() => { dispatch({ type: "seenWelcome" }); dispatch({ type: "go", screen: "overview" }); }}
            style={isMobile ? { width: "100%" } : undefined}
          >
            Open overview
          </Button>
        </motion.div>

        {/* Benefits grid */}
        <WelcomeBenefits />

        <motion.div {...FADE_UP}
          transition={{ duration: 0.6, delay: 0.36, ease: EASE_OUT }}
          style={{ marginTop: 56, display: "flex", gap: 32, flexWrap: "wrap", color: "var(--ink-3)", fontSize: 13 }}>
          <div><span className="mono" style={{ color: "var(--ink)" }}>{QUESTIONS.length}</span> questions</div>
          <div><span className="mono" style={{ color: "var(--ink)" }}>{CATEGORIES.length}</span> categories</div>
          <div><span className="mono" style={{ color: "var(--ink)" }}>{peerCount}</span> peers to compare against</div>
        </motion.div>

        <div style={{ marginTop: 64, fontSize: 12, color: "var(--ink-4)", maxWidth: 520, lineHeight: 1.6 }}>
          {peerSource === "live"
            ? "Comparisons use live answers from the community dataset."
            : "Community data isn’t available right now, so we’re using a built-in sample for comparison."}
        </div>
        </div>
      </div>
    </div>
  );
}

function WelcomePrivateRoomCard({ onCreateRoom, isMobile }) {
  return (
    <motion.div
      {...FADE_UP}
      transition={{ duration: 0.55, delay: 0.22, ease: EASE_OUT }}
      style={{
        marginTop: 28,
        padding: isMobile ? "20px 18px" : "22px 24px",
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-m)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 56, height: 1, background: "var(--accent-solid)",
      }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch" }}>
        <div style={{ maxWidth: 560 }}>
          <div className="label" style={{ marginBottom: 6 }}>Compare with people you know</div>
          <div style={{ fontSize: 17, color: "var(--ink)", marginBottom: 6, lineHeight: 1.3 }}>
            Invite friends, family or colleagues to a private room.
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}>
            Send a link to up to {ROOMS_MAX_PARTICIPANTS} people. Everyone answers
            on their own — answers stay hidden until each person submits theirs.
            Then compare side by side, fully anonymous (you'll see each other as
            <span className="mono"> #1</span>, <span className="mono">#2</span>, <span className="mono">#3</span>…).
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button
            onClick={onCreateRoom}
            variant="secondary"
            style={isMobile ? { width: "100%" } : { alignSelf: "flex-start" }}
          >
            Create a private room
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function WelcomeBenefits() {
  const items = [
    {
      title: "PDF-ready overview",
      body: "Download a polished PDF with your full answer set, category scores, and how each answer compares to peers—built locally in your browser.",
    },
    {
      title: "Context, not a test",
      body: "See how your answers line up with other people. No right or wrong—just distribution.",
    },
    {
      title: "You’re in control",
      body: "Skip questions, go back, or edit answers anytime. Sensitive topics are optional.",
    },
    {
      title: "Results build as you go",
      body: "Charts, category scores, and a simple “uniqueness” view appear as you answer more.",
    },
    {
      title: "Stays on this device",
      body: "No account. Your answers are stored locally in your browser unless you choose to share.",
    },
  ];
  return (
    <div style={{
      marginTop: 56,
      display: "grid",
      gap: 14,
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    }}>
      {items.map((b, i) => (
        <motion.div
          key={b.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 + i * 0.06, ease: EASE_OUT }}
          style={{
            padding: "18px 18px 20px",
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-m)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Tiny hairline accent in the top-left corner */}
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: 32, height: 1, background: "var(--accent-solid)",
          }} />
          <div style={{
            fontSize: 15, fontWeight: 500, color: "var(--ink)",
            marginTop: 6, marginBottom: 6,
          }}>
            {b.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
            {b.body}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* Global atmospheric backdrop: subtle steel/iron mesh, slow drifting gradients,
   and one brighter cursor-following highlight. Mounted once at app root. */
function GlobalMetalBackdrop() {
  const isTouch = useMediaQuery("(hover: none), (pointer: coarse)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const enableCursor = !isTouch && !prefersReducedMotion;
  const orbs = useMemo(() => {
    const count = 5;
    return Array.from({ length: count }, (_, i) => {
      const size = 320 + Math.round(Math.random() * 260);
      const left = 8 + Math.random() * 84;
      const top = 8 + Math.random() * 84;
      const driftX = -70 + Math.random() * 140;
      const driftY = -55 + Math.random() * 110;
      const duration = 36 + Math.random() * 28;
      const delay = Math.random() * 6;
      const opacity = 0.16 + Math.random() * 0.08;
      return { id: `orb-${i}`, size, left, top, driftX, driftY, duration, delay, opacity };
    });
  }, []);

  // Cursor position, smoothed with a soft spring so the glow eases into place
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 22, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 60, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (!enableCursor) return;
    // Initialise to centre so the glow doesn't snap from 0,0 on first move
    rawX.set(window.innerWidth / 2);
    rawY.set(window.innerHeight / 2);
    const onMove = (e) => { rawX.set(e.clientX); rawY.set(e.clientY); };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enableCursor, rawX, rawY]);

  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: 1,
    }}>
      {/* Layer 1: base steel mesh */}
      <div style={{
        position: "absolute", inset: "-10%",
        background: `
          radial-gradient(ellipse 58% 46% at 15% 18%, var(--metal-mesh-a) 0%, rgba(122,124,128,0) 64%),
          radial-gradient(ellipse 62% 52% at 84% 76%, var(--metal-mesh-b) 0%, rgba(108,110,115,0) 68%),
          radial-gradient(ellipse 72% 62% at 52% 48%, var(--metal-mesh-c) 0%, rgba(196,197,201,0) 74%)
        `,
        filter: "blur(0.6px)",
        opacity: 1,
      }} />

      {/* Layer 2: moving metal glow orbs */}
      {!prefersReducedMotion && orbs.map((orb) => (
        <motion.div
          key={orb.id}
          initial={{ x: 0, y: 0, scale: 1 }}
          animate={{
            x: [0, orb.driftX, 0, orb.driftX * -0.42, 0],
            y: [0, orb.driftY, 0, orb.driftY * -0.36, 0],
            scale: [1, 1.06, 0.98, 1.04, 1],
          }}
          transition={{
            duration: orb.duration,
            ease: "easeInOut",
            repeat: Infinity,
            delay: orb.delay,
          }}
          style={{
            position: "absolute",
            left: `${orb.left}%`,
            top: `${orb.top}%`,
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            opacity: orb.opacity + 0.12,
            background: "radial-gradient(circle, var(--metal-orb-core) 0%, var(--metal-orb-mid) 44%, rgba(154,156,162,0) 75%)",
            filter: "blur(1.6px)",
            mixBlendMode: "normal",
            willChange: "transform",
          }}
        />
      ))}

      {/* Layer 3: very faint film grain for metal texture */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: 0.055,
        mixBlendMode: "multiply",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        backgroundSize: "200px 200px",
      }} />

      {/* Layer 4: slow sheened sweep */}
      {!prefersReducedMotion && (
        <motion.div
          initial={{ x: "-20%", y: "-10%" }}
          animate={{ x: ["-20%", "20%", "-20%"], y: ["-10%", "22%", "-10%"] }}
          transition={{ duration: 42, ease: "easeInOut", repeat: Infinity }}
          style={{
            position: "absolute",
            top: "-20%", left: "-20%",
            width: "80%", height: "80%",
            background: "radial-gradient(circle, var(--metal-sheen-core) 0%, rgba(236,237,240,0) 60%)",
            opacity: 0.72,
            filter: "blur(1px)",
          }}
        />
      )}

      {/* Layer 5: brightest orb follows cursor (desktop only) */}
      {enableCursor && (
        <motion.div
          style={{
            position: "absolute",
            left: 0, top: 0,
            width: 930, height: 930,
            x: x, y: y,
            translateX: "-50%", translateY: "-50%",
            background: "radial-gradient(circle, var(--metal-pointer-core) 0%, var(--metal-pointer-mid) 34%, rgba(188,191,198,0) 72%)",
            pointerEvents: "none",
            mixBlendMode: "normal",
            filter: "blur(0.8px)",
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
   CATEGORY HUB
   ============================================================================ */

/* ============================================================================
   FAQ MODULE
   Reusable accordion placed low on Start, Category, and Overview screens.
   Uses native <details>/<summary> so content is crawlable, keyboard-accessible
   and works without JS. Variant selects which set of questions to show.
   ============================================================================ */

const FAQ_SETS = {
  start: [
    {
      q: "What is Comparizzon?",
      a: "Comparizzon is an anonymous life-comparison tool. You answer up to 200 quick questions about your looks, personality, lifestyle, dating life, work, money, habits, and health, and instantly see how your mix of answers stacks up against thousands of real people. No account, no email, free to start.",
    },
    {
      q: "How does Comparizzon work?",
      a: "Pick any of 18 categories and start answering. For every question you'll see live percentages showing how common or rare your answer is compared to everyone else. At the end, the overview gives you your uniqueness score, per-category breakdowns, and a downloadable PDF report.",
    },
    {
      q: "How long does the questionnaire take?",
      a: "About 5 to 10 minutes for the full 200-question set. You don't have to finish everything — even 30 well-answered questions are enough to see meaningful comparison data. You can skip any question or category and still get a full overview.",
    },
    {
      q: "Is Comparizzon free?",
      a: "Yes. Answering the questionnaire and seeing live comparisons costs nothing. A one-time €1 payment unlocks the full overview: your uniqueness score, every category breakdown, all peer-group filters (age, gender, country), and the downloadable PDF report. There is no subscription and no renewal.",
    },
    {
      q: "Do I need an account, email address, or login?",
      a: "No. Comparizzon never asks for your name, email, phone number, or social login. Your progress is saved locally in your browser, so you can close the tab and pick up later. Only the €1 unlock uses an email — purely so you can restore access on another device.",
    },
    {
      q: "Is my data anonymous and private?",
      a: "Yes. Comparizzon stores only anonymous, aggregated answers — never personal identifiers. We don't sell or share data with advertisers, and payments are handled securely by Stripe, so we never see your card details. You can clear your answers from your device at any time.",
    },
    {
      q: "What is the uniqueness score?",
      a: "Your uniqueness score is a number from 0 to 100 that reflects how rare your overall mix of answers is compared to everyone else. A score near 100 means your pattern of choices is statistically uncommon; near 0 means you're close to the global average. The overview also shows which specific answers pulled the score up or down.",
    },
    {
      q: "How accurate is the comparison data?",
      a: "Every percentage is calculated from real answers submitted by thousands of anonymous users across 18 categories. As more people answer, the comparisons become more representative — you're benchmarked against actual human responses, not made-up statistics. Segments with fewer than 30 responses are flagged as low confidence.",
    },
    {
      q: "Can I compare myself against my age group, gender, or country?",
      a: "Yes. The overview includes filters for Everyone, your gender, your age range, age + gender combined, and your country — so you can see how you compare to a peer group that actually looks like you, not just the entire world.",
    },
    {
      q: "Which categories does Comparizzon cover?",
      a: "18 in total: Basics, Looks & Identity, Personality, Lifestyle, Hobbies, Dating Scene, Education, Work, Money & Side Hustles, Habits & Vices, Food & Biohacking, Health & Body, Mind & Mood, Intimate History, Anatomy, AI & Digital Identity, Travel & World, and Real Talk. You can tackle them in any order.",
    },
    {
      q: "Can I skip questions or sensitive categories?",
      a: "Yes, always. Every question has a skip option, and whole categories can be left untouched. Sensitive topics (Intimate History, Anatomy, Real Talk) are clearly labeled and 100% optional — skip them and the rest of the experience still works normally.",
    },
    {
      q: "Does Comparizzon work on mobile?",
      a: "Yes. Comparizzon is built to feel native on phones, tablets, and desktop — nothing to install. Just open comparizzon.com in any modern browser (Chrome, Safari, Firefox, Edge) and you're in.",
    },
    {
      q: "What do I get when I unlock the overview for €1?",
      a: "The €1 unlock gives you: your uniqueness score, a full per-category breakdown, answer-by-answer comparisons, peer-group filters by age, gender and country, and a downloadable PDF report you can save or share. It's a one-time payment — no subscription, no upsell, no expiry.",
    },
    {
      q: "How is Comparizzon different from a personality test?",
      a: "Personality tests put you in a box with a type or letter code. Comparizzon doesn't — it shows, question by question, how your actual answers compare to everyone else's. It's less about labels and more about real, statistical context for your life choices.",
    },
  ],
  category: [
    {
      q: "Do I have to finish this category to see my overview?",
      a: "No. You can answer as much or as little as you want in any category, then jump to the overview. The more you answer, the more detail your overview shows — but even a handful of questions already produce meaningful comparisons.",
    },
    {
      q: "Are my answers saved if I close the tab?",
      a: "Yes. Your progress is stored locally in your browser, so you can close the window and return any time to pick up exactly where you stopped — no account needed.",
    },
    {
      q: "How are the comparison percentages calculated?",
      a: "Each percentage is the share of real responses in your selected peer group (Everyone, your gender, age range, country, etc.) that matched your answer. It's pure frequency — no algorithm, no weighting, no AI guessing.",
    },
    {
      q: "Can I change my answer after I submit it?",
      a: "Yes. Inside any category view, tap Edit on a question to change your answer or Clear to remove it. The live stats and your uniqueness score refresh instantly.",
    },
    {
      q: "Why do some questions only appear after others?",
      a: "A few questions depend on earlier answers — for example, anatomy-related questions only appear when they're relevant to the body type you picked in Basics. It keeps the questionnaire short and avoids asking things that don't apply to you.",
    },
    {
      q: "What does the uniqueness score for a category mean?",
      a: "It averages how rare your answers are across every question you answered in this category. 0 means very common answers; 100 means highly unusual. The more questions you answer, the more stable the score becomes.",
    },
    {
      q: "Will skipping questions hurt my results?",
      a: "No. Skipped questions simply aren't counted toward your overview, so skipping is free — it just means that category has a little less data. Answer only what you're comfortable with.",
    },
    {
      q: "Are there right or wrong answers?",
      a: "No. Comparizzon isn't judging you — it's just showing you where you sit relative to everyone else on each question. There's no grade, no personality type, no gotcha.",
    },
    {
      q: "Are my answers private inside a category?",
      a: "Yes. Nothing ties your answers back to you — no account, no name, no email. Only anonymized, aggregated data feeds the comparisons.",
    },
  ],
  overview: [
    {
      q: "What does the €1 unlock actually include?",
      a: "Your full overview: the uniqueness score, per-category breakdowns, every answer-by-answer comparison, peer-group filters (Everyone, gender, age range, age + gender, country), and a downloadable PDF report. One-time payment, yours to keep, no subscription.",
    },
    {
      q: "Is this a subscription?",
      a: "No. Comparizzon is a one-time €1 unlock for lifetime access to your overview. You will never be charged again and there is nothing to cancel.",
    },
    {
      q: "How is my uniqueness score calculated?",
      a: "For every question you answered, Comparizzon measures how rare your exact answer is inside your selected peer group, then averages those rarities. A score of 80 means only about 20% of people answered the way you did overall — the higher the number, the more unusual your mix of answers.",
    },
    {
      q: "How do the age, gender, and country filters work?",
      a: "You give the basics once (age, gender, country), then the overview lets you switch who you're compared against: Everyone, your gender, your age range, age + gender combined, or your country. Every chart and your uniqueness score recalculate instantly for the peer group you pick.",
    },
    {
      q: "How do I pay? Is it safe?",
      a: "Payments are processed by Stripe — the same provider used by Amazon, Google, and Shopify. Comparizzon never sees your card details and no payment information is stored on our servers. You'll get a Stripe receipt by email.",
    },
    {
      q: "Can I get a refund?",
      a: "Yes. If something's wrong with your unlock, reach out via the socials linked in the footer and we'll refund the €1 — no questions asked.",
    },
    {
      q: "I already paid — how do I restore access on a new device?",
      a: "Tap 'Already paid? Restore access' on the paywall and enter the email you used at Stripe checkout. If there's a successful payment under that email, your overview unlocks instantly and stays unlocked on that device.",
    },
    {
      q: "What's in the PDF report?",
      a: "A clean snapshot of your overview — your uniqueness score, the categories where you're most and least average, and a readable list of the answers that make you stand out. It's generated on your device, so nothing leaves your browser. Save it, print it, or share it.",
    },
    {
      q: "Can I share my overview without sharing my answers?",
      a: "Yes. 'Share snapshot' generates a clean image with just your uniqueness score and top comparisons — no individual answers, no personal data. Safe to post anywhere.",
    },
    {
      q: "Why is there a paywall at all?",
      a: "Running comparisons against thousands of responses, generating the PDF, and keeping the site ad-free costs real money. €1 covers hosting, Stripe fees, and ongoing development — that's it. No ads, no data selling, no email harvesting.",
    },
    {
      q: "Will my uniqueness score change over time?",
      a: "It can. As more people answer the questions, the global averages shift, so your score reflects the real-time population rather than a frozen snapshot. If you update, add, or remove answers, it recalculates too.",
    },
    {
      q: "Can I delete my data?",
      a: "Yes. You can clear your answers from your browser at any time inside the app. If you'd also like your anonymized responses removed from the aggregate dataset, reach out via the socials linked in the footer and we'll handle it.",
    },
  ],
};

function FaqItem({ q, a }) {
  return (
    <details
      className="faq-item"
      style={{
        borderTop: "1px solid var(--faq-line)",
        padding: "14px 0",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          fontSize: 15,
          fontWeight: 500,
          color: "var(--ink)",
          lineHeight: 1.4,
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>{q}</span>
        <span
          className="faq-chevron mono"
          aria-hidden="true"
          style={{
            fontSize: 18,
            lineHeight: 1,
            color: "var(--ink-3)",
            marginTop: 1,
            flexShrink: 0,
            transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          +
        </span>
      </summary>
      <div
        style={{
          marginTop: 10,
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--ink-2)",
        }}
      >
        {a}
      </div>
    </details>
  );
}

function FaqModule({ variant = "start", title, style }) {
  const items = FAQ_SETS[variant] || FAQ_SETS.start;
  const heading =
    title ||
    (variant === "overview"
      ? "Questions about your overview"
      : variant === "category"
        ? "Questions about this category"
        : "Frequently asked");
  return (
    <section
      aria-labelledby={`faq-${variant}-heading`}
      style={{ marginTop: 72, paddingTop: 40, ...style }}
    >
      <div style={{ marginBottom: 14, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span className="label">FAQ</span>
        <h3
          id={`faq-${variant}-heading`}
          className="serif"
          style={{ fontSize: 22, color: "var(--ink)", margin: 0, letterSpacing: "-0.01em" }}
        >
          {heading}
        </h3>
      </div>
      <div>
        {items.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </section>
  );
}

function CategoryHub({ state, dispatch, introMode = false }) {
  const { answers } = state;
  const cats = CATEGORIES.map(c => {
    const qs = QUESTIONS_BY_CAT[c.id].filter(q => isQuestionVisible(q, answers));
    const answered = qs.filter(q => answerIsFilled(answers[q.id])).length;
    return { ...c, qs, answered, total: qs.length, pct: qs.length ? answered / qs.length : 0 };
  });

  const openCat = (catId) => {
    const cat = cats.find(c => c.id === catId);
    // Find first unanswered visible question, or start at 0
    let idx = cat.qs.findIndex(q => !answerIsFilled(answers[q.id]));
    if (idx < 0) idx = 0;
    dispatch({ type: "setCat", catId, idx });
    dispatch({ type: "go", screen: "question" });
  };

  return (
    <PageShell>
      <motion.div {...FADE_UP}>
        <span className="label">Categories</span>
        <h2 className="serif" style={{ fontSize: 44, margin: "14px 0 10px", color: "var(--ink)" }}>
          {introMode ? "Start with any topic you like" : "Where do you want to start?"}
        </h2>
        <p style={{ color: "var(--ink-3)", fontSize: 15, maxWidth: 560, margin: 0 }}>
          {introMode
            ? "Just start answering and watch your data build in real time."
            : "Jump between topics anytime. More answers unlock more detail on your overview."}
        </p>
      </motion.div>

      {introMode && (
        <motion.div
          {...FADE_UP}
          transition={{ duration: 0.45, delay: 0.06, ease: EASE_OUT }}
          style={{ marginTop: 22 }}
        >
          <Card padding={16} style={{ background: "var(--surface-fallback)" }}>
            <div style={{ display: "grid", gap: 6, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.45 }}>
              <div>• Start with any category you like.</div>
              <div>• Skip questions or whole categories anytime.</div>
              <div>• Once mostly filled in, open Overview for detailed charts and peer comparisons.</div>
            </div>
          </Card>
        </motion.div>
      )}

      <div style={{
        display: "grid", gap: 16, marginTop: 40,
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}>
        {cats.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.04, ease: EASE_OUT }}
          >
            <Card
              interactive
              onClick={() => {
                if (c.answered === c.total && c.total > 0) {
                  dispatch({ type: "go", screen: "category", patch: { currentCatId: c.id } });
                } else {
                  openCat(c.id);
                }
              }}
              padding={22}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                    {String(c.order).padStart(2, "0")}
                  </span>
                  <Tag tone={c.accent}>{c.title}</Tag>
                </div>
              </div>
              <div className="serif" style={{ fontSize: 26, color: "var(--ink)", margin: "18px 0 8px" }}>
                {c.title}
              </div>
              <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 20, minHeight: 38 }}>
                {c.blurb}
              </div>
              <ProgressBar value={c.answered} max={c.total} />
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", marginTop: 10, fontSize: 12, color: "var(--ink-3)" }}>
                <span>
                  <span className="mono" style={{ color: "var(--ink)" }}>{c.answered}</span> / {c.total} answered
                </span>
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                {(() => {
                  const isFresh = c.answered === 0;
                  const isDone = c.total > 0 && c.answered === c.total;
                  const label = isFresh ? "Start" : isDone ? "View comparison" : "Continue";
                  // Continue & Start are the active CTAs (primary). View comparison steps down to secondary.
                  const variant = isDone ? "secondary" : "primary";
                  return (
                    <Button
                      variant={variant}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDone) {
                          dispatch({ type: "go", screen: "category", patch: { currentCatId: c.id } });
                        } else {
                          openCat(c.id);
                        }
                      }}
                      style={{ flex: 1, minHeight: 40 }}
                    >
                      {label}
                    </Button>
                  );
                })()}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <FaqModule variant="start" />
    </PageShell>
  );
}

/* ============================================================================
   QUESTION SCREEN
   ============================================================================ */

function QuestionScreen({ state, dispatch, peers }) {
  const cat = CATEGORY_BY_ID[state.currentCatId] || CATEGORIES[0];
  const visible = QUESTIONS_BY_CAT[cat.id].filter(q => isQuestionVisible(q, state.answers));
  const idx = Math.min(state.currentQIdx, Math.max(0, visible.length - 1));
  const q = visible[idx];

  // Find next category in order (for quick-start flow)
  const nextCat = useMemo(() => {
    const sorted = [...CATEGORIES].sort((a, b) => a.order - b.order);
    const curIdx = sorted.findIndex(c => c.id === cat.id);
    if (curIdx < 0) return null;
    return sorted[curIdx + 1] || null;
  }, [cat.id]);

  // Scroll to top when the current question changes (next / prev / skip)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = requestAnimationFrame(() => {
      try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }
      catch (_) { window.scrollTo(0, 0); }
    });
    return () => cancelAnimationFrame(id);
  }, [q?.id]);

  /* Track time spent on the question screen (tab-visible only). Flush on unmount
     so the Overview's "Time on questions" card reads an accurate cumulative total. */
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    let startedAt = document.hidden ? 0 : Date.now();
    let accumulatedMs = 0;
    const handleVis = () => {
      if (document.hidden) {
        if (startedAt) accumulatedMs += Date.now() - startedAt;
        startedAt = 0;
      } else {
        startedAt = Date.now();
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      if (startedAt) accumulatedMs += Date.now() - startedAt;
      if (accumulatedMs > 0) dispatch({ type: "addTime", ms: accumulatedMs });
    };
  }, [dispatch]);

  if (!q) {
    // Category complete
    return (
      <PageShell maxWidth={720}>
        <motion.div {...FADE_UP}>
          <Tag tone={cat.accent}>{cat.title}</Tag>
          <h2 className="serif" style={{ fontSize: 40, margin: "20px 0 12px", color: "var(--ink)" }}>
            {cat.title} complete
          </h2>
          <p style={{ color: "var(--ink-3)", marginBottom: 32 }}>
            {nextCat
              ? `Open your overview, continue to ${nextCat.title}, or choose another category.`
              : "You've finished every category. Take a look at your full overview."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={() => dispatch({ type: "go", screen: "overview" })}>View overview →</Button>
            {nextCat && (
              <Button variant="secondary" onClick={() => {
                dispatch({ type: "setCat", catId: nextCat.id, idx: 0 });
                dispatch({ type: "go", screen: "question" });
              }}>
                Continue to {nextCat.title} →
              </Button>
            )}
            <Button variant="ghost" onClick={() => dispatch({ type: "go", screen: "hub" })}>Pick a category</Button>
          </div>
        </motion.div>
      </PageShell>
    );
  }

  const value = state.answers[q.id];
  const canNext = answerIsFilled(value);
  const setValue = (v) => dispatch({ type: "answer", qid: q.id, value: v });

  const goToNextQuestion = () => {
    if (idx < visible.length - 1) {
      dispatch({ type: "nextQ" });
    } else if (nextCat) {
      dispatch({ type: "setCat", catId: nextCat.id, idx: 0 });
    } else {
      dispatch({ type: "go", screen: "overview" });
    }
  };
  const onPrev = () => {
    if (idx > 0) dispatch({ type: "prevQ" });
    else dispatch({ type: "go", screen: "hub" });
  };
  const onSkip = () => goToNextQuestion();
  const isMobile = useMediaQuery("(max-width: 639px)");

  // Inline live comparison preview
  let previewStats = null, previewKind = null, previewCopy = null;
  if (canNext) {
    if (q.type === "single") {
      previewKind = "categorical";
      previewStats = computeCategoricalStats(peers, q.id, value);
      if (previewStats) previewCopy = comparisonPhrase("categorical", previewStats);
    } else if (q.type === "multi") {
      previewKind = "multi";
      previewStats = computeMultiCategoricalStats(peers, q.id, value);
      if (previewStats) previewCopy = comparisonPhrase("multi", previewStats);
    }
  }

  return (
    <PageShell>
      <div style={{ width: "min(820px, 100%)", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Tag tone={cat.accent}>{cat.title}</Tag>
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {String(idx + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}
        </span>
        <div style={{ flex: 1 }}>
          <ProgressBar value={idx + (canNext ? 1 : 0)} max={visible.length} height={2} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, margin: "24px 0 22px" }}>
            <h2 className="serif" style={{ fontSize: "clamp(32px, 4.2vw, 44px)", margin: 0, color: "var(--ink)", flex: 1, lineHeight: 1.15 }}>
              {q.label}
            </h2>
          </div>

          {q.type === "multi" && (
            <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "-12px 0 28px", lineHeight: 1.45, maxWidth: 560 }}>
              Select all that apply. Click or tap to turn each option on or off.
            </p>
          )}

          {q.sensitive && (
            <div style={{ marginBottom: 24 }}>
              <Tag tone="red">Sensitive · optional</Tag>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <AnswerInput
              q={q}
              value={value}
              onChange={setValue}
              onAnswered={(selectedValue) => {
                // Faster flow on tap-based single-choice questions.
                if (q.type !== "single") return;
                if (selectedValue == null || selectedValue === "") return;
                window.setTimeout(() => {
                  goToNextQuestion();
                }, 140);
              }}
            />
          </div>

          <AnimatePresence>
            {previewCopy && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.28, ease: EASE_DRAWER }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  padding: "14px 18px",
                  background: "transparent",
                  border: "1px solid var(--comparison-preview-border)",
                  borderRadius: "var(--radius-m)",
                  display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
                }}>
                  <span className="label">Comparison preview</span>
                  <span style={{ fontSize: 14, color: "var(--ink)" }}>{previewCopy}</span>
                  {previewKind === "numeric" && previewStats && (
                    <span style={{ marginLeft: "auto" }}>
                      <PercentileBadge percentile={previewStats.percentile} />
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <div style={{ marginTop: 32, display: "grid", gap: isMobile ? 10 : 0 }}>
        {isMobile ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              <Button variant="ghost" onClick={onPrev}>← Back</Button>
              <Button variant="secondary" onClick={onSkip}>Skip</Button>
              <Button onClick={goToNextQuestion} disabled={!canNext}>
                {idx === visible.length - 1 && !nextCat ? "Finish →" : "Next →"}
              </Button>
            </div>
            <Button
              variant="quiet"
              onClick={() => dispatch({ type: "go", screen: "overview" })}
              style={{ justifyContent: "center", alignSelf: "center" }}
            >
              View overview
            </Button>
          </>
        ) : (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 12,
          }}>
            <Button variant="ghost" onClick={onPrev}>← Back</Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="quiet" onClick={() => dispatch({ type: "go", screen: "overview" })}>
                View overview
              </Button>
              <Button variant="secondary" onClick={onSkip}>Skip</Button>
              <Button onClick={goToNextQuestion} disabled={!canNext}>
                {idx === visible.length - 1 && !nextCat ? "Finish →" : "Next →"}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </PageShell>
  );
}

function MultiSelect({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opt) => {
    const set = new Set(selected);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange([...set]);
  };
  const columns = options.length > 8 ? 2 : 1;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {options.map((opt) => (
        <Chip key={opt} active={selected.includes(opt)} onClick={() => toggle(opt)}>
          {opt}
        </Chip>
      ))}
    </div>
  );
}

function AnswerInput({ q, value, onChange, onAnswered = null }) {
  if (q.type === "multi") {
    return (
      <MultiSelect
        options={q.options || []}
        value={value}
        onChange={onChange}
      />
    );
  }
  return (
    <SingleSelect
      options={q.options || []}
      value={value}
      onChange={onChange}
      onSelect={onAnswered}
      columns={(q.options || []).length > 5 ? 2 : 1}
    />
  );
}

/* ============================================================================
   OVERVIEW DASHBOARD
   ============================================================================ */

function OverviewDashboard({
  state,
  dispatch,
  peers,
  onDownloadPdf,
  onShareImage,
  onCreateRoom = null,
  onOpenRoomDashboard = null,
  activeRoomId = null,
}) {
  const { answers, segment } = state;
  const totalAnswered = Object.keys(answers).filter(k => answerIsFilled(answers[k])).length;
  const segmentedPeers = useMemo(() => segmentPeers(peers, answers, segment), [peers, answers, segment]);
  const prefersReducedMotion = useReducedMotion();
  const [isUnlockedForVisit, setIsUnlockedForVisit] = useState(false);
  const [isBlurOn, setIsBlurOn] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [restoreEmail, setRestoreEmail] = useState("");
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [showRestoreForm, setShowRestoreForm] = useState(false);
  const [isMobilePaywall, setIsMobilePaywall] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 640px)");
    const onChange = (event) => setIsMobilePaywall(event.matches);
    setIsMobilePaywall(media.matches);
    if (media.addEventListener) media.addEventListener("change", onChange);
    else media.addListener(onChange);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", onChange);
      else media.removeListener(onChange);
    };
  }, []);

  // Stacked intro: show overview first, then blur, then popup.
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsBlurOn(true);
      setShowPaywallModal(true);
      return undefined;
    }
    const blurTimer = setTimeout(() => setIsBlurOn(true), 1000);
    const modalTimer = setTimeout(() => setShowPaywallModal(true), 1280);
    return () => {
      clearTimeout(blurTimer);
      clearTimeout(modalTimer);
    };
  }, [prefersReducedMotion]);

  const releasePaywallWithReverseStack = useCallback((unlockDelay = 0) => {
    if (prefersReducedMotion) {
      setShowPaywallModal(false);
      setIsBlurOn(false);
      setIsUnlockedForVisit(true);
      return;
    }
    // Reverse sequence: popup out first, then blur out, then unlock.
    setShowPaywallModal(false);
    setTimeout(() => setIsBlurOn(false), 180 + unlockDelay);
    setTimeout(() => setIsUnlockedForVisit(true), 360 + unlockDelay);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;
    const qp = new URLSearchParams(window.location.search);
    const stripeStatus = qp.get("stripe");
    const sessionId = qp.get("session_id");

    const handleReturn = async () => {
      if (!stripeStatus) return;
      if (stripeStatus === "success") {
        if (!sessionId) {
          setStripeError("Missing checkout session. Please contact support.");
        } else {
          try {
            const response = await fetch("/api/verify-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.paid) {
              throw new Error(payload?.error || "Payment verification failed.");
            }
            try {
              if (typeof window !== "undefined" && typeof window.fbq === "function") {
                window.fbq(
                  "track",
                  "Purchase",
                  { value: 1.0, currency: "EUR", content_name: "Comparizzon overview unlock", content_ids: ["overview-unlock"], content_type: "product" },
                  sessionId ? { eventID: sessionId } : undefined
                );
              }
            } catch (_) { /* pixel errors must never break the flow */ }
            if (!cancelled) releasePaywallWithReverseStack(prefersReducedMotion ? 0 : 120);
          } catch (err) {
            if (!cancelled) {
              setStripeError(
                err && typeof err.message === "string"
                  ? err.message
                  : "Payment verification failed. Please contact support."
              );
              setShowPaywallModal(true);
              setIsBlurOn(true);
            }
          }
        }
      } else if (stripeStatus === "canceled") {
        if (!cancelled) {
          setShowPaywallModal(true);
          setIsBlurOn(true);
        }
      }

      qp.delete("stripe");
      qp.delete("session_id");
      const clean = `${window.location.pathname}${qp.toString() ? `?${qp.toString()}` : ""}${window.location.hash || ""}`;
      window.history.replaceState({}, document.title, clean);
    };

    const checkExistingAccess = async () => {
      try {
        const response = await fetch("/api/payment-status", { cache: "no-store" });
        const payload = await response.json();
        if (!cancelled && payload?.paid) {
          releasePaywallWithReverseStack(prefersReducedMotion ? 0 : 120);
        }
      } catch (_) {
        // Ignore and keep paywall default state.
      }
    }

    handleReturn();
    checkExistingAccess();

    return () => {
      cancelled = true;
    };
  }, [prefersReducedMotion, releasePaywallWithReverseStack]);

  const startStripeCheckout = useCallback(async () => {
    if (isStripeLoading) return;
    setStripeError("");
    setIsStripeLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100, currency: "eur" }),
      });
      if (!response.ok) {
        const txt = await response.text();
        let apiMessage = "";
        try {
          const parsed = JSON.parse(txt);
          apiMessage = parsed?.error || "";
        } catch (_) {
          apiMessage = txt || "";
        }
        if (response.status === 404) {
          throw new Error("Payment endpoint not found (/api/create-checkout-session). If local, run with `vercel dev` or deploy to Vercel.");
        }
        throw new Error(apiMessage || `Checkout failed (${response.status})`);
      }
      const payload = await response.json();
      if (!payload?.url) throw new Error("No checkout URL returned");
      try {
        if (typeof window !== "undefined" && typeof window.fbq === "function") {
          window.fbq("track", "InitiateCheckout", {
            value: 1.0,
            currency: "EUR",
            content_name: "Comparizzon overview unlock",
            content_ids: ["overview-unlock"],
            content_type: "product",
            num_items: 1,
          });
        }
      } catch (_) { /* pixel errors must never break the flow */ }
      window.location.assign(payload.url);
    } catch (err) {
      const message = err && typeof err.message === "string"
        ? err.message
        : "Could not open Stripe checkout. Please try again.";
      setStripeError(message);
      setIsStripeLoading(false);
    }
  }, [isStripeLoading]);

  const restorePurchase = useCallback(async () => {
    if (isRestoreLoading) return;
    const email = restoreEmail.trim();
    if (!email) {
      setRestoreMsg("Enter the email used at checkout.");
      return;
    }

    setIsRestoreLoading(true);
    setRestoreMsg("");
    try {
      const response = await fetch("/api/restore-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.paid) {
        throw new Error(payload?.error || "No paid purchase found for that email.");
      }
      setRestoreMsg("Access restored. Unlocking your overview...");
      releasePaywallWithReverseStack(prefersReducedMotion ? 0 : 120);
    } catch (err) {
      setRestoreMsg(
        err && typeof err.message === "string"
          ? err.message
          : "Could not restore access right now."
      );
    } finally {
      setIsRestoreLoading(false);
    }
  }, [isRestoreLoading, restoreEmail, releasePaywallWithReverseStack, prefersReducedMotion]);

  // Snapshot metrics
  const catsStarted = CATEGORIES.filter(c =>
    QUESTIONS_BY_CAT[c.id].some(q => answerIsFilled(answers[q.id]))
  ).length;
  const catsCompleted = CATEGORIES.filter(c => {
    const vis = QUESTIONS_BY_CAT[c.id].filter(q => isQuestionVisible(q, answers));
    return vis.length > 0 && vis.every(q => answerIsFilled(answers[q.id]));
  }).length;
  const localUnlocked = Object.keys(answers).filter(qid => {
    const q = QUESTIONS_BY_ID[qid];
    return q && isQuestionVisible(q, answers);
  }).length;

  // Global uniqueness: mean across category uniquenesses
  const catUniq = CATEGORIES.map(c => computeCategoryUniqueness(segmentedPeers, answers, c.id)).filter(Boolean);
  const overallUniq = catUniq.length > 0 ? catUniq.reduce((a, b) => a + b.score, 0) / catUniq.length : null;

  // Unlock stages per spec
  const stage = totalAnswered < 5 ? 0 : totalAnswered < 10 ? 1 : totalAnswered < 20 ? 2 : 3;
  /* Reality items are no longer rendered on the Overview page. We still compute
     the top item so the paywall teaser can surface a preview stat. */
  const realityItems = useMemo(
    () => buildRealityCheckItems(segmentedPeers, answers),
    [segmentedPeers, answers]
  );

  const paywallActive = !isUnlockedForVisit;
  const blurPx = isBlurOn && paywallActive ? 6 : 0;
  const showPremiumOverview = !paywallActive;

  return (
    <PageShell>
      <div
        style={{
          filter: `blur(${blurPx}px)`,
          transition: prefersReducedMotion ? "none" : "filter 260ms cubic-bezier(0.22, 1, 0.36, 1)",
          pointerEvents: paywallActive ? "none" : "auto",
          userSelect: paywallActive ? "none" : "auto",
        }}
        aria-hidden={paywallActive}
      >
      <motion.div {...FADE_UP}>
        <span className="label">Results</span>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginTop: 10 }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <h2 className="serif" style={{ fontSize: 48, margin: 0, color: "var(--ink)" }}>
              Overview
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--ink-3)", lineHeight: 1.5, maxWidth: 520 }}>
              {showPremiumOverview
                ? (
                  <>
                    <strong style={{ color: "var(--ink)", fontWeight: 600 }}>PDF overview included:</strong> export a printable report with every answer,
                    uniqueness scores, and peer comparisons — generated on your device, nothing uploaded.
                  </>
                )
                : "Your full peer comparison, per-category insights, and PDF export unlock after payment."}
            </p>
          </div>
          {showPremiumOverview && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", maxWidth: "100%" }}>
              {typeof onShareImage === "function" && (
                <Button size="sm" variant="primary" onClick={onShareImage} style={{ height: 40, minHeight: 40, lineHeight: 1, boxSizing: "border-box" }}>
                  Share image
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={onDownloadPdf} style={{ height: 40, minHeight: 40, lineHeight: 1, boxSizing: "border-box" }}>PDF overview ↓</Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Snapshot row — 4 cards, locked to 2×2 on narrow viewports so tiles never collapse to a single column */}
      <div
        className="overview-snapshot-grid"
        style={{ display: "grid", gap: 14, marginTop: 28 }}
      >
        <SnapshotCard label="Answered" value={totalAnswered} sub={`of ${QUESTIONS.length} questions`} />
        <SnapshotCard label="Categories started" value={catsStarted} sub={`${catsCompleted} complete`} />
        <SnapshotCard
          label="Time on questions"
          value={formatTimeSpentValue(state.timeSpentMs)}
          sub={formatTimeSpentSub(state.timeSpentMs)}
        />
        <SnapshotCard
          label={showPremiumOverview ? "Uniqueness" : "Uniqueness (locked)"}
          value={showPremiumOverview && overallUniq != null ? `${Math.round(overallUniq * 100)}` : "—"}
          sub={
            showPremiumOverview
              ? (overallUniq != null ? labelForUniqueness(overallUniq) : "Answer more to see your score")
              : "Unlock to reveal your score and rarity label"
          }
          accent={showPremiumOverview}
          info={showPremiumOverview
            ? "Average rarity of your answers across categories compared with the peer group you selected (0–100). Higher means fewer people answered like you overall."
            : undefined}
        />
      </div>

      {/* Stage hint */}
      <motion.div {...FADE_UP} transition={{ duration: 0.4, delay: 0.2 }} style={{ marginTop: 28 }}>
        <StageHint stage={stage} totalAnswered={totalAnswered} dispatch={dispatch} />
      </motion.div>

      {showPremiumOverview ? (
        <div style={{ marginTop: 48 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 className="serif" style={{ fontSize: 26, color: "var(--ink)", margin: 0 }}>By category</h3>
          </div>

          {/* Peer segment filter — compact dropdown reads as a filter (not page tabs)
              and avoids the multi-line wrapping that a 5-chip segmented control caused. */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <PeerFilterMenu
              value={segment}
              onChange={(v) => dispatch({ type: "setSegment", segment: v })}
            />
          </div>

          <UniquenessExplainer />

          <div style={{
            display: "grid", gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}>
            {CATEGORIES.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.035, ease: EASE_OUT }}
                style={{ height: "100%" }}
              >
                <CategoryCard
                  cat={c} answers={answers} peers={segmentedPeers}
                  onOpen={() => dispatch({ type: "go", screen: "category", patch: { currentCatId: c.id } })}
                  onStart={() => {
                    const qs = QUESTIONS_BY_CAT[c.id].filter((q) => isQuestionVisible(q, answers));
                    let idx = qs.findIndex((q) => !answerIsFilled(answers[q.id]));
                    if (idx < 0) idx = 0;
                    dispatch({ type: "setCat", catId: c.id, idx });
                    dispatch({ type: "go", screen: "question" });
                  }}
                />
              </motion.div>
            ))}
          </div>

          {/* End-of-questionnaire CTA: surface the private rooms feature once
              the user has reached / unlocked their overview. We only show
              this once the user has at least started answering — otherwise
              there's nothing meaningful to compare yet. */}
          {(typeof onCreateRoom === "function" || (activeRoomId && typeof onOpenRoomDashboard === "function")) && totalAnswered > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18, ease: EASE_OUT }}
              style={{
                marginTop: 36,
                padding: "22px 24px",
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-m)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: 56, height: 1, background: "var(--accent-solid)",
              }} />
              <div style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}>
                <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                  <div className="label" style={{ marginBottom: 6 }}>
                    {activeRoomId ? "Your private room" : "Compare with people you know"}
                  </div>
                  <div className="serif" style={{ fontSize: 22, color: "var(--ink)", lineHeight: 1.2, marginBottom: 6 }}>
                    {activeRoomId
                      ? "See how you compare with the people in your room."
                      : "Invite friends, family, or your team to a private room."}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}>
                    {activeRoomId
                      ? "Open the dashboard to see who's joined and submitted, copy your invite link, or flip the comparison toggle to compare just within this room."
                      : `Send a link to up to ${ROOMS_MAX_PARTICIPANTS} people. Everyone answers on their own — answers stay hidden until each person submits theirs. Then compare side by side, fully anonymous (you'll see each other as #1, #2, #3…).`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                  {activeRoomId && typeof onOpenRoomDashboard === "function" ? (
                    <Button size="sm" variant="secondary" onClick={onOpenRoomDashboard}>
                      Open room
                    </Button>
                  ) : (
                    typeof onCreateRoom === "function" && (
                      <Button size="sm" variant="secondary" onClick={onCreateRoom}>
                        Create a private room
                      </Button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div {...FADE_UP} transition={{ duration: 0.35, delay: 0.12 }} style={{ marginTop: 40 }}>
          <div className="card" style={{ padding: 18, borderStyle: "dashed" }}>
            <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 600 }}>Premium overview is locked</div>
            <p style={{ margin: "8px 0 0", color: "var(--ink-3)", fontSize: 14, lineHeight: 1.55 }}>
              Category-by-category rarity, answer-level peer comparisons, and full PDF export are only rendered after a verified unlock.
            </p>
          </div>
        </motion.div>
      )}
      </div>

      {/* FAQ lives outside the blur wrapper so users can read answers to objections
         (price, privacy, what-you-get) while the paywall is visible. */}
      <FaqModule variant="overview" />

      {paywallActive && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            pointerEvents: "auto",
            background: showPaywallModal ? "var(--modal-scrim)" : "rgba(0,0,0,0)",
            transition: prefersReducedMotion ? "none" : "background 220ms cubic-bezier(0.25, 1, 0.5, 1)",
            display: "flex",
            alignItems: isMobilePaywall ? "flex-end" : "center",
            justifyContent: "center",
            padding: isMobilePaywall ? 0 : 24,
          }}
          aria-hidden={!showPaywallModal}
        >
          <AnimatePresence>
            {showPaywallModal && (
              <motion.div
                key="overview-paywall-modal"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.988 }}
                transition={{ duration: prefersReducedMotion ? 0.05 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: isMobilePaywall ? "100%" : "min(720px, 100%)",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--line)",
                  borderRadius: isMobilePaywall ? "16px 16px 0 0" : "var(--radius-l)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
                  padding: isMobilePaywall ? "20px 16px calc(16px + env(safe-area-inset-bottom, 0px))" : 24,
                  maxHeight: isMobilePaywall ? "min(88dvh, 760px)" : "calc(100vh - 48px)",
                  overflowY: "auto",
                }}
              >
                <PaywallContent
                  overallUniq={overallUniq}
                  totalAnswered={totalAnswered}
                  catsCompleted={catsCompleted}
                  realityItems={realityItems}
                  isMobilePaywall={isMobilePaywall}
                  isStripeLoading={isStripeLoading}
                  stripeError={stripeError}
                  onCheckout={startStripeCheckout}
                  onBack={() => dispatch({ type: "go", screen: "hub" })}
                  showRestoreForm={showRestoreForm}
                  setShowRestoreForm={setShowRestoreForm}
                  restoreEmail={restoreEmail}
                  setRestoreEmail={setRestoreEmail}
                  isRestoreLoading={isRestoreLoading}
                  restoreMsg={restoreMsg}
                  onRestore={restorePurchase}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </PageShell>
  );
}

/* ============================================================================
   PAYWALL — value-first layout with teaser reveal, dominant CTA, and collapsed
   restore flow. Copy emphasises the outcome (how unique you are) over the
   mechanism (removing a blur).
   ============================================================================ */
function PaywallContent({
  overallUniq,
  totalAnswered,
  catsCompleted,
  realityItems,
  isMobilePaywall,
  isStripeLoading,
  stripeError,
  onCheckout,
  onBack,
  showRestoreForm,
  setShowRestoreForm,
  restoreEmail,
  setRestoreEmail,
  isRestoreLoading,
  restoreMsg,
  onRestore,
}) {
  const teaserScore = overallUniq != null ? Math.round(overallUniq * 100) : null;
  const teaserLabel = overallUniq != null ? labelForUniqueness(overallUniq) : "";
  const rawTeaserStat = Array.isArray(realityItems) ? realityItems[0] : null;
  const teaserStat = rawTeaserStat
    ? {
      pct: rawTeaserStat.agreementPct,
      sentence: `${rawTeaserStat.agreementPct}% ${String(rawTeaserStat.sentence).replace(/^\d+%\s*/, "")}`,
      label: rawTeaserStat.label,
    }
    : null;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Headline */}
      <div style={{ display: "grid", gap: 6 }}>
        <div className="serif" style={{ color: "var(--ink)", fontSize: 28, lineHeight: 1.08 }}>
          See how you really compare
        </div>
        <div style={{ color: "var(--ink-3)", fontSize: 14, maxWidth: 560 }}>
          One-time €1 unlocks your full breakdown — forever, no subscription, no account.
        </div>
      </div>

      {/* Teaser reveal — the one unblurred thing */}
      {teaserScore != null || teaserStat ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            background: "var(--surface-muted)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-m)",
            padding: "14px 16px",
          }}
        >
          {teaserScore != null ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div className="label">Your uniqueness</div>
              <div className="mono" style={{ color: "var(--ink)", fontSize: 30, fontWeight: 500, lineHeight: 1 }}>
                {teaserScore}
                <span style={{ color: "var(--ink-3)", fontSize: 16, marginLeft: 4 }}>/100</span>
              </div>
              <div style={{ color: "var(--ink-2)", fontSize: 14 }}>{teaserLabel}</div>
            </div>
          ) : null}
          {teaserStat ? (
            <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.45 }}>
              Preview: <span style={{ color: "var(--ink)" }}>{teaserStat.sentence}</span>
              <span style={{ color: "var(--ink-3)", marginLeft: 6, fontSize: 12 }}>({teaserStat.label})</span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
              Based on your {totalAnswered} answers{catsCompleted ? ` across ${catsCompleted} completed categor${catsCompleted === 1 ? "y" : "ies"}` : ""}.
            </div>
          )}
        </div>
      ) : null}

      {/* Outcome bullets (not features) */}
      <div style={{ display: "grid", gap: 8, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.5 }}>
        <div>• Which of your answers are rare, and which put you in the majority</div>
        <div>• Your uniqueness score broken down by category — where you're weird, where you're normal</div>
        <div>• Filter by gender, age, and country to find your real peer group</div>
        <div>• Downloadable PDF you can keep, share, or revisit as you answer more</div>
      </div>

      {/* Primary CTA — dominant */}
      <div style={{ display: "grid", gap: 8 }}>
        <Button
          onClick={onCheckout}
          disabled={isStripeLoading}
          style={{
            width: "100%",
            fontSize: 16,
            padding: "14px 22px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
          }}
        >
          {isStripeLoading ? "Opening checkout…" : "See my results — €1"}
        </Button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "var(--ink-3)",
            fontSize: 11,
            flexWrap: "wrap",
          }}
        >
          <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: "var(--ink-3)" }}>
              <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span>Your answers stay on your device — we only see the payment.</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "var(--ink-4)",
            fontSize: 11,
            flexWrap: "wrap",
          }}
        >
          <span>Pay with</span>
          <PayBadge label="Apple Pay" />
          <PayBadge label="Google Pay" />
          <PayBadge label="Card" />
          <span style={{ color: "var(--ink-4)" }}>· powered by Stripe</span>
        </div>
        {stripeError ? (
          <div style={{ color: "var(--pale-red-ink)", fontSize: 12, textAlign: "center" }}>{stripeError}</div>
        ) : null}
      </div>

      {/* Tertiary actions: back (link) + restore (collapsed) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 13,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink-3)",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
            fontSize: 13,
          }}
        >
          {isMobilePaywall ? "Back" : "Back to questionnaire"}
        </button>
        <button
          type="button"
          onClick={() => setShowRestoreForm((v) => !v)}
          aria-expanded={showRestoreForm}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink-3)",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
            fontSize: 13,
          }}
        >
          {showRestoreForm ? "Hide" : "Already paid?"}
        </button>
      </div>

      {showRestoreForm ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "12px 14px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-s)",
            background: "var(--bg-raised)",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            Welcome back. Enter the email you paid with to unlock everything.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="email"
              value={restoreEmail}
              onChange={(e) => setRestoreEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                flex: "1 1 240px",
                minWidth: 0,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-s)",
                padding: "9px 11px",
                fontSize: 13,
                background: "var(--bg-raised)",
                color: "var(--ink)",
              }}
            />
            <Button variant="secondary" onClick={onRestore} disabled={isRestoreLoading}>
              {isRestoreLoading ? "Checking…" : "Restore"}
            </Button>
          </div>
          {restoreMsg ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{restoreMsg}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PayBadge({ label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 4,
        border: "1px solid var(--line)",
        background: "var(--bg-raised)",
        color: "var(--ink-3)",
        fontSize: 10,
        letterSpacing: 0.2,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

/* Friendly explainer for what the uniqueness numbers mean */
function UniquenessExplainer() {
  const tiers = [
    { range: "0–20", label: "Very common", note: "most answers are close to the average" },
    { range: "20–40", label: "A bit above average", note: "a few answers drift from the middle" },
    { range: "40–60", label: "Somewhat uncommon", note: "several answers are less typical" },
    { range: "60–80", label: "Rare", note: "your mix of answers is unusual" },
    { range: "80–100", label: "Highly unique", note: "very few people answer this similarly overall" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      style={{
        marginBottom: 20, padding: 22,
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-m)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ maxWidth: 420, flex: "1 1 260px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="label">What is uniqueness?</span>
            <InfoTip align="left">
              For each category, we look at how common or rare your answers are, then average that. The filter you pick (e.g. same age) changes who you’re compared with. Higher = less common overall.
            </InfoTip>
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>
            A 0–100 score for how far your overall pattern sits from the most common mix of answers.
            It’s descriptive, not a grade.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 320px", minWidth: 260 }}>
          {tiers.map(t => (
            <div key={t.range} style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr",
              gap: 12, alignItems: "baseline",
              padding: "4px 0",
            }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.02em" }}>
                {t.range}
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{t.label}</span>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>— {t.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function labelForUniqueness(score) {
  if (score > 0.7) return "highly unique";
  if (score > 0.5) return "rare";
  if (score > 0.35) return "somewhat uncommon";
  if (score > 0.2) return "a bit above average";
  return "very common";
}

function SnapshotCard({ label, value, sub, accent, info }) {
  return (
    <Card padding={18} style={{ minWidth: 0, ...(accent ? { background: "var(--surface-fallback)" } : {}) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span
          className="label"
          title={typeof label === "string" ? label : undefined}
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: "1 1 auto" }}
        >
          {label}
        </span>
        {info && <InfoTip align="left">{info}</InfoTip>}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 34,
          color: "var(--ink)",
          fontWeight: 500,
          margin: "6px 0 4px",
          lineHeight: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
      <div
        title={typeof sub === "string" ? sub : undefined}
        style={{
          fontSize: 12,
          color: "var(--ink-3)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {sub}
      </div>
    </Card>
  );
}

/* Time-spent formatters for the Overview snapshot card */
function formatTimeSpentValue(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  if (mins < 60) {
    const secs = total % 60;
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}

function formatTimeSpentSub(ms) {
  const total = Math.floor((Number(ms) || 0) / 1000);
  if (total <= 0) return "start answering";
  if (total < 120) return "on questions";
  return "focused time";
}

function StageHint({ stage, totalAnswered, dispatch }) {
  const hints = [
    { need: 5, copy: "Add a few more answers to turn on basic comparison charts." },
    { need: 10, copy: "At 10 answers, category charts and distributions open up." },
    { need: 20, copy: "After 20 answers, the uniqueness view is more reliable." },
    { need: 45, copy: "You’ve unlocked the full overview. You can still edit any answer from a category." },
  ];
  const hint = hints[stage];
  if (!hint) return null;
  const remaining = Math.max(0, hint.need - totalAnswered);
  return (
    <Card padding={18} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div className="label">Progress</div>
        <div style={{ fontSize: 15, color: "var(--ink)", marginTop: 6, maxWidth: 600 }}>
          {hint.copy} {remaining > 0 && <span style={{ color: "var(--ink-3)" }}>{remaining} to go.</span>}
        </div>
      </div>
      <Button onClick={() => dispatch({ type: "go", screen: "hub" })}>Continue →</Button>
    </Card>
  );
}

function CategoryCard({ cat, answers, peers, onOpen, onStart }) {
  const vis = QUESTIONS_BY_CAT[cat.id].filter(q => isQuestionVisible(q, answers));
  const answered = vis.filter(q => answerIsFilled(answers[q.id]));
  const pct = vis.length ? answered.length / vis.length : 0;
  const uniq = computeCategoryUniqueness(peers, answers, cat.id);
  const preview = answered[0];
  const previewQ = preview ? QUESTIONS_BY_ID[preview.id] : null;
  let previewText = null;
  if (previewQ && preview) {
    if (["number", "slider"].includes(previewQ.type)) {
      const s = computeNumericStats(peers, previewQ.id, answers[previewQ.id]);
      if (s) previewText = `${previewQ.label.replace(/\?$/, "")}: ${comparisonPhrase("numeric", s)}`;
    } else if (previewQ.type === "multi") {
      const s = computeMultiCategoricalStats(peers, previewQ.id, answers[previewQ.id]);
      if (s) previewText = `${previewQ.label.replace(/\?$/, "")}: ${comparisonPhrase("multi", s)}`;
    } else {
      const s = computeCategoricalStats(peers, previewQ.id, answers[previewQ.id]);
      if (s) previewText = `${previewQ.label.replace(/\?$/, "")}: ${comparisonPhrase("categorical", s)}`;
    }
  }

  const isFresh = answered.length === 0;
  const handlePrimary = (e) => {
    e.stopPropagation();
    if (isFresh && typeof onStart === "function") onStart();
    else if (typeof onOpen === "function") onOpen();
  };
  const handleCardClick = () => {
    if (isFresh && typeof onStart === "function") onStart();
    else if (typeof onOpen === "function") onOpen();
  };

  return (
    <Card
      interactive
      onClick={handleCardClick}
      padding={22}
      style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}
    >
      {/* Uniqueness meter — pinned to top-right corner, doesn't push content down */}
      {uniq && (
        <div style={{ position: "absolute", top: 18, right: 18, zIndex: 1 }}>
          <UniquenessMeter score={uniq.score} size={76} />
        </div>
      )}

      <div style={{ paddingRight: uniq ? 88 : 0 }}>
        <Tag tone={cat.accent}>{cat.title}</Tag>
        <div className="serif" style={{ fontSize: 22, color: "var(--ink)", margin: "12px 0 6px" }}>
          {cat.title}
        </div>
        <div style={{
          fontSize: 13,
          color: "var(--ink-2)",
          minHeight: 42,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {answered.length === 0 ? "No answers in this category yet." : previewText || "Open for charts and per-question detail."}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 18 }}>
        <ProgressBar value={answered.length} max={vis.length} />
        <div style={{
          display: "flex", justifyContent: "flex-start", alignItems: "center",
          marginTop: 8, fontSize: 12, color: "var(--ink-3)",
        }}>
          <span>
            <span className="mono" style={{ color: "var(--ink)" }}>{answered.length}</span>/{vis.length}
          </span>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Button
            variant={isFresh ? "primary" : "secondary"}
            onClick={handlePrimary}
            style={{ flex: 1, minHeight: 40 }}
          >
            {isFresh ? "Start" : "Open detail"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================================
   CATEGORY DETAIL — per-question local + global + edit
   ============================================================================ */

function CategoryDetail({ state, dispatch, peers }) {
  const cat = CATEGORY_BY_ID[state.currentCatId];
  const { answers, segment } = state;
  const segmentedPeers = useMemo(
    () => (cat ? segmentPeers(peers, answers, segment) : peers),
    [peers, answers, segment, cat]
  );
  if (!cat) {
    return <PageShell><Button variant="secondary" onClick={() => dispatch({ type: "go", screen: "overview" })}>← Overview</Button></PageShell>;
  }
  const vis = QUESTIONS_BY_CAT[cat.id].filter(q => isQuestionVisible(q, answers));
  const uniq = computeCategoryUniqueness(segmentedPeers, answers, cat.id);
  return (
    <PageShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Button variant="quiet" onClick={() => dispatch({ type: "go", screen: "overview" })}>← Overview</Button>
      </div>

      <motion.div {...FADE_UP} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tag tone={cat.accent}>{cat.title}</Tag>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
            {String(cat.order).padStart(2, "0")}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginTop: 16 }}>
          <h2 className="serif" style={{ fontSize: 44, color: "var(--ink)", margin: 0 }}>{cat.title}</h2>
          {uniq && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <UniquenessMeter score={uniq.score} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="label">Category uniqueness</span>
                  <InfoTip align="left">
                    Averages how rare your answers are across the {uniq.n} question{uniq.n === 1 ? "" : "s"} you've answered in this category. 0 means very common, 100 means highly unique.
                  </InfoTip>
                </div>
                <div style={{ fontSize: 16, color: "var(--ink)", marginTop: 4, fontWeight: 500 }}>{uniq.label}</div>
              </div>
            </div>
          )}
        </div>
        <p style={{ color: "var(--ink-3)", marginTop: 10 }}>{cat.blurb}</p>
      </motion.div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <span className="label">Questions</span>
        <div className="seg-scroll">
          <SegmentedControl
            value={segment}
            onChange={(v) => dispatch({ type: "setSegment", segment: v })}
            options={[
              { value: "all", label: "All" },
              { value: "gender", label: "Gender" },
              { value: "age", label: "Age" },
              { value: "country", label: "Country" },
            ]}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {vis.map((q, i) => (
          <motion.div key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03, ease: EASE_OUT }}
          >
            <QuestionDetailRow
              q={q}
              cat={cat}
              value={answers[q.id]}
              peers={segmentedPeers}
              dispatch={dispatch}
            />
          </motion.div>
        ))}
      </div>

      <FaqModule variant="category" />
    </PageShell>
  );
}

function QuestionDetailRow({ q, cat, value, peers, dispatch }) {
  const [editing, setEditing] = useState(false);
  const unanswered = !answerIsFilled(value);

  let localStats = null, comparison = null, kind = null;
  if (!unanswered) {
    if (["number", "slider"].includes(q.type)) {
      kind = "numeric";
      localStats = computeNumericStats(peers, q.id, value);
      if (localStats) comparison = comparisonPhrase("numeric", localStats);
    } else if (q.type === "multi") {
      kind = "multi";
      localStats = computeMultiCategoricalStats(peers, q.id, value);
      if (localStats) comparison = comparisonPhrase("multi", localStats);
    } else {
      kind = "categorical";
      localStats = computeCategoricalStats(peers, q.id, value);
      if (localStats) comparison = comparisonPhrase("categorical", localStats);
    }
  }

  return (
    <Card padding={22}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 500 }}>{q.label}</div>
          {!unanswered && (
            <div className="mono" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
              Your answer:{" "}
              <span style={{ color: "var(--ink)" }}>
                {Array.isArray(value) ? value.join(" · ") : String(value)}
                {q.unit ? ` ${q.unit}` : ""}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" variant="secondary" onClick={() => setEditing(e => !e)}>
            {editing ? "Close" : unanswered ? "Answer" : "Edit"}
          </Button>
          {!unanswered && (
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "clearAnswer", qid: q.id })}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_DRAWER }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ paddingTop: 18, marginTop: 18, borderTop: "1px solid var(--line)" }}>
              <AnswerInput q={q} value={value} onChange={(v) => dispatch({ type: "answer", qid: q.id, value: v })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!unanswered && localStats && (
        <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid var(--line)", display: "grid", gap: 24, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {/* Local */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span className="label">Local comparison</span>
              <InfoTip align="left">
                Your answer compared against <strong style={{ color: "var(--btn-solid-fg)" }}>{localStats.n}</strong> other users in the current segment.
                {kind === "numeric"
                  ? " The percentile is the share of users who answered lower than you."
                  : kind === "multi"
                    ? " Each bar is the share of users who included that option in their picks."
                    : " The bars show how often each option was picked."}
              </InfoTip>
              {kind === "numeric" && <PercentileBadge percentile={localStats.percentile} />}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink)", marginBottom: 16, lineHeight: 1.5 }}>
              {comparison}
            </div>
            {kind === "numeric" ? (
              <DistributionHistogram
                values={localStats.vals} userValue={value} min={q.min} max={q.max} unit={q.unit}
              />
            ) : localStats.dist.length <= 6 ? (
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
                <Donut dist={localStats.dist} userOption={value} size={110} />
                <HorizontalBars dist={localStats.dist} userOption={value} />
              </div>
            ) : (
              <HorizontalBars dist={localStats.dist.slice(0, 8)} userOption={value} />
            )}
            {kind === "numeric" && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
                Average <span className="mono" style={{ color: "var(--ink)" }}>{Math.round(localStats.mean * 10) / 10}</span>
                <span style={{ margin: "0 8px" }}>·</span>
                Median <span className="mono" style={{ color: "var(--ink)" }}>{localStats.median}</span>
              </div>
            )}
          </div>

          {/* Global AI */}
          {q.global && (
            <div style={{ padding: 16, background: "var(--surface-fallback)", borderRadius: "var(--radius-m)", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="label">Global benchmark</span>
                <InfoTip align="left">
                  A rounded summary of publicly-available data for this question. Presented in friendly approximate language, not precise statistics.
                </InfoTip>
                <Tag tone="blue">rounded</Tag>
              </div>
              <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5 }}>
                {q.global}
              </div>
            </div>
          )}
        </div>
      )}

      {unanswered && (
        <div style={{ marginTop: 16, padding: 16, background: "var(--surface-fallback)", borderRadius: "var(--radius-m)", fontSize: 13, color: "var(--ink-3)" }}>
          Not answered. {q.global && <span>Global: {q.global}</span>}
        </div>
      )}
    </Card>
  );
}

/* ============================================================================
   APP ROOT
   ============================================================================ */

function Logo({ size = 32, muted = false }) {
  const h = size;
  const textColor = muted ? "var(--ink-3)" : "var(--ink)";
  return (
    <motion.div
      role="img"
      aria-label="Comparizzon logo"
      style={{ display: "inline-flex", alignItems: "baseline", lineHeight: 1, willChange: "transform" }}
      initial={false}
      animate={{ y: [0, -1.1, 0] }}
      transition={{ duration: 5.8, ease: "easeInOut", repeat: Infinity }}
    >
      <motion.span
        style={{
          fontFamily: "'Space Grotesk', var(--sans)",
          fontWeight: 600,
          fontSize: h * 0.95,
          color: textColor,
          letterSpacing: "-0.02em",
        }}
        initial={false}
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 4.2, ease: "easeInOut", repeat: Infinity }}
      >
        Comparizzon
      </motion.span>
    </motion.div>
  );
}

/* ============================================================================
   STATE — reducer + persistent storage
   ============================================================================ */

/* ============================================================================
   DEBUG LOGGER — visible in admin panel so failures surface
   ============================================================================ */

const _debugLog = [];
const _debugListeners = new Set();

function debug(type, msg, data) {
  const entry = {
    ts: new Date().toISOString(),
    type,
    msg: typeof msg === "string" ? msg : String(msg),
    data: data ? (() => { try { return JSON.stringify(data).slice(0, 400); } catch { return "[unserializable]"; } })() : null,
  };
  _debugLog.push(entry);
  if (_debugLog.length > 80) _debugLog.shift();
  _debugListeners.forEach(l => { try { l([..._debugLog]); } catch {} });
  try { console.log(`[avg-io:${type}]`, msg, data || ""); } catch {}
}
function useDebugLog() {
  const [log, setLog] = useState(() => [..._debugLog]);
  useEffect(() => {
    _debugListeners.add(setLog);
    return () => { _debugListeners.delete(setLog); };
  }, []);
  return log;
}

const STORAGE_KEY = "average-io:v1";

function migrateAnswersToMultiChoice(answers) {
  const next = {};
  Object.entries(answers || {}).forEach(([qid, value]) => {
    const q = QUESTIONS_BY_ID[qid];
    if (!q) return;
    const normalized = normalizeAnswerForQuestion(value, q);
    if (normalized != null && normalized !== "") next[qid] = normalized;
  });
  return next;
}

const initialState = {
  screen: "welcome",             // welcome | start | hub | question | overview | category
  answers: {},                   // { [qid]: value }
  order: [],                     // list of qids answered in order (for timeline / back nav)
  currentCatId: null,            // active category when in question flow
  currentQIdx: 0,                // index within visible questions of that category
  segment: "all",                // comparison filter
  hasSeenWelcome: false,
  consent: { contribute: true, intimate: false },
  sessions: [],                  // archive of recorded sessions (upsert by id)
  timeSpentMs: 0,                // cumulative time user has spent on the question screen (tab-visible only)
};

// Read deep-link params from URL once at module load so the initial render can
// land directly on the requested screen — no welcome flash, no exit/enter
// transition, no perceived "URL didn't work" delay.
function computeInitialDeepLinkState() {
  return null;
}

const INITIAL_DEEP_LINK_STATE = computeInitialDeepLinkState();

function reducer(state, action) {
  switch (action.type) {
    case "hydrate": {
      const migratedAnswers = migrateAnswersToMultiChoice(action.payload.answers || {});
      const migratedOrder = (action.payload.order || []).filter((qid) => migratedAnswers[qid] != null);
      const next = {
        ...state,
        ...action.payload,
        answers: migratedAnswers,
        order: migratedOrder,
        sessions: action.payload.sessions || [],
      };
      // When the URL carried a deep-link, the URL takes precedence over saved
      // navigation state — keep the screen/category/index/welcome flag we
      // already seeded at init, so the recipient lands on the shared content.
      if (action.preserveNav) {
        next.screen = state.screen;
        next.currentCatId = state.currentCatId;
        next.currentQIdx = state.currentQIdx;
        next.hasSeenWelcome = state.hasSeenWelcome;
      }
      return next;
    }
    case "go":
      return { ...state, screen: action.screen, ...(action.patch || {}) };
    case "answer": {
      const answers = { ...state.answers, [action.qid]: action.value };
      const order = state.order.includes(action.qid) ? state.order : [...state.order, action.qid];
      return { ...state, answers, order };
    }
    case "clearAnswer": {
      const answers = { ...state.answers };
      delete answers[action.qid];
      return { ...state, answers, order: state.order.filter(id => id !== action.qid) };
    }
    case "setCat":
      return { ...state, currentCatId: action.catId, currentQIdx: action.idx ?? 0 };
    case "nextQ":
      return { ...state, currentQIdx: state.currentQIdx + 1 };
    case "prevQ":
      return { ...state, currentQIdx: Math.max(0, state.currentQIdx - 1) };
    case "setSegment":
      return { ...state, segment: action.segment };
    case "addTime": {
      const add = Math.max(0, Number(action.ms) || 0);
      if (!add) return state;
      return { ...state, timeSpentMs: (state.timeSpentMs || 0) + add };
    }
    case "setConsent":
      return { ...state, consent: { ...state.consent, ...action.patch } };
    case "seenWelcome":
      return { ...state, hasSeenWelcome: true };
    case "archiveSession": {
      // Upsert by id: replace existing or append.
      const snap = action.snapshot;
      const idx = state.sessions.findIndex(s => s.id === snap.id);
      const next = idx >= 0
        ? state.sessions.map((s, i) => (i === idx ? snap : s))
        : [...state.sessions, snap];
      // Cap at 200 sessions to avoid unbounded growth
      const capped = next.length > 200 ? next.slice(next.length - 200) : next;
      return { ...state, sessions: capped };
    }
    case "deleteArchivedSession":
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.id) };
    case "deleteAllArchivedSessions":
      return { ...state, sessions: [] };
    case "reset":
      // Keep sessions & hasSeenWelcome; wipe progress.
      return { ...initialState, hasSeenWelcome: true, sessions: state.sessions };
    default:
      return state;
  }
}

function useAppState() {
  // Seed reducer with the URL-derived deep-link state so the very first render
  // lands on the requested screen instead of flashing the welcome page.
  const [state, dispatch] = useReducer(
    reducer,
    initialState,
    (init) =>
      INITIAL_DEEP_LINK_STATE ? { ...init, ...INITIAL_DEEP_LINK_STATE } : init
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (!cancelled && r?.value) {
          const parsed = JSON.parse(r.value);
          dispatch({
            type: "hydrate",
            payload: parsed,
            preserveNav: Boolean(INITIAL_DEEP_LINK_STATE),
          });
          debug("hydrate", `loaded state (sessions=${(parsed.sessions || []).length}, answers=${Object.keys(parsed.answers || {}).length})`);
        } else {
          debug("hydrate", "no prior state");
        }
      } catch (e) {
        debug("hydrate-error", `failed: ${e && e.message ? e.message : e}`);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist on change — heavily debounced to stay under window.storage rate limits.
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      window.storage.set(STORAGE_KEY, JSON.stringify(state)).catch((e) => {
        debug("persist-error", `failed: ${e && e.message ? e.message : e}`);
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [state, hydrated]);

  return [state, dispatch, hydrated];
}

/* ============================================================================
   ADMIN — session logging + markdown export
   ============================================================================ */

/* ⚠️  CHANGE THIS PASSWORD before sharing the artifact.
   This is hardcoded in the source — anyone with the code can read it.
   It's a light gate for casual prying, not real security. */
const ADMIN_PASSWORD = "stijnbessem";

const SESSION_PREFIX = "session:";
const QUESTIONNAIRE_VERSION = 2;

/* ---------------------------------------------------------------------------
   Webhook relay — sends snapshots to same-origin API.
   Secrets stay on the server (api/log-session.js), never in client code.
   --------------------------------------------------------------------------- */
const WEBHOOK_ENDPOINT = "/api/log-session";
const WEBHOOK_ENABLED = true; // set false to disable POSTs without removing config

function getClientMeta() {
  const meta = { user_agent: "", language: "", timezone: "" };
  try {
    if (typeof navigator !== "undefined") {
      meta.user_agent = navigator.userAgent || "";
      meta.language = navigator.language || "";
    }
    if (typeof Intl !== "undefined") {
      meta.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    }
  } catch (_) {}
  return meta;
}

/** Meta sent to the Sheet webhook only — excludes user agent / device usage (see api/log-session.js). */
function getWebhookMeta() {
  const m = getClientMeta();
  return { language: m.language || "", timezone: m.timezone || "" };
}

async function postSnapshotToWebhook(snapshot) {
  if (!WEBHOOK_ENABLED || !WEBHOOK_ENDPOINT) {
    debug("webhook", "skipped (disabled or missing endpoint)");
    return false;
  }
  const body = JSON.stringify({
    snapshot,
    meta: getWebhookMeta(),
  });

  // Prefer navigator.sendBeacon — purpose-built for fire-and-forget cross-origin
  // telemetry. Handles CORS automatically, no preflight, survives tab close.
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json;charset=UTF-8" });
      const ok = navigator.sendBeacon(WEBHOOK_ENDPOINT, blob);
      if (ok) {
        debug("webhook", `sendBeacon queued for ${snapshot.id.slice(-8)} (${body.length} bytes)`);
        return true;
      }
      debug("webhook-error", `sendBeacon returned false — falling back to fetch`);
    } catch (e) {
      debug("webhook-error", `sendBeacon threw: ${e && e.message ? e.message : e}`);
    }
  }

  // Fallback: standard JSON POST.
  try {
    const res = await fetch(WEBHOOK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body,
      keepalive: true,
    });
    if (!res.ok) {
      debug("webhook-error", `fetch failed (${res.status}) for ${snapshot.id.slice(-8)}`);
      return false;
    }
    debug("webhook", `fetch sent for ${snapshot.id.slice(-8)} (${body.length} bytes)`);
    return true;
  } catch (e) {
    debug("webhook-error", `fetch failed: ${e && e.message ? e.message : e}`);
    return false;
  }
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/* Save a session snapshot. Called on category-complete and on Finish. */
async function saveSessionSnapshot(state, peers, { finished = false, sessionId = null, dispatch = null } = {}) {
  const id = sessionId || `${Date.now()}-${randomId()}`;
  const { answers, segment } = state;

  // Enrich every answered question with its peer stat
  const enriched = {};
  Object.keys(answers).forEach(qid => {
    const q = QUESTIONS_BY_ID[qid];
    if (!q) return;
    const val = answers[qid];
    if (!answerIsFilled(val)) return;
    const segPeers = segmentPeers(peers, answers, segment);
    let stat = null, kind = null;
    if (["number", "slider"].includes(q.type)) {
      kind = "numeric";
      stat = computeNumericStats(segPeers, qid, val);
    } else if (q.type === "multi") {
      kind = "multi";
      stat = computeMultiCategoricalStats(segPeers, qid, val);
    } else if (q.type === "single") {
      kind = "categorical";
      stat = computeCategoricalStats(segPeers, qid, val);
    }
    enriched[qid] = {
      value: val,
      unit: q.unit || null,
      category: q.cat,
      label: q.label,
      type: q.type,
      kind,
      stat: stat ? {
        percentile: stat.percentile ?? null,
        mean: stat.mean != null ? Math.round(stat.mean * 10) / 10 : null,
        median: stat.median ?? null,
        userPct: stat.userPct != null ? Math.round(stat.userPct * 10) / 10 : null,
        overlapPct: stat.overlapPct != null ? Math.round(stat.overlapPct * 10) / 10 : null,
        mostCommon: stat.mostCommon?.option ?? stat.mostCommon ?? null,
        n: stat.n,
      } : null,
    };
  });

  const catUniq = {};
  CATEGORIES.forEach(c => {
    const u = computeCategoryUniqueness(segmentPeers(peers, answers, segment), answers, c.id);
    if (u) catUniq[c.id] = { score: Math.round(u.score * 100) / 100, label: u.label, n: u.n };
  });

  const snapshot = {
    id,
    created_at: new Date().toISOString(),
    finished,
    finished_at: finished ? new Date().toISOString() : null,
    version: QUESTIONNAIRE_VERSION,
    segment_filter: segment,
    total_answered: Object.keys(enriched).length,
    total_questions: QUESTIONS.length,
    categories_completed: Object.keys(catUniq).length,
    answers: enriched,
    category_uniqueness: catUniq,
  };

  // 1) Archive into app state — this is the source of truth for the admin panel.
  //    Goes through the reducer so it gets persisted under STORAGE_KEY with the rest of state.
  //    Note: we used to also write under session:<id> but that doubled every write
  //    and hit window.storage's rate limit. State persistence is sufficient.
  if (dispatch) {
    dispatch({ type: "archiveSession", snapshot });
    debug("save", `archived snapshot ${id.slice(-8)} · ${snapshot.total_answered} answers`);
  }

  // 2) Fire-and-forget to the webhook (independent of local storage).
  postSnapshotToWebhook(snapshot);

  return id;
}

async function listSessions() {
  try {
    const res = await window.storage.list(SESSION_PREFIX);
    const keys = res?.keys || [];
    const sessions = [];
    for (const k of keys) {
      try {
        const r = await window.storage.get(k);
        if (r?.value) sessions.push(JSON.parse(r.value));
      } catch (_) {}
    }
    sessions.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return sessions;
  } catch (_) {
    return [];
  }
}

async function deleteSession(id) {
  try { await window.storage.delete(`${SESSION_PREFIX}${id}`); } catch (_) {}
}
async function deleteAllSessions() {
  const sessions = await listSessions();
  for (const s of sessions) await deleteSession(s.id);
}

/* "Interestingness" score for a single answer — higher = more notable */
function answerInterestingness(entry) {
  if (!entry?.stat) return 0;
  if (entry.kind === "numeric" && entry.stat.percentile != null) {
    // Distance from 50th percentile, 0..1
    return Math.abs(entry.stat.percentile - 50) / 50;
  }
  if (entry.kind === "categorical" && entry.stat.userPct != null) {
    // Rarer pick = more interesting, but the most common answer also has some signal
    const rare = 1 - entry.stat.userPct / 100;
    return rare > 0.6 ? rare : 0; // only flag genuinely uncommon picks
  }
  if (entry.kind === "multi" && entry.stat.overlapPct != null) {
    const rare = 1 - entry.stat.overlapPct / 100;
    return rare > 0.38 ? rare : 0;
  }
  return 0;
}

function formatStoredAnswer(e) {
  if (!e || e.value == null) return "";
  if (Array.isArray(e.value)) return e.value.map((item) => choiceLabel(item)).join(", ");
  return `${choiceLabel(e.value)}${e.unit ? ` ${e.unit}` : ""}`;
}

function choiceLabel(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const v = value.label ?? value.option ?? value.value ?? value.name ?? value.title;
    if (v != null) return String(v);
  }
  return String(value);
}

function phraseForEntry(entry) {
  if (!entry?.stat) return "—";
  if (entry.kind === "numeric") {
    const p = entry.stat.percentile;
    if (p == null) return "—";
    if (p <= 10) return `bottom ${roundPct(p)}% (avg ${entry.stat.mean}${entry.unit ? ` ${entry.unit}` : ""})`;
    if (p <= 30) return `below average — ~${roundPct(p)}th percentile`;
    if (p <= 45) return `a little below average`;
    if (p <= 55) return `about average`;
    if (p <= 70) return `a bit above average`;
    if (p <= 90) return `top ${roundPct(100 - p)}%`;
    return `top ${roundPct(100 - p)}% (avg ${entry.stat.mean}${entry.unit ? ` ${entry.unit}` : ""})`;
  }
  if (entry.kind === "categorical") {
    const pct = entry.stat.userPct;
    if (pct == null) return "—";
    const mc = choiceLabel(entry.stat.mostCommon);
    if (pct >= 50) return `most common answer (~${roundPct(pct)}%)`;
    if (pct >= 25) return `common (~${roundPct(pct)}%; most pick "${mc}")`;
    if (pct >= 10) return `less common (~${roundPct(pct)}%; most pick "${mc}")`;
    return `uncommon (~${roundPct(pct)}%; most pick "${mc}")`;
  }
  if (entry.kind === "multi") {
    const o = entry.stat.overlapPct;
    if (o == null) return "—";
    return `overlap with peers ~${roundPct(o)}% (tags you chose)`;
  }
  return "—";
}

/* Build Markdown with interesting findings up top */
function buildMarkdownExport(sessions) {
  const now = new Date().toISOString();
  const lines = [];
  lines.push(`# Comparizzon — session export`);
  lines.push(``);
  lines.push(`> Generated ${now}`);
  lines.push(`> ${sessions.length} session${sessions.length === 1 ? "" : "s"} recorded in this browser.`);
  lines.push(`> Only sessions saved on this device are included. Multi-device collection requires a backend.`);
  lines.push(``);

  if (sessions.length === 0) {
    lines.push(`_No sessions recorded yet._`);
    return lines.join("\n");
  }

  // Aggregate headline
  const totalAnswers = sessions.reduce((a, s) => a + (s.total_answered || 0), 0);
  const finishedCount = sessions.filter(s => s.finished).length;
  lines.push(`## Summary across all sessions`);
  lines.push(``);
  lines.push(`- Sessions: **${sessions.length}** (${finishedCount} marked finished)`);
  lines.push(`- Total answers recorded: **${totalAnswers}**`);
  lines.push(`- Average answers per session: **${sessions.length ? Math.round(totalAnswers / sessions.length) : 0}**`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  sessions.forEach((s, idx) => {
    const shortId = s.id.slice(-8);
    const answerCount = s.total_answered || 0;
    const completion = Math.round((answerCount / (s.total_questions || 1)) * 100);

    lines.push(`## Session ${idx + 1} · \`${shortId}\``);
    lines.push(``);
    lines.push(`| Field | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Started | ${s.created_at} |`);
    lines.push(`| Finished | ${s.finished ? s.finished_at : "_in progress_"} |`);
    lines.push(`| Completion | ${answerCount} / ${s.total_questions} (${completion}%) |`);
    lines.push(`| Segment filter | \`${s.segment_filter || "all"}\` |`);
    lines.push(`| Questionnaire version | ${s.version} |`);
    lines.push(``);

    // STANDOUT FINDINGS — ranked by interestingness
    const entries = Object.entries(s.answers || {})
      .map(([qid, e]) => ({ qid, ...e, score: answerInterestingness(e) }))
      .sort((a, b) => b.score - a.score);
    const standouts = entries.filter(e => e.score >= 0.35).slice(0, 8);

    if (standouts.length > 0) {
      lines.push(`### Standout findings`);
      lines.push(``);
      standouts.forEach(e => {
        const display = `**${formatStoredAnswer(e)}**`;
        lines.push(`- ${e.label.replace(/\?$/, "")} → ${display} — ${phraseForEntry(e)}`);
      });
      lines.push(``);
    }

    // CATEGORY UNIQUENESS — sorted highest first
    const uniqList = Object.entries(s.category_uniqueness || {})
      .map(([cid, u]) => ({ cat: CATEGORY_BY_ID[cid]?.title || cid, ...u }))
      .sort((a, b) => b.score - a.score);
    if (uniqList.length > 0) {
      lines.push(`### Category uniqueness`);
      lines.push(``);
      uniqList.forEach(u => {
        const bar = "█".repeat(Math.round(u.score * 10)) + "░".repeat(10 - Math.round(u.score * 10));
        lines.push(`- ${u.cat.padEnd(22)} \`${bar}\` ${Math.round(u.score * 100)}/100 — _${u.label}_ (n=${u.n})`);
      });
      lines.push(``);
    }

    // FULL ANSWERS BY CATEGORY
    lines.push(`### Full answers`);
    lines.push(``);
    CATEGORIES.forEach(c => {
      const catEntries = Object.entries(s.answers || {}).filter(([, e]) => e.category === c.id);
      if (catEntries.length === 0) return;
      lines.push(`#### ${c.title}`);
      lines.push(``);
      lines.push(`| Question | Answer | Peer comparison |`);
      lines.push(`| --- | --- | --- |`);
      catEntries.forEach(([, e]) => {
        const ans = formatStoredAnswer(e);
        const phrase = phraseForEntry(e).replace(/\|/g, "\\|");
        const label = e.label.replace(/\|/g, "\\|").replace(/\?$/, "");
        lines.push(`| ${label} | ${ans} | ${phrase} |`);
      });
      lines.push(``);
    });

    lines.push(`---`);
    lines.push(``);
  });

  return lines.join("\n");
}

function buildQuestionnaireTextExport() {
  const now = new Date().toISOString();
  const lines = [];
  lines.push("Comparizzon — questionnaire export");
  lines.push(`Generated: ${now}`);
  lines.push(`Categories: ${CATEGORIES.length}`);
  lines.push(`Questions: ${QUESTIONS.length}`);
  lines.push("");

  CATEGORIES.forEach((cat, catIndex) => {
    const questions = QUESTIONS_BY_CAT[cat.id] || [];
    lines.push(`${String(catIndex + 1).padStart(2, "0")}. ${cat.title}`);
    lines.push(`Category ID: ${cat.id}`);
    lines.push(`Questions in category: ${questions.length}`);
    lines.push("");

    questions.forEach((q, qIndex) => {
      const qType = q.type === "multi" ? "multi-select" : "single-select";
      lines.push(`  ${String(qIndex + 1).padStart(2, "0")}) ${q.label}`);
      lines.push(`     - Question ID: ${q.id}`);
      lines.push(`     - Type: ${qType}`);
      if (q.dependsOn) {
        if (Array.isArray(q.hideIf) && q.hideIf.length > 0) {
          lines.push(`     - Visibility rule: shown if "${q.dependsOn}" is not ${JSON.stringify(q.hideIf)}`);
        } else {
          lines.push(`     - Visibility rule: shown if "${q.dependsOn}" is ${JSON.stringify(q.showIf || [])}`);
        }
      }
      const options = Array.isArray(q.options) ? q.options : [];
      if (options.length > 0) {
        lines.push(`     - Options:`);
        options.forEach((opt, i) => {
          lines.push(`       ${String(i + 1).padStart(2, "0")}. ${choiceLabel(opt)}`);
        });
      } else {
        lines.push(`     - Options: (none)`);
      }
      lines.push("");
    });

    lines.push("------------------------------------------------------------");
    lines.push("");
  });

  return lines.join("\n");
}

function downloadText(filename, text, mime = "text/markdown") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ============================================================================
   UI PRIMITIVES
   ============================================================================ */

function Button({ children, onClick, variant = "primary", size = "md", disabled, style, ...rest }) {
  const base = {
    fontFamily: "var(--sans)",
    fontSize: size === "sm" ? 13 : 14,
    fontWeight: 500,
    letterSpacing: "-0.005em",
    padding: size === "sm" ? "8px 14px" : "11px 20px",
    borderRadius: "var(--radius-s)",
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "transform 160ms var(--ease-out), background 200ms ease, border-color 200ms ease, color 200ms ease",
    display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8,
    userSelect: "none",
  };
  const variants = {
    primary: { background: "var(--btn-solid-bg)", color: "var(--btn-solid-fg)", borderColor: "var(--btn-solid-bg)" },
    secondary: { background: "var(--bg-raised)", color: "var(--ink)", borderColor: "var(--line)" },
    ghost: { background: "transparent", color: "var(--ink-2)", borderColor: "transparent" },
    quiet: { background: "transparent", color: "var(--ink-3)", borderColor: "transparent", padding: "6px 10px" },
  };
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

function Tag({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "var(--tag-neutral-bg)", fg: "var(--tag-neutral-fg)" },
    red: { bg: "var(--pale-red-bg)", fg: "var(--pale-red-ink)" },
    blue: { bg: "var(--pale-blue-bg)", fg: "var(--pale-blue-ink)" },
    green: { bg: "var(--pale-green-bg)", fg: "var(--pale-green-ink)" },
    yellow: { bg: "var(--pale-yellow-bg)", fg: "var(--pale-yellow-ink)" },
    violet: { bg: "var(--pale-violet-bg)", fg: "var(--pale-violet-ink)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px",
      background: t.bg, color: t.fg,
      borderRadius: 9999, fontSize: 10, fontWeight: 500,
      textTransform: "uppercase", letterSpacing: "0.07em",
    }}>{children}</span>
  );
}

function Card({ children, style, interactive, onClick, padding = 24 }) {
  return (
    <motion.div
      whileHover={interactive ? { y: -1, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" } : undefined}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      onClick={onClick}
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-m)",
        padding,
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
    >{children}</motion.div>
  );
}

function ProgressBar({ value, max = 1, height = 3 }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div style={{ width: "100%", height, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
      <motion.div
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        style={{ height: "100%", background: "var(--accent-solid)" }}
      />
    </div>
  );
}

function Chip({ active, onClick, children, small }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        fontFamily: "var(--sans)",
        fontSize: small ? 13 : 14,
        padding: small ? "7px 12px" : "10px 16px",
        background: active ? "var(--btn-solid-bg)" : "var(--bg-raised)",
        color: active ? "var(--btn-solid-fg)" : "var(--ink-2)",
        border: `1px solid ${active ? "var(--btn-solid-bg)" : "var(--line)"}`,
        borderRadius: "var(--radius-s)",
        cursor: "pointer",
        transition: "background 200ms ease, border-color 200ms ease, color 200ms ease",
        textAlign: "left",
      }}
    >{children}</motion.button>
  );
}

function SingleSelect({ options, value, onChange, onSelect = null, columns = 1 }) {
  const handleSelect = (opt) => {
    onChange(opt);
    if (onSelect) onSelect(opt);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {options.map(opt => (
        <Chip key={opt} active={value === opt} onClick={() => handleSelect(opt)}>
          {opt}
        </Chip>
      ))}
    </div>
  );
}

/* PeerFilterMenu — compact "Compare with" dropdown used on the Overview.
   Replaces a 5-chip segmented control that wrapped awkwardly ("Same / gender",
   "Same / age / range"). Reads as a filter, keeps the current selection visible
   in the trigger, and handles long labels on any viewport. */
function PeerFilterMenu({ value, onChange }) {
  const options = [
    { value: "all", label: "Everyone" },
    { value: "gender", label: "Same gender" },
    { value: "age", label: "Same age range" },
    { value: "age_gender", label: "Same age & gender" },
    { value: "country", label: "Same country" },
  ];
  const current = options.find((o) => o.value === value) || options[0];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          minHeight: 36,
          padding: "7px 12px",
          background: "var(--bg-raised)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-s)",
          color: "var(--ink)",
          fontFamily: "var(--sans)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "border-color 160ms ease, background 160ms ease",
        }}
      >
        <span
          style={{
            color: "var(--ink-3)",
            fontSize: 10,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          Compare with
        </span>
        <span style={{ whiteSpace: "nowrap" }}>{current.label}</span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            color: "var(--ink-3)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
            flexShrink: 0,
          }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 30,
              minWidth: 220,
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-m)",
              boxShadow: "0 12px 28px rgba(0,0,0,0.16)",
              padding: 6,
              transformOrigin: "top left",
            }}
          >
            {options.map((opt) => {
              const active = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "var(--surface-muted)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    border: "none",
                    background: active ? "var(--surface-muted)" : "transparent",
                    color: "var(--ink)",
                    fontFamily: "var(--sans)",
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    cursor: "pointer",
                    borderRadius: "var(--radius-s)",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 14,
                      display: "inline-flex",
                      justifyContent: "center",
                      color: "var(--ink)",
                      flexShrink: 0,
                    }}
                  >
                    {active ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12l4 4L19 6"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: "inline-flex",
      padding: 3,
      background: "var(--surface-muted)",
      borderRadius: "var(--radius-s)",
      gap: 2,
    }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500,
              padding: "6px 12px", borderRadius: 5, border: "none",
              background: active ? "var(--bg-raised)" : "transparent",
              color: active ? "var(--ink)" : "var(--ink-3)",
              cursor: "pointer",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
              transition: "background 180ms ease, color 180ms ease",
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange, min = 0, max = 100, step = 1, unit = "" }) {
  const v = value ?? min;
  const clampToRange = (n) => Math.max(min, Math.min(max, n));
  const handleTextChange = (raw) => {
    if (raw === "" || raw === "-" || raw === ".") return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onChange(clampToRange(n));
  };
  const handleCommit = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      onChange(clampToRange(v));
      return;
    }
    onChange(clampToRange(n));
  };
  const inc = () => onChange(Math.min(max, +(v + step).toFixed(2)));
  const dec = () => onChange(Math.max(min, +(v - step).toFixed(2)));
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: "var(--radius-s)", background: "var(--bg-raised)" }}>
      <button onClick={dec} style={stepperBtn}>−</button>
      <div style={{ minWidth: 124, textAlign: "center", fontFamily: "var(--mono)", fontSize: 15, padding: "0 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <input
          type="number"
          value={value == null ? "" : v}
          min={min}
          max={max}
          step={step}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={(e) => handleCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="—"
          style={{
            width: 70,
            border: "none",
            outline: "none",
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: 15,
            color: "var(--ink)",
            background: "transparent",
          }}
        />
        {unit && <span style={{ color: "var(--ink-3)", fontSize: 12 }}>{unit}</span>}
      </div>
      <button onClick={inc} style={stepperBtn}>+</button>
    </div>
  );
}
const stepperBtn = {
  width: 38, height: 38, background: "transparent", border: "none",
  fontSize: 18, color: "var(--ink-2)", cursor: "pointer", fontFamily: "var(--mono)",
};

function Slider({ value, onChange, min, max, step = 1, unit = "" }) {
  const v = value ?? min + (max - min) / 2;
  const pct = ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 32, color: "var(--ink)", fontWeight: 400 }}>
          {value == null ? "—" : v}
          <span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 6 }}>{unit}</span>
        </div>
        <div className="label">{min}–{max} {unit}</div>
      </div>
      <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", height: 2, background: "var(--line)", borderRadius: 999 }} />
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", height: 2, background: "var(--accent-solid)", borderRadius: 999 }}
        />
        <input
          type="range" min={min} max={max} step={step} value={v}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "relative", zIndex: 1, width: "100%", background: "transparent",
            appearance: "none", WebkitAppearance: "none", height: 28, cursor: "pointer",
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 20px; height: 20px; border-radius: 50%;
            background: var(--accent-solid); border: 3px solid var(--bg-raised);
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            cursor: grab;
          }
          input[type=range]::-moz-range-thumb {
            width: 20px; height: 20px; border-radius: 50%;
            background: var(--accent-solid); border: 3px solid var(--bg-raised);
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            cursor: grab;
          }
          input[type=range]:active::-webkit-slider-thumb { cursor: grabbing; }
        `}</style>
      </div>
    </div>
  );
}

function SearchableSelect({ options, value, onChange, placeholder = "Search…" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() =>
    options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 60),
  [options, q]);
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        border: "1px solid var(--line)", borderRadius: "var(--radius-s)",
        padding: "10px 14px", background: "var(--bg-raised)",
      }}>
        <input
          value={open ? q : (value || "")}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQ(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          style={{
            border: "none", outline: "none", background: "transparent",
            fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", flex: 1,
          }}
        />
        {value && !open && (
          <button onClick={() => onChange(null)} style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 14 }}>×</button>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
              background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-s)",
              maxHeight: 280, overflowY: "auto", padding: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            {filtered.length === 0 && <div style={{ padding: 12, color: "var(--ink-3)", fontSize: 13 }}>No matches</div>}
            {filtered.map(o => (
              <button
                key={o}
                onMouseDown={() => { onChange(o); setOpen(false); setQ(""); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 12px", border: "none", background: value === o ? "var(--surface-fallback)" : "transparent",
                  borderRadius: 4, fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", cursor: "pointer",
                }}
              >{o}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
   ADMIN PANEL + UNLOCK HOOK
   ============================================================================ */

function useAdminUnlock() {
  const [unlocked, setUnlocked] = useState(false);    // password accepted
  const [prompting, setPrompting] = useState(false);  // showing password modal

  useEffect(() => {
    const buf = { chars: "", lastAt: 0 };
    const onKey = (e) => {
      // Requires Shift held while typing "admin"
      if (!e.shiftKey) { buf.chars = ""; return; }
      if (e.key.length !== 1) return;
      const now = Date.now();
      if (now - buf.lastAt > 1500) buf.chars = "";
      buf.chars = (buf.chars + e.key.toLowerCase()).slice(-5);
      buf.lastAt = now;
      if (buf.chars === "admin") {
        buf.chars = "";
        if (!unlocked) setPrompting(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked]);

  return { unlocked, prompting, setPrompting, setUnlocked };
}

function AdminModal({ prompting, setPrompting, setUnlocked, unlocked, sessions = [], dispatch }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | "sending" | "sent" | "error"
  const [showDebug, setShowDebug] = useState(false);
  const [logCopied, setLogCopied] = useState(false);
  const log = useDebugLog();

  // Sessions are now passed as a prop sourced from app state (reliable).
  // Sort newest first for display.
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [sessions]
  );

  // Format the whole debug log + environment into a plain-text block for sharing
  const buildLogText = () => {
    const now = new Date().toISOString();
    const env = typeof window !== "undefined" ? {
      userAgent: navigator?.userAgent || "",
      language: navigator?.language || "",
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location?.href || "",
    } : {};
    const lines = [];
    lines.push("# Comparizzon debug log");
    lines.push(`generated: ${now}`);
    lines.push(`app_version: ${APP_VERSION} (${APP_BUILD})`);
    lines.push(`webhook_endpoint: ${WEBHOOK_ENDPOINT || "(none)"}`);
    lines.push(`webhook_enabled: ${WEBHOOK_ENABLED}`);
    lines.push(`sessions_archived: ${sortedSessions.length}`);
    lines.push(`user_agent: ${env.userAgent}`);
    lines.push(`language: ${env.language}`);
    lines.push(`timezone: ${env.timezone}`);
    lines.push(`viewport: ${env.viewport}`);
    lines.push(`url: ${env.url}`);
    lines.push("");
    lines.push("# events (oldest → newest)");
    if (log.length === 0) {
      lines.push("(no events)");
    } else {
      log.forEach(e => {
        lines.push(`${e.ts}  ${e.type.padEnd(16)}  ${e.msg}${e.data ? ` · ${e.data}` : ""}`);
      });
    }
    return lines.join("\n");
  };

  const copyLog = async () => {
    const text = buildLogText();
    try {
      await navigator.clipboard.writeText(text);
      setLogCopied(true);
      setTimeout(() => setLogCopied(false), 1800);
    } catch (_) {
      // Fallback: select hidden textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setLogCopied(true); setTimeout(() => setLogCopied(false), 1800); } catch(__) {}
      document.body.removeChild(ta);
    }
  };

  const downloadLog = () => {
    const text = buildLogText();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    downloadText(`average-io-debug-${stamp}.txt`, text, "text/plain");
  };

  const runWebhookTest = async () => {
    setTestStatus("sending");
    const testId = `test-webhook-${Date.now()}`;
    const snapshot = {
      id: testId,
      created_at: new Date().toISOString(),
      finished: false,
      finished_at: null,
      version: QUESTIONNAIRE_VERSION,
      segment_filter: "all",
      total_answered: 1,
      total_questions: QUESTIONS.length,
      categories_completed: 0,
      answers: {
        _test: { value: "hello from admin panel", category: "meta", label: "Webhook test", type: "text", kind: null, stat: null },
      },
      category_uniqueness: {},
    };
    try {
      const ok = await postSnapshotToWebhook(snapshot);
      if (!ok) throw new Error("webhook relay returned non-ok");
      setTestStatus("sent");
      setTimeout(() => setTestStatus(null), 6000);
    } catch (_) {
      setTestStatus("error");
      setTimeout(() => setTestStatus(null), 6000);
    }
  };

  const open = prompting || unlocked;

  const tryUnlock = () => {
    if (pw === ADMIN_PASSWORD) {
      setUnlocked(true);
      setPrompting(false);
      setErr(false);
      setPw("");
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 1200);
    }
  };

  const close = () => {
    setPrompting(false);
    setUnlocked(false);
    setPw("");
  };

  const exportMd = () => {
    const md = buildMarkdownExport(sortedSessions);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    downloadText(`average-io-sessions-${stamp}.md`, md, "text/markdown");
  };

  const exportQuestionnaireTxt = () => {
    const text = buildQuestionnaireTextExport();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    downloadText(`average-io-questionnaire-${stamp}.txt`, text, "text/plain");
  };

  const deleteOne = (id) => {
    if (dispatch) dispatch({ type: "deleteArchivedSession", id });
  };
  const deleteAll = () => {
    if (!dispatch) return;
    if (confirm(`Delete all ${sortedSessions.length} sessions? This cannot be undone.`)) {
      dispatch({ type: "deleteAllArchivedSessions" });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="admin-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "var(--modal-scrim)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <motion.div
            key="admin-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-l)",
              padding: 28,
              width: "min(720px, 100%)",
              maxHeight: "86vh",
              overflowY: "auto",
              boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            }}
          >
            {!unlocked ? (
              <div>
                <div className="label">Admin</div>
                <h3 className="serif" style={{ fontSize: 28, color: "var(--ink)", margin: "10px 0 6px" }}>
                  Enter admin password
                </h3>
                <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "0 0 20px" }}>
                  This gate is cosmetic — the password is in the source. Not real security.
                </p>
                <input
                  type="password"
                  autoFocus
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
                  placeholder="password"
                  style={{
                    width: "100%", padding: "12px 14px",
                    border: `1px solid ${err ? "var(--pale-red-ink)" : "var(--line)"}`,
                    borderRadius: "var(--radius-s)",
                    background: err ? "var(--pale-red-bg)" : "var(--bg-raised)",
                    color: "var(--ink)",
                    fontFamily: "var(--mono)", fontSize: 14,
                    outline: "none",
                    transition: "border-color 200ms ease, background 200ms ease",
                  }}
                />
                {err && <div style={{ fontSize: 12, color: "var(--pale-red-ink)", marginTop: 8 }}>Wrong password.</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                  <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
                  <Button size="sm" onClick={tryUnlock}>Unlock →</Button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 6 }}>
                  <div>
                    <div className="label">Admin panel</div>
                    <h3 className="serif" style={{ fontSize: 28, color: "var(--ink)", margin: "6px 0 0" }}>
                      Recorded sessions
                    </h3>
                  </div>
                  <Button size="sm" variant="ghost" onClick={close}>Close</Button>
                </div>

                <div style={{
                  padding: "10px 14px", background: "var(--surface-fallback)",
                  border: "1px solid var(--line)", borderRadius: "var(--radius-s)",
                  fontSize: 12, color: "var(--ink-3)", margin: "16px 0 12px", lineHeight: 1.5,
                }}>
                  This panel lists sessions saved on <strong style={{ color: "var(--ink)" }}>this browser</strong>.
                  {WEBHOOK_ENABLED && WEBHOOK_ENDPOINT ? (
                    <> All sessions are also sent to the Google Sheet webhook — check the Sheet for the full cross-device log.</>
                  ) : (
                    <> Webhook disabled — no cross-device logging.</>
                  )}
                </div>

                {WEBHOOK_ENABLED && WEBHOOK_ENDPOINT && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    margin: "0 0 20px", padding: "10px 14px",
                    border: "1px dashed var(--line)", borderRadius: "var(--radius-s)",
                    background: "var(--bg-raised)",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", flex: "1 1 200px", minWidth: 0 }}>
                      Send a hardcoded test row to the webhook. Then check your Sheet — you should see a row with session_id starting <code className="mono" style={{ fontSize: 11, background: "var(--surface-muted)", padding: "1px 4px", borderRadius: 3 }}>test-webhook-…</code>
                    </span>
                    <Button size="sm" variant="secondary" onClick={runWebhookTest} disabled={testStatus === "sending"}>
                      {testStatus === "sending" ? "Sending…" : "Test webhook"}
                    </Button>
                    {testStatus === "sent" && (
                      <span style={{ fontSize: 12, color: "var(--pale-green-ink)", background: "var(--pale-green-bg)", padding: "3px 9px", borderRadius: 9999, fontWeight: 500 }}>
                        Sent — check your Sheet
                      </span>
                    )}
                    {testStatus === "error" && (
                      <span style={{ fontSize: 12, color: "var(--pale-red-ink)", background: "var(--pale-red-bg)", padding: "3px 9px", borderRadius: 9999, fontWeight: 500 }}>
                        Request failed — check console
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>
                    {sortedSessions.length} session{sortedSessions.length === 1 ? "" : "s"}
                  </span>
                  <div style={{ flex: 1 }} />
                  <Button size="sm" variant="secondary" onClick={exportQuestionnaireTxt}>
                    Export questionnaire (.txt) ↓
                  </Button>
                  <Button size="sm" onClick={exportMd} disabled={sortedSessions.length === 0}>
                    Export all (.md) ↓
                  </Button>
                </div>

                {sortedSessions.length === 0 ? (
                  <div style={{ padding: 24, color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>
                    No sessions recorded yet. Answer a few questions and one will appear here automatically.
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-s)", overflow: "hidden" }}>
                    {sortedSessions.map((s, i) => (
                      <div key={s.id} style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto auto",
                        gap: 14,
                        padding: "12px 14px",
                        borderTop: i === 0 ? "none" : "1px solid var(--line)",
                        alignItems: "center",
                      }}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "var(--ink)" }}>
                            {new Date(s.created_at).toLocaleString()}
                            {s.finished && <Tag tone="green"> finished </Tag>}
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>
                            {s.id.slice(-8)} · {s.total_answered}/{s.total_questions} answers
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          {Math.round((s.total_answered / (s.total_questions || 1)) * 100)}%
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => deleteOne(s.id)}>Delete</Button>
                      </div>
                    ))}
                  </div>
                )}

                {sortedSessions.length > 0 && (
                  <div style={{ marginTop: 16, textAlign: "right" }}>
                    <Button size="sm" variant="ghost" onClick={deleteAll} style={{ color: "var(--pale-red-ink)" }}>
                      Delete all sessions
                    </Button>
                  </div>
                )}

                {/* Debug log viewer */}
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setShowDebug(v => !v)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "transparent", border: "none", padding: 0,
                        fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)",
                        fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      <span style={{ transform: showDebug ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 180ms ease", display: "inline-block" }}>›</span>
                      Debug log ({log.length}) — storage, webhook, errors
                    </button>
                    <div style={{ flex: 1 }} />
                    <Button size="sm" variant="ghost" onClick={copyLog} disabled={log.length === 0}>
                      {logCopied ? "Copied ✓" : "Copy"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={downloadLog} disabled={log.length === 0}>
                      Download ↓
                    </Button>
                  </div>
                  <AnimatePresence>
                    {showDebug && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: EASE_DRAWER }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{
                          marginTop: 12,
                          maxHeight: 220, overflowY: "auto",
                          background: "var(--surface-muted)", color: "var(--ink-2)",
                          borderRadius: "var(--radius-s)",
                          padding: 10,
                          fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.6,
                        }}>
                          {log.length === 0 ? (
                            <div style={{ color: "#B4B2AC" }}>(no events yet — answer a question to see activity)</div>
                          ) : log.slice().reverse().map((e, i) => {
                            const colour = e.type.includes("error") ? "#F9A1A4"
                              : e.type === "webhook" ? "#9BCDFF"
                              : e.type === "save" ? "#B8E6BA"
                              : "#EAEAEA";
                            return (
                              <div key={i} style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: "#787774", minWidth: 78 }}>{e.ts.slice(11, 19)}</span>
                                <span style={{ color: colour, minWidth: 100 }}>{e.type}</span>
                                <span style={{ flex: 1 }}>{e.msg}{e.data ? ` · ${e.data}` : ""}</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--ink-4)", lineHeight: 1.6 }}>
                  Unlock anywhere: hold <kbd style={kbdStyle}>Shift</kbd> and type <kbd style={kbdStyle}>a</kbd><kbd style={kbdStyle}>d</kbd><kbd style={kbdStyle}>m</kbd><kbd style={kbdStyle}>i</kbd><kbd style={kbdStyle}>n</kbd>.
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const kbdStyle = {
  display: "inline-block",
  padding: "1px 5px",
  background: "var(--surface-fallback)",
  border: "1px solid var(--line)",
  borderRadius: 3,
  fontFamily: "var(--mono)",
  fontSize: 10,
  color: "var(--ink-2)",
  margin: "0 1px",
};

/* ============================================================================
   SHARE SNAPSHOT — canvas render, modal, download, copy, native share
   ============================================================================ */

/* Gather the data that goes on the card */
function buildSnapshotData(answers, peers, segment, timeSpentMs = 0) {
  const segPeers = segmentPeers(peers, answers, segment);

  // Enrich each answered question the same way the export does
  const entries = [];
  Object.keys(answers).forEach(qid => {
    const q = QUESTIONS_BY_ID[qid];
    if (!q) return;
    const v = answers[qid];
    if (!answerIsFilled(v)) return;
    let kind = null, stat = null;
    if (["number", "slider"].includes(q.type)) {
      kind = "numeric";
      stat = computeNumericStats(segPeers, qid, v);
    } else if (q.type === "multi") {
      kind = "multi";
      stat = computeMultiCategoricalStats(segPeers, qid, v);
    } else if (q.type === "single") {
      kind = "categorical";
      stat = computeCategoricalStats(segPeers, qid, v);
    }
    entries.push({
      qid, q, value: v, kind, stat,
      score: answerInterestingness({ kind, stat, unit: q.unit }),
    });
  });

  const standouts = entries
    .filter(e => e.score >= 0.3 && e.stat)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Fallbacks: if fewer than 4 standouts, pad with highest-info answers
  if (standouts.length < 4) {
    const rest = entries
      .filter(e => !standouts.includes(e) && e.stat)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4 - standouts.length);
    standouts.push(...rest);
  }

  // Category uniqueness
  const catUniq = CATEGORIES
    .map(c => ({ cat: c, u: computeCategoryUniqueness(segPeers, answers, c.id) }))
    .filter(x => x.u);
  const overallUniq = catUniq.length > 0
    ? catUniq.reduce((a, b) => a + b.u.score, 0) / catUniq.length
    : null;

  const totalAnswered = entries.length;
  const totalCategories = CATEGORIES.length;
  const catsCompleted = CATEGORIES.filter(c => {
    const vis = QUESTIONS_BY_CAT[c.id].filter(q => isQuestionVisible(q, answers));
    return vis.length > 0 && vis.every(q => answerIsFilled(answers[q.id]));
  }).length;
  const totalVisible = QUESTIONS.filter((q) => isQuestionVisible(q, answers)).length;
  const timeSpentLabel = formatTimeSpentValue(timeSpentMs);

  return {
    entries,
    standouts,
    catUniq,
    overallUniq,
    totalAnswered,
    catsCompleted,
    totalCategories,
    totalVisible,
    timeSpentMs,
    timeSpentLabel,
  };
}

/** Human-readable labels for peer comparison segment (matches overview SegmentedControl). */
const SEGMENT_LABELS = {
  all: "Everyone",
  gender: "Same gender",
  age: "Same age range",
  age_gender: "Same age and gender",
  country: "Same country",
};

function pdfSafeText(str) {
  if (str == null) return "";
  return String(str)
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRawAnswerForPdf(val, q) {
  if (val == null || val === "") return "";
  if (Array.isArray(val)) return val.map((item) => choiceLabel(item)).join(", ");
  const u = q?.unit ? ` ${q.unit}` : "";
  return `${choiceLabel(val)}${u}`;
}

/**
 * Multi-page PDF: summary, uniqueness, standouts, and full Q&A by category.
 * Uses jsPDF (dynamic import). Text is ASCII-safe for standard PDF fonts.
 */
async function buildOverviewPdfBlob(answers, peers, segment, timeSpentMs = 0) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxW = pageW - margin * 2;
  let y = margin;

  const data = buildSnapshotData(answers, peers, segment, timeSpentMs);
  const segmentLabel = SEGMENT_LABELS[segment] || segment || "Everyone";
  const visibleTotal = data.totalVisible;

  const ensureRoom = (neededMm) => {
    if (y + neededMm > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (text, fontSize, fontStyle = "normal") => {
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(pdfSafeText(text), maxW);
    const lh = fontSize * 0.52;
    lines.forEach((line) => {
      ensureRoom(lh + 0.5);
      doc.text(line, margin, y);
      y += lh;
    });
  };

  const heading = (text, fontSize = 11.5) => {
    ensureRoom(fontSize + 6);
    y += 3;
    writeLines(text, fontSize, "bold");
    y += 2;
  };

  const drawBar = (x, barY, width, height, ratio, tone = [17, 17, 17]) => {
    const safeRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
    doc.setDrawColor(224, 224, 224);
    doc.setFillColor(247, 247, 247);
    doc.roundedRect(x, barY, width, height, 1.2, 1.2, "FD");
    if (safeRatio <= 0) return;
    doc.setFillColor(tone[0], tone[1], tone[2]);
    doc.roundedRect(x, barY, Math.max(1.2, width * safeRatio), height, 1.2, 1.2, "F");
  };

  const writeScoreLine = (label, score, tone) => {
    ensureRoom(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(47, 52, 55);
    doc.text(pdfSafeText(label), margin, y + 3.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 17, 17);
    doc.text(`${Math.round(score * 100)}/100`, pageW - margin, y + 3.5, { align: "right" });
    y += 5.2;
    drawBar(margin, y, maxW, 3.2, score, tone);
    y += 6.2;
  };

  // Dark hero header band — tight top padding above wordmark
  const headerH = 26;
  ensureRoom(headerH + 4);
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageW, y + headerH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  try { doc.setCharSpace(-0.2); } catch (_) {}
  doc.text("Comparizzon", margin, y + 11);
  try { doc.setCharSpace(0); } catch (_) {}

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 178, 172);
  doc.text("see how you compare to real people", margin, y + 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(180, 178, 172);
  doc.text("COMPARIZZON.COM", pageW - margin, y + 7, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 147, 140);
  doc.text(
    `Generated ${new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}`,
    pageW - margin,
    y + 14,
    { align: "right" }
  );

  y += headerH + 6;
  doc.setTextColor(17, 17, 17);

  writeLines("Your overview report", 13, "bold");
  writeLines(
    `Generated on your device · Nothing in this PDF was uploaded to our servers.`,
    8.5
  );
  y += 3;
  writeLines(`Comparison group: ${segmentLabel}`, 10, "bold");
  y += 4;

  if (data.totalAnswered === 0) {
    heading("No answers yet");
    writeLines("Answer at least one question, then download again to get your full overview.", 10);
    return doc.output("blob");
  }

  heading("Summary");
  writeLines(`Questions answered: ${data.totalAnswered} (of ${visibleTotal} visible for you)`, 10);
  writeLines(`Time on questions: ${data.timeSpentLabel}`, 10);
  writeLines(`Categories fully completed: ${data.catsCompleted} of ${CATEGORIES.length}`, 10);
  if (data.overallUniq != null) {
    writeLines(
      `Overall uniqueness (for this peer group): ${Math.round(data.overallUniq * 100)} / 100 — ${pdfSafeText(labelForUniqueness(data.overallUniq))}`,
      10
    );
  }
  y += 3;

  if (data.overallUniq != null) {
    heading("Score visualization");
    writeScoreLine("Overall uniqueness", data.overallUniq, [17, 17, 17]);
    data.catUniq
      .slice()
      .sort((a, b) => b.u.score - a.u.score)
      .forEach(({ cat, u }, idx) => {
        const tone = idx < 2 ? [52, 101, 56] : idx >= data.catUniq.length - 2 ? [159, 47, 45] : [31, 108, 159];
        writeScoreLine(cat.title, u.score, tone);
      });
    y += 2;
  }

  if (data.catUniq.length > 0) {
    heading("Uniqueness by category");
    data.catUniq.forEach(({ cat, u }) => {
      writeLines(`${cat.title}: ${Math.round(u.score * 100)}/100 — ${pdfSafeText(u.label)} (n=${u.n})`, 9.5);
    });
    y += 3;
  }

  heading("All answers by category");
  writeLines("Every visible answer you gave, with the same peer comparison note where available.", 8.5);
  y += 2;

  CATEGORIES.forEach((cat) => {
    const qs = QUESTIONS_BY_CAT[cat.id].filter(
      (q) => isQuestionVisible(q, answers) && answerIsFilled(answers[q.id])
    );
    if (qs.length === 0) return;
    heading(cat.title, 11);
    qs.forEach((q) => {
      const raw = formatRawAnswerForPdf(answers[q.id], q);
      const entry = data.entries.find((e) => e.qid === q.id);
      const phrase = entry?.stat
        ? phraseForEntry({ kind: entry.kind, stat: entry.stat, unit: q.unit })
        : "";
      writeLines(`${pdfSafeText(q.label.replace(/\?$/, ""))}`, 9.5, "bold");
      writeLines(`${pdfSafeText(raw)}`, 9);
      if (phrase) writeLines(`Peers: ${pdfSafeText(phrase)}`, 8);
      y += 1.5;
    });
    y += 2;
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  ensureRoom(10);
  y += 4;
  doc.text("Comparizzon · comparizzon.com", margin, y);

  return doc.output("blob");
}

async function downloadOverviewPdf(answers, peers, segment, timeSpentMs = 0) {
  const blob = await buildOverviewPdfBlob(answers, peers, segment, timeSpentMs);
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `average-io-overview-${stamp}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/* Short headline for each standout, shown on the card */
function cardLineFor(e) {
  if (!e.stat) return null;
  const label = e.q.label.replace(/\?$/, "");
  let phrase = "";
  if (e.kind === "numeric") {
    const p = e.stat.percentile;
    if (p == null) return null;
    if (p <= 10) phrase = `Bottom ${roundPct(p)}%`;
    else if (p <= 30) phrase = `Below average (~${roundPct(p)}th pct)`;
    else if (p <= 45) phrase = "A little below average";
    else if (p <= 55) phrase = "About average";
    else if (p <= 70) phrase = "A bit above average";
    else if (p <= 90) phrase = `Top ${roundPct(100 - p)}%`;
    else phrase = `Top ${roundPct(100 - p)}% — rare`;
  } else if (e.kind === "categorical") {
    const pct = e.stat.userPct;
    if (pct == null) return null;
    if (pct >= 50) phrase = `Most common (${friendlyShare(pct)})`;
    else if (pct >= 25) phrase = `Common (${friendlyShare(pct)})`;
    else if (pct >= 10) phrase = `Less common (~${roundPct(pct)}%)`;
    else phrase = `Uncommon — only ${friendlyShare(pct)}`;
  } else if (e.kind === "multi") {
    const o = e.stat.overlapPct;
    if (o == null) return null;
    if (o >= 58) phrase = `High overlap (${friendlyShare(o)} share a pick)`;
    else if (o >= 35) phrase = `Moderate overlap (~${roundPct(o)}%)`;
    else phrase = `Distinct picks (~${roundPct(o)}% overlap)`;
  }
  const valDisplay = Array.isArray(e.value) ? e.value.join(", ") : `${e.value}${e.q.unit ? ` ${e.q.unit}` : ""}`;
  return { label, val: valDisplay, phrase };
}

/* Short phrase for the overall uniqueness number on the card */
function uniquenessHeadline(score) {
  if (score == null) return "Keep answering";
  if (score > 0.7) return "Highly unique";
  if (score > 0.5) return "Rare";
  if (score > 0.35) return "Somewhat uncommon";
  if (score > 0.2) return "A bit above average";
  return "Very common";
}

/* =========================================================================
   Canvas renderer
   ========================================================================= */

const CARD_W = 1080;
const CARD_H = 1350;
const CARD_BG = "#FBFBFA";
const CARD_INK = "#111111";
const CARD_INK2 = "#2F3437";
const CARD_INK3 = "#787774";
const CARD_INK4 = "#B4B2AC";
const CARD_LINE = "#EAEAEA";

const CARD_SERIF = `'Fraunces', 'Source Serif Pro', Georgia, serif`;
const CARD_SANS = `'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
const CARD_MONO = `'JetBrains Mono', 'SF Mono', Menlo, monospace`;

async function ensureFontsReady() {
  // Browsers expose document.fonts.ready which resolves once all declared fonts are loaded
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch (_) {}
}

/* Wrap text into lines that fit a max width. Returns array of lines. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* Draws the Comparizzon wordmark — matches the start page Logo (no bell curve, no .io) */
function drawLogo(ctx, x, y, size = 28) {
  ctx.save();
  ctx.fillStyle = CARD_INK;
  ctx.font = `600 ${size}px 'Space Grotesk', ${CARD_SANS}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Comparizzon", x, y);
  ctx.restore();
}

async function renderSnapshotCanvas(data, opts = {}) {
  await ensureFontsReady();

  const padX = 80;

  // Order entries by category order, then question order within category
  const entries = data.entries
    .slice()
    .sort((a, b) => {
      const ao = CATEGORY_BY_ID[a.q.cat]?.order ?? 999;
      const bo = CATEGORY_BY_ID[b.q.cat]?.order ?? 999;
      if (ao !== bo) return ao - bo;
      const ai = QUESTIONS_BY_CAT[a.q.cat]?.findIndex((q) => q.id === a.qid) ?? 0;
      const bi = QUESTIONS_BY_CAT[b.q.cat]?.findIndex((q) => q.id === b.qid) ?? 0;
      return ai - bi;
    });

  // === Layout constants ===
  const headerH = 240;            // dark hero band
  const heroBlockH = 320;         // uniqueness + 3 stats two-column
  const dividerGap = 60;
  const catRowH = 64;
  const catSectionH = 70 + data.catUniq.length * catRowH + 30;
  const perQRowH = 108;
  const perCatGroupHeader = 36;
  const groupedCount = entries.length;
  const distinctCats = new Set(entries.map((e) => e.q.cat)).size;
  const perQSectionH =
    70 +
    distinctCats * perCatGroupHeader +
    groupedCount * perQRowH +
    40;
  const footerH = 120;

  const totalH = headerH + heroBlockH + catSectionH + perQSectionH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, CARD_W, canvas.height);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const innerW = CARD_W - padX * 2;

  // ============================================================
  // 1. Dark hero header band
  // ============================================================
  ctx.fillStyle = "#0F0F0F";
  ctx.fillRect(0, 0, CARD_W, headerH);

  // Top tag (mono kicker)
  ctx.fillStyle = "#B4B2AC";
  ctx.font = `500 14px ${CARD_MONO}`;
  ctx.textAlign = "left";
  ctx.fillText("YOUR RESULTS", padX, 70);

  ctx.textAlign = "right";
  ctx.fillText("COMPARIZZON.COM", CARD_W - padX, 70);

  // Wordmark — large, generous breathing room above
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 84px 'Space Grotesk', ${CARD_SANS}`;
  ctx.fillText("Comparizzon", padX, 165);

  // Tagline
  ctx.fillStyle = "#9F9D98";
  ctx.font = `400 24px ${CARD_SERIF}`;
  ctx.fillText("see how you compare to real people", padX, 200);

  // Generated date, right-aligned, light
  ctx.textAlign = "right";
  ctx.fillStyle = "#9F9D98";
  ctx.font = `400 16px ${CARD_SANS}`;
  ctx.fillText(
    `Generated ${new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}`,
    CARD_W - padX,
    200
  );
  ctx.textAlign = "left";

  let y = headerH + 60;

  // ============================================================
  // 2. Hero block — uniqueness (left) + stats stacked (right)
  // ============================================================
  const heroLeftW = innerW * 0.48;
  const heroRightX = padX + innerW * 0.52;

  // Left: kicker + big number + label
  ctx.fillStyle = CARD_INK3;
  ctx.font = `500 13px ${CARD_MONO}`;
  ctx.fillText("YOUR UNIQUENESS", padX, y);

  const uniqPct = data.overallUniq != null ? Math.round(data.overallUniq * 100) : null;
  const bigText = uniqPct != null ? `${uniqPct}` : "—";

  ctx.fillStyle = CARD_INK;
  ctx.font = `400 168px ${CARD_SERIF}`;
  ctx.fillText(bigText, padX, y + 150);

  if (uniqPct != null) {
    const bigW = ctx.measureText(bigText).width;
    ctx.font = `400 32px ${CARD_SERIF}`;
    ctx.fillStyle = CARD_INK3;
    ctx.fillText("/100", padX + bigW + 14, y + 150);
  }

  ctx.fillStyle = CARD_INK;
  ctx.font = `500 22px ${CARD_SANS}`;
  ctx.fillText(uniquenessHeadline(data.overallUniq), padX, y + 192);

  ctx.fillStyle = CARD_INK3;
  ctx.font = `400 16px ${CARD_SANS}`;
  ctx.fillText(
    `Across ${data.catUniq.length} categor${data.catUniq.length === 1 ? "y" : "ies"} · vs. peers`,
    padX,
    y + 218
  );

  // Right: 3 small editorial stat pairs
  const statPairs = [
    {
      label: "QUESTIONS ANSWERED",
      value: String(data.totalAnswered),
      sub: data.totalVisible ? `of ${data.totalVisible} visible to you` : "",
    },
    {
      label: "TIME ON QUESTIONS",
      value: data.timeSpentLabel || "—",
      sub: data.totalAnswered > 0 ? "focused time" : "start answering",
    },
    {
      label: "CATEGORIES COMPLETED",
      value: `${data.catsCompleted}/${data.totalCategories}`,
      sub: data.catsCompleted > 0 ? "fully answered" : "in progress",
    },
  ];

  // Vertical separator between hero halves
  ctx.strokeStyle = CARD_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(heroRightX - 30, y - 8);
  ctx.lineTo(heroRightX - 30, y + 232);
  ctx.stroke();

  let statY = y + 24;
  statPairs.forEach((s, i) => {
    if (i > 0) {
      ctx.strokeStyle = CARD_LINE;
      ctx.beginPath();
      ctx.moveTo(heroRightX, statY - 22);
      ctx.lineTo(CARD_W - padX, statY - 22);
      ctx.stroke();
    }
    ctx.fillStyle = CARD_INK3;
    ctx.font = `500 12px ${CARD_MONO}`;
    ctx.fillText(s.label, heroRightX, statY);

    ctx.fillStyle = CARD_INK;
    ctx.font = `400 48px ${CARD_SERIF}`;
    ctx.fillText(s.value, heroRightX, statY + 46);

    if (s.sub) {
      ctx.fillStyle = CARD_INK3;
      ctx.font = `400 14px ${CARD_SANS}`;
      ctx.fillText(s.sub, heroRightX, statY + 68);
    }
    statY += 80;
  });

  y += heroBlockH - dividerGap;

  // Hairline + section gap
  ctx.strokeStyle = CARD_LINE;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(CARD_W - padX, y);
  ctx.stroke();
  y += 50;

  // ============================================================
  // 3. Uniqueness by category — bars
  // ============================================================
  ctx.fillStyle = CARD_INK3;
  ctx.font = `500 13px ${CARD_MONO}`;
  ctx.fillText("UNIQUENESS BY CATEGORY", padX, y);

  ctx.fillStyle = CARD_INK4;
  ctx.font = `400 13px ${CARD_SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`${data.catUniq.length} of ${data.totalCategories}`, CARD_W - padX, y);
  ctx.textAlign = "left";
  y += 36;

  const sortedCatUniq = data.catUniq.slice().sort((a, b) => b.u.score - a.u.score);
  sortedCatUniq.forEach(({ cat, u }) => {
    const score = Math.round(u.score * 100);

    ctx.fillStyle = CARD_INK;
    ctx.font = `500 22px ${CARD_SANS}`;
    ctx.textAlign = "left";
    ctx.fillText(cat.title, padX, y + 24);

    ctx.fillStyle = CARD_INK;
    ctx.font = `500 22px ${CARD_SANS}`;
    ctx.textAlign = "right";
    ctx.fillText(`${score}`, CARD_W - padX - 38, y + 24);

    ctx.fillStyle = CARD_INK3;
    ctx.font = `400 16px ${CARD_SANS}`;
    ctx.fillText("/100", CARD_W - padX, y + 24);
    ctx.textAlign = "left";

    const barY = y + 38;
    const barW = innerW;
    const barH = 6;
    ctx.fillStyle = "#ECECE9";
    ctx.fillRect(padX, barY, barW, barH);
    ctx.fillStyle = CARD_INK;
    ctx.fillRect(padX, barY, Math.max(2, barW * Math.max(0, Math.min(1, u.score))), barH);

    y += catRowH;
  });

  y += 14;
  ctx.strokeStyle = CARD_LINE;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(CARD_W - padX, y);
  ctx.stroke();
  y += 50;

  // ============================================================
  // 4. Complete overview — every answer + peer phrase
  // ============================================================
  ctx.fillStyle = CARD_INK3;
  ctx.font = `500 13px ${CARD_MONO}`;
  ctx.fillText("COMPLETE OVERVIEW", padX, y);

  ctx.fillStyle = CARD_INK4;
  ctx.font = `400 13px ${CARD_SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`${entries.length} answers`, CARD_W - padX, y);
  ctx.textAlign = "left";
  y += 32;

  let lastCat = null;
  entries.forEach((e) => {
    const cat = CATEGORY_BY_ID[e.q.cat];
    if (cat && cat.id !== lastCat) {
      // Group header — small mono kicker + thin rule
      y += 12;
      ctx.fillStyle = CARD_INK;
      ctx.font = `500 13px ${CARD_MONO}`;
      ctx.fillText(cat.title.toUpperCase(), padX, y);
      ctx.strokeStyle = CARD_LINE;
      ctx.beginPath();
      ctx.moveTo(padX, y + 8);
      ctx.lineTo(CARD_W - padX, y + 8);
      ctx.stroke();
      y += 20;
      lastCat = cat.id;
    }

    const label = e.q.label.replace(/\?$/, "");
    const rawAnswer = formatRawAnswerForPdf(e.value, e.q);
    const phrase = e.stat ? phraseForEntry({ kind: e.kind, stat: e.stat, unit: e.q.unit }) : "";

    ctx.fillStyle = CARD_INK;
    ctx.font = `500 18px ${CARD_SANS}`;
    const labelLines = wrapText(ctx, label, innerW);
    const labelStr = labelLines[0] + (labelLines.length > 1 ? "…" : "");
    ctx.fillText(labelStr, padX, y + 22);

    ctx.fillStyle = CARD_INK;
    ctx.font = `400 19px ${CARD_SERIF}`;
    const answerLines = wrapText(ctx, rawAnswer || "—", innerW);
    const answerStr = answerLines[0] + (answerLines.length > 1 ? "…" : "");
    ctx.fillText(answerStr, padX, y + 50);

    if (phrase) {
      ctx.fillStyle = CARD_INK3;
      ctx.font = `400 15px ${CARD_SANS}`;
      const phraseLines = wrapText(ctx, phrase, innerW);
      const phraseStr = phraseLines[0] + (phraseLines.length > 1 ? "…" : "");
      ctx.fillText(phraseStr, padX, y + 76);
    }

    y += perQRowH;
  });

  // ============================================================
  // 5. Dark footer band
  // ============================================================
  const footerY = canvas.height - footerH;
  ctx.fillStyle = "#0F0F0F";
  ctx.fillRect(0, footerY, CARD_W, footerH);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 32px 'Space Grotesk', ${CARD_SANS}`;
  ctx.textAlign = "left";
  ctx.fillText("Comparizzon", padX, footerY + 56);

  ctx.fillStyle = "#9F9D98";
  ctx.font = `400 16px ${CARD_SERIF}`;
  ctx.fillText("compare your answers with real people", padX, footerY + 86);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `500 14px ${CARD_MONO}`;
  ctx.textAlign = "right";
  ctx.fillText("COMPARIZZON.COM", CARD_W - padX, footerY + 56);

  ctx.fillStyle = "#9F9D98";
  ctx.font = `400 14px ${CARD_SANS}`;
  ctx.fillText("take your version", CARD_W - padX, footerY + 86);
  ctx.textAlign = "left";

  return canvas;
}

/* Convert canvas to Blob */
function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.95));
}

function ShareSnapshotModal({ open, onClose, answers, peers, segment, timeSpentMs = 0 }) {
  const [dataUrl, setDataUrl] = useState("");
  const [blob, setBlob] = useState(null);
  const [rendering, setRendering] = useState(false);
  const data = useMemo(
    () => buildSnapshotData(answers, peers, segment, timeSpentMs),
    [answers, peers, segment, timeSpentMs]
  );

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        const canvas = await renderSnapshotCanvas(data);
        const nextBlob = await canvasToBlob(canvas);
        if (cancelled) return;
        setBlob(nextBlob);
        setDataUrl(canvas.toDataURL("image/png"));
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, data]);

  const downloadImage = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparizzon-results-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const nativeShare = async () => {
    if (!blob || typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    const url = "https://comparizzon.com/";
    const payload = { title: "Comparizzon", text: "My Comparizzon results", url };
    const file = new File([blob], "comparizzon-results.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ ...payload, files: [file] });
        return;
      } catch (_) {}
    }
    try { await navigator.share(payload); } catch (_) {}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "var(--modal-scrim)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-l)",
              padding: 24,
              width: "min(840px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
              <div>
                <div className="label">Share</div>
                <h3 className="serif" style={{ fontSize: 28, color: "var(--ink)", margin: "6px 0 0" }}>
                  Your Results
                </h3>
              </div>
              <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20 }}>
              <div style={{
                background: "var(--surface-muted)",
                borderRadius: "var(--radius-m)",
                height: 360,
                overflow: "hidden",
                border: "1px solid var(--line)",
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
              }}>
                {rendering || !dataUrl ? (
                  <div style={{
                    color: "var(--ink-3)",
                    fontSize: 13,
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>Generating image…</div>
                ) : (
                  <img
                    src={dataUrl}
                    alt="Your Results"
                    style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", objectPosition: "top" }}
                  />
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button onClick={downloadImage} disabled={!blob} style={{ minHeight: 44, height: 44 }}>
                  Download image ↓
                </Button>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <Button variant="secondary" onClick={nativeShare} disabled={!blob} style={{ minHeight: 44, height: 44 }}>
                    Share via…
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [state, dispatch, hydrated] = useAppState();
  const answers = state.answers;
  const { mode: themeMode, toggleTheme } = useTheme();
  const { peers, source: peerSource, sheetState } = usePeerPool();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const totalAnswered = Object.keys(answers).filter(k => answerIsFilled(answers[k])).length;
  const admin = useAdminUnlock();
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const handleShareSite = useCallback(() => {
    shareSiteHome();
  }, []);

  const roomSession = useRoomSession();
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomDashboardOpen, setRoomDashboardOpen] = useState(false);
  /* "everyone" = global peer pool, "room" = only members of the active
     comparison room. Persisted only in memory; we reset to "everyone"
     whenever the active room changes so users don't get stuck looking at a
     comparison for a room they just left. */
  const [compareMode, setCompareMode] = useState("everyone");
  useEffect(() => {
    setCompareMode("everyone");
  }, [roomSession.activeRoomId]);
  const compareRoomData = useRoomCompareData({
    activeRoomId: roomSession.activeRoomId,
    token: roomSession.activeRoom?.token || "",
    enabled: Boolean(roomSession.activeRoomId && roomSession.activeRoom?.token),
  });
  const handleOpenCreateRoom = useCallback(() => {
    setCreateRoomOpen(true);
  }, []);
  const handleCreateRoom = useCallback(async ({ title }) => {
    const created = await roomSession.createRoom({ title });
    setCreateRoomOpen(false);
    /* Owner lands on the room dashboard URL so they can copy the invite
       link. We also pop the dashboard modal open immediately — that's the
       "share your invite" moment. */
    if (typeof window !== "undefined" && created?.room_id) {
      const shareUrl = buildRoomShareUrl(created.room_id);
      try {
        const targetPath = `/?room=${encodeURIComponent(created.room_id)}`;
        window.history.replaceState({}, "", targetPath);
        setUrlRoomId(created.room_id);
      } catch (_) {}
      try { window.__lastRoomShareUrl = shareUrl; } catch (_) {}
    }
    /* Show the user past the welcome gate so they can see the dashboard
       (the welcome screen hides chrome / modals look stranger there). */
    dispatch({ type: "seenWelcome" });
    setRoomDashboardOpen(true);
  }, [roomSession, dispatch]);

  const handleLeaveActiveRoom = useCallback(async () => {
    if (!roomSession.activeRoomId) return;
    await roomSession.leaveRoom(roomSession.activeRoomId);
    /* Drop ?room= from the URL since we're no longer in it. */
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("room");
        const next = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}${url.hash || ""}`;
        window.history.replaceState({}, "", next);
        setUrlRoomId(null);
      } catch (_) {}
    }
  }, [roomSession]);

  const handleDeleteActiveRoom = useCallback(async () => {
    if (!roomSession.activeRoomId) return;
    await roomSession.deleteRoom(roomSession.activeRoomId);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("room");
        const next = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}${url.hash || ""}`;
        window.history.replaceState({}, "", next);
        setUrlRoomId(null);
      } catch (_) {}
    }
  }, [roomSession]);

  const handleKickFromActiveRoom = useCallback(async (targetNumber) => {
    if (!roomSession.activeRoomId) return;
    await roomSession.kickFromRoom(roomSession.activeRoomId, targetNumber);
  }, [roomSession]);

  /* Room id we should treat as "the URL is asking for this room right now".
     Kept in state so we can react to popstate (back/forward) and our own
     replaceState calls. */
  const [urlRoomId, setUrlRoomId] = useState(() => getRoomIdFromUrl());
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onPop = () => setUrlRoomId(getRoomIdFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* "Pending join" = the URL points at a room that isn't in our known
     rooms map yet. That's the joiner intercept signal. We block the rest
     of the app until the user either accepts or declines. */
  const pendingJoinRoomId = (
    roomSession.hydrated &&
    urlRoomId &&
    !roomSession.rooms[urlRoomId]
  ) ? urlRoomId : null;

  const handleAcceptJoin = useCallback(async () => {
    if (!pendingJoinRoomId) return;
    try {
      await roomSession.joinRoom(pendingJoinRoomId);
      /* On successful join we leave the URL as-is (?room=ID) so the user
         can refresh and stay in. The screen routing falls through to the
         normal welcome / questionnaire flow because the room is now in
         the known-rooms map. */
    } catch (_) {
      /* Error message is surfaced via roomSession.error on the join screen. */
    }
  }, [pendingJoinRoomId, roomSession]);

  const handleDeclineJoin = useCallback(() => {
    roomSession.clearError();
    /* Strip ?room= from the URL and stop showing the join screen. */
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("room");
        const next = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}${url.hash || ""}`;
        window.history.replaceState({}, "", next);
      } catch (_) {}
    }
    setUrlRoomId(null);
  }, [roomSession]);

  // Force scroll to top on every screen/category transition.
  // We run repeated passes to handle Safari momentum + late layout shifts.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    const forceTop = () => {
      try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch (_) {}
      try { window.scrollTo(0, 0); } catch (_) {}
      const root = document.scrollingElement || document.documentElement;
      if (root) root.scrollTop = 0;
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };
    forceTop();
    const rafIds = [];
    for (let i = 0; i < 12; i += 1) {
      rafIds.push(requestAnimationFrame(forceTop));
    }
    const timeoutIds = [40, 100, 180, 280].map((ms) => setTimeout(forceTop, ms));
    return () => {
      rafIds.forEach((id) => cancelAnimationFrame(id));
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [state.screen, state.currentCatId]);

  // Load Google Fonts via <link> in <head> — more reliable than @import in inline <style>
  useEffect(() => {
    // Preconnect to speed up font file fetch
    const preconnects = [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ];
    const created = [];
    preconnects.forEach(({ rel, href, crossOrigin }) => {
      const l = document.createElement("link");
      l.rel = rel; l.href = href;
      if (crossOrigin) l.crossOrigin = crossOrigin;
      document.head.appendChild(l);
      created.push(l);
    });
    FONT_HREFS.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
      created.push(l);
    });
    return () => { created.forEach(l => l.parentNode && l.parentNode.removeChild(l)); };
  }, []);

  // Active session id — stable across answers, reset on reset
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionIdHydrated, setSessionIdHydrated] = useState(false);
  const ACTIVE_KEY = "average-io:active-session";

  // Hydrate active session id from storage
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(ACTIVE_KEY);
        if (r?.value) setActiveSessionId(r.value);
      } catch (_) {}
      setSessionIdHydrated(true);
    })();
  }, []);

  // Keep the latest state/peers in refs so the save effect can read them without
  // being a dependency (which would cause it to retrigger on every state change).
  const latestStateRef = useRef(state);
  const latestPeersRef = useRef(peers);
  useEffect(() => { latestStateRef.current = state; }, [state]);
  useEffect(() => { latestPeersRef.current = peers; }, [peers]);

  // Track the answers signature so we only save when real answers actually change.
  // Using a string signature avoids triggering on reference churn of the answers
  // object when nothing meaningful changed.
  const answersSignature = useMemo(() => {
    const keys = Object.keys(answers).sort();
    return keys.map(k => `${k}=${String(answers[k])}`).join("|");
  }, [answers]);

  // Remember the last signature we actually saved so the activeSessionId
  // transition (first answer creates the id → re-runs the effect) doesn't
  // cause a duplicate save.
  const lastSavedSigRef = useRef("");

  // Debounced session snapshot — fires only when answers signature changes.
  useEffect(() => {
    if (!hydrated || !sessionIdHydrated) return;
    if (answersSignature === "") return; // no answers yet
    if (answersSignature === lastSavedSigRef.current) return; // already saved this exact state

    const t = setTimeout(async () => {
      const curState = latestStateRef.current;
      const curPeers = latestPeersRef.current;
      const curAnswers = curState.answers;
      const curTotal = Object.keys(curAnswers).filter(k => curAnswers[k] != null && curAnswers[k] !== "").length;

      // Generate id on first answer
      let sid = activeSessionId;
      if (!sid) {
        sid = `${Date.now()}-${randomId()}`;
        setActiveSessionId(sid);
        try { await window.storage.set(ACTIVE_KEY, sid); } catch (_) {}
      }

      const visibleTotal = QUESTIONS.filter(q => isQuestionVisible(q, curAnswers)).length;
      const finished = curState.screen === "overview" && curTotal >= visibleTotal;

      lastSavedSigRef.current = answersSignature;
      await saveSessionSnapshot(curState, curPeers, { finished, sessionId: sid, dispatch });
    }, 900);

    return () => clearTimeout(t);
  }, [answersSignature, hydrated, sessionIdHydrated, activeSessionId, dispatch]);

  /* Mirror answers into the active comparison room (if any). Same idea as the
     session snapshot above, but pointed at /api/rooms-submit and gated on
     having a real membership. Editable: every meaningful change is pushed
     through, so the comparison view stays in sync if the user adjusts later. */
  const lastRoomSubmitSigRef = useRef("");
  const activeRoomToken = roomSession.activeRoom?.token || "";
  useEffect(() => {
    if (!hydrated || !roomSession.hydrated) return undefined;
    if (!roomSession.activeRoomId || !activeRoomToken) return undefined;
    if (answersSignature === "") return undefined;
    if (answersSignature === lastRoomSubmitSigRef.current) return undefined;

    const t = setTimeout(async () => {
      try {
        await apiSubmitRoom({
          roomId: roomSession.activeRoomId,
          token: activeRoomToken,
          answers: latestStateRef.current.answers,
        });
        lastRoomSubmitSigRef.current = answersSignature;
      } catch (err) {
        const msg = String((err && err.message) || err);
        /* If the room is gone (deleted, expired, or we got kicked) drop the
           stale membership so we stop pinging a dead room. The UI will fall
           back to the normal flow on next render. */
        if (/not\s*found|expired|removed|forbidden/i.test(msg)) {
          try { roomSession.removeRoom?.(roomSession.activeRoomId); } catch (_) {}
        }
      }
    }, 1500);

    return () => clearTimeout(t);
  }, [answersSignature, hydrated, roomSession.hydrated, roomSession.activeRoomId, activeRoomToken, roomSession]);

  // Screen routing
  let screenNode = null;
  /* Joiner intercept takes precedence over the normal welcome / start /
     overview routing: if the URL is asking us to join a room we don't yet
     belong to, show the join screen first. After accept or decline, this
     condition flips off and the user lands on whatever screen they would
     have seen otherwise. */
  const showJoinScreen = Boolean(pendingJoinRoomId) && hydrated && roomSession.hydrated;
  const isWelcome = hydrated && !showJoinScreen && (!state.hasSeenWelcome || state.screen === "welcome");

  /* Swap the peer pool when the user has flipped to "This room" mode. We
     only override when room data is actually available — otherwise stay
     on the global pool so the screens never go blank. The banner below
     visualises which mode is active. */
  const useRoomPool = (
    compareMode === "room"
    && Boolean(roomSession.activeRoomId)
    && compareRoomData.canViewResults
  );
  const effectivePeers = useRoomPool ? compareRoomData.roomPeers : peers;
  const showCompareBanner = (
    !isWelcome
    && !showJoinScreen
    && hydrated
    && roomSession.hydrated
    && Boolean(roomSession.activeRoomId)
  );
  if (!hydrated) {
    screenNode = (
      <div style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "24px",
      }}>
        <div style={{ position: "absolute", top: isMobile ? 16 : 20, right: isMobile ? 18 : 24, zIndex: 5 }}>
          <ThemeToggle mode={themeMode} onToggle={toggleTheme} />
        </div>
        <div className="label">Loading…</div>
      </div>
    );
  } else if (showJoinScreen) {
    screenNode = (
      <JoinRoomScreen
        roomId={pendingJoinRoomId}
        onJoin={handleAcceptJoin}
        onDecline={handleDeclineJoin}
        busy={roomSession.busy}
        joinError={roomSession.error}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />
    );
  } else if (isWelcome) {
    screenNode = (
      <WelcomeScreen
        dispatch={dispatch}
        peerCount={peers.length}
        peerSource={peerSource}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onCreateRoom={handleOpenCreateRoom}
      />
    );
  } else if (state.screen === "start") {
    screenNode = <CategoryHub state={state} dispatch={dispatch} introMode />;
  } else if (state.screen === "hub") {
    screenNode = <CategoryHub state={state} dispatch={dispatch} />;
  } else if (state.screen === "question") {
    screenNode = (
      <QuestionScreen
        state={state}
        dispatch={dispatch}
        peers={effectivePeers}
      />
    );
  } else if (state.screen === "overview") {
    screenNode = (
      <OverviewDashboard
        state={state}
        dispatch={dispatch}
        peers={effectivePeers}
        onDownloadPdf={() => downloadOverviewPdf(answers, effectivePeers, state.segment, state.timeSpentMs)}
        onShareImage={() => setShareOpen(true)}
        onCreateRoom={handleOpenCreateRoom}
        onOpenRoomDashboard={() => setRoomDashboardOpen(true)}
        activeRoomId={roomSession.activeRoomId}
      />
    );
  } else if (state.screen === "category") {
    screenNode = (
      <CategoryDetail
        state={state}
        dispatch={dispatch}
        peers={effectivePeers}
      />
    );
  } else {
    screenNode = <CategoryHub state={state} dispatch={dispatch} />;
  }

  const onReset = async () => {
    if (!confirm("Clear all answers and start over? Your last saved session stays in the admin log.")) return;
    dispatch({ type: "reset" });
    try {
      await window.storage.delete(STORAGE_KEY);
      await window.storage.delete(ACTIVE_KEY);
    } catch (_) {}
    setActiveSessionId(null);
  };

  return (
    <>
      <style>{STYLE}</style>
      <GlobalMetalBackdrop />
      <div style={{ minHeight: "100vh", background: "transparent", position: "relative", zIndex: 2, display: "flex", flexDirection: "column" }}>
        {!isWelcome && !showJoinScreen && (
          <TopBar
            state={state}
            dispatch={dispatch}
            totalAnswered={totalAnswered}
            peerSource={peerSource}
            peerCount={peers.length}
            onOpenSheetData={() => setSheetModalOpen(true)}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            activeRoom={roomSession.activeRoom}
            activeRoomId={roomSession.activeRoomId}
            onOpenRoomDashboard={() => setRoomDashboardOpen(true)}
          />
        )}
        {showCompareBanner && (
          <CompareModeBanner
            mode={compareMode}
            onModeChange={setCompareMode}
            roomId={roomSession.activeRoomId}
            yourNumber={compareRoomData.yourNumber}
            roomPeerCount={compareRoomData.roomPeers.length}
            globalPeerCount={peers.length}
            canViewResults={compareRoomData.canViewResults}
            requiresSubmission={compareRoomData.requiresSubmission}
            submittedCount={compareRoomData.submittedCount}
            activeCount={compareRoomData.activeCount}
            loading={compareRoomData.loading}
            onOpenDashboard={() => setRoomDashboardOpen(true)}
          />
        )}
        <div style={{ flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={(showJoinScreen ? `join:${pendingJoinRoomId || ""}` : state.screen) + (state.currentCatId || "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              {screenNode}
            </motion.div>
          </AnimatePresence>
        </div>

        {!isWelcome && !showJoinScreen && (
          <div style={{
            background: "var(--bg-raised)",
            borderTop: "1px solid var(--line)",
            marginTop: 20,
          }}>
            <div style={{
              maxWidth: 1120, margin: "0 auto", padding: "24px 24px 28px",
              display: "flex", justifyContent: isMobile ? "center" : "space-between", alignItems: "center", gap: 16,
              flexWrap: "wrap",
              textAlign: isMobile ? "center" : "left",
            }}>
              <button
                onClick={() => dispatch({ type: "go", screen: "welcome" })}
                aria-label="Go to start page"
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  color: "var(--ink-4)", fontSize: 12,
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  fontFamily: "inherit",
                  justifyContent: isMobile ? "center" : "flex-start",
                }}
              >
                <Logo size={14} muted />
                <span>
                  {peerSource === "live"
                    ? `Live community comparisons · ${peers.length} peers`
                    : "Prototype fallback · synthetic peer pool"}
                </span>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--ink-4)" }}>
                <span className="mono" title={`Build ${APP_BUILD}`}>
                  v{APP_VERSION}
                </span>
                <span style={{ color: "var(--line)" }}>·</span>
                <span>{APP_BUILD}</span>
                <span style={{ color: "var(--line)" }}>·</span>
                <span>Copyright {new Date().getFullYear()}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={onReset}>
                Reset my answers
              </Button>
            </div>
          </div>
        )}
      </div>
      <AdminModal {...admin} sessions={state.sessions} dispatch={dispatch} />
      <SheetDataModal
        open={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        sheetState={sheetState}
      />
      <ShareSnapshotModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        answers={answers}
        peers={peers}
        segment={state.segment}
        timeSpentMs={state.timeSpentMs}
      />
      <RoomDashboardModal
        open={roomDashboardOpen && Boolean(roomSession.activeRoomId)}
        onClose={() => { setRoomDashboardOpen(false); roomSession.clearError(); }}
        roomId={roomSession.activeRoomId}
        room={roomSession.activeRoom}
        busy={roomSession.busy}
        error={roomSession.error}
        onLeave={handleLeaveActiveRoom}
        onDelete={handleDeleteActiveRoom}
        onKick={handleKickFromActiveRoom}
        onClearError={roomSession.clearError}
        onOpenComparison={() => {
          setCompareMode("room");
          dispatch({ type: "go", screen: "overview" });
        }}
      />
      <CreateRoomModal
        open={createRoomOpen}
        onClose={() => { setCreateRoomOpen(false); roomSession.clearError(); }}
        onSubmit={handleCreateRoom}
        busy={roomSession.busy}
        error={roomSession.error}
      />
    </>
  );
}
