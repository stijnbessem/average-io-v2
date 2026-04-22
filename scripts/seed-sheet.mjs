const WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbywAaq9Ry5Cl9KH5EnfsIeOn8doBdQK6BQSTmpNLCfO89IabjvTNYYLQB4wTA5E3l5h/exec";
const WEBHOOK_SECRET = "stijnbessem";

const TOTAL = Number(process.argv[2] || 400);
const CONCURRENCY = Number(process.argv[3] || 12);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickWeighted(options) {
  const total = options.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.w;
    if (r <= 0) return o.v;
  }
  return options[options.length - 1].v;
}

const ARCHETYPES = [
  { id: "student", w: 18 },
  { id: "young_worker", w: 24 },
  { id: "active_professional", w: 20 },
  { id: "family_parent", w: 18 },
  { id: "midlife_mixed", w: 12 },
  { id: "older_retired", w: 8 },
];

function makeAnswers() {
  const profile = pickWeighted(ARCHETYPES.map((a) => ({ v: a.id, w: a.w })));
  const gender = pickWeighted([
    { v: "Male", w: 48 }, { v: "Female", w: 48 }, { v: "Non-binary", w: 3 }, { v: "Prefer not to say", w: 1 },
  ]);
  const base = {
    country: pickWeighted([{ v: "Netherlands", w: 40 }, { v: "Belgium", w: 14 }, { v: "Germany", w: 12 }, { v: "United Kingdom", w: 10 }, { v: "United States", w: 9 }, { v: "Spain", w: 8 }, { v: "France", w: 7 }]),
    gender,
    education: pickWeighted([{ v: "Secondary / high school", w: 24 }, { v: "Vocational", w: 18 }, { v: "Bachelor's", w: 34 }, { v: "Master's", w: 19 }, { v: "Doctorate", w: 5 }]),
    eye_color: pickWeighted([{ v: "Brown", w: 43 }, { v: "Blue", w: 36 }, { v: "Green", w: 9 }, { v: "Hazel", w: 8 }, { v: "Grey", w: 3 }, { v: "Amber", w: 1 }]),
    hair_color: pickWeighted([{ v: "Brown", w: 42 }, { v: "Black", w: 22 }, { v: "Blonde", w: 19 }, { v: "Red", w: 5 }, { v: "Grey / white", w: 10 }, { v: "Other", w: 2 }]),
    tattoos: pickWeighted([{ v: "None", w: 56 }, { v: "One", w: 18 }, { v: "A few (2–5)", w: 20 }, { v: "Many (6+)", w: 6 }]),
    piercings: pickWeighted([{ v: "None", w: 62 }, { v: "One", w: 18 }, { v: "A few", w: 16 }, { v: "Many", w: 4 }]),
    orientation: pickWeighted([{ v: "Straight", w: 86 }, { v: "Gay / lesbian", w: 4 }, { v: "Bisexual", w: 6 }, { v: "Pansexual", w: 1 }, { v: "Asexual", w: 1 }, { v: "Other", w: 1 }, { v: "Prefer not to say", w: 1 }]),
  };

  let age = 30, employment = "Full-time employed", workHours = 40, sleep = 7, steps = 6500, exercise = "2–3x week";
  let children = "No", childrenCount = null, firstChildAge = null, relationship = "In a relationship", living = "With partner", ownRent = "Rent", income = "40–70k";
  let alcohol = "Monthly", smoking = "Never", cigsDay = null, alcoholUnits = 3;
  let workSetting = "Hybrid";

  if (profile === "student") {
    age = randInt(18, 25); employment = "Studying"; workHours = randInt(0, 16); sleep = randInt(6, 9); steps = randInt(4500, 12000);
    exercise = pickWeighted([{ v: "Rarely", w: 24 }, { v: "1x week", w: 20 }, { v: "2–3x week", w: 34 }, { v: "4–5x week", w: 16 }, { v: "Daily", w: 6 }]);
    relationship = pickWeighted([{ v: "Single", w: 48 }, { v: "Dating", w: 27 }, { v: "In a relationship", w: 23 }, { v: "Married / partnered", w: 2 }]);
    living = pickWeighted([{ v: "With parents", w: 34 }, { v: "With roommates", w: 38 }, { v: "Alone", w: 14 }, { v: "With partner", w: 14 }]);
    ownRent = living === "With parents" ? "Living with family" : "Rent";
    income = pickWeighted([{ v: "Under 20k", w: 58 }, { v: "20–40k", w: 32 }, { v: "40–70k", w: 8 }, { v: "70–120k", w: 2 }]);
    workSetting = pickWeighted([{ v: "On-site", w: 36 }, { v: "Hybrid", w: 18 }, { v: "Remote", w: 9 }, { v: "Not currently working", w: 37 }]);
  } else if (profile === "young_worker") {
    age = randInt(23, 33); employment = pickWeighted([{ v: "Full-time employed", w: 68 }, { v: "Part-time employed", w: 16 }, { v: "Self-employed", w: 8 }, { v: "Studying", w: 8 }]);
    workHours = employment === "Full-time employed" ? randInt(34, 48) : employment === "Part-time employed" ? randInt(12, 30) : randInt(18, 52);
    sleep = randInt(6, 8); steps = randInt(4000, 11000); relationship = pickWeighted([{ v: "Single", w: 28 }, { v: "Dating", w: 18 }, { v: "In a relationship", w: 42 }, { v: "Married / partnered", w: 12 }]);
    living = pickWeighted([{ v: "Alone", w: 24 }, { v: "With partner", w: 33 }, { v: "With roommates", w: 22 }, { v: "With parents", w: 18 }, { v: "Other", w: 3 }]);
    ownRent = living === "With parents" ? "Living with family" : pickWeighted([{ v: "Rent", w: 79 }, { v: "Own", w: 18 }, { v: "Other", w: 3 }]);
    income = pickWeighted([{ v: "Under 20k", w: 18 }, { v: "20–40k", w: 38 }, { v: "40–70k", w: 31 }, { v: "70–120k", w: 11 }, { v: "120–200k", w: 2 }]);
    workSetting = pickWeighted([{ v: "On-site", w: 34 }, { v: "Hybrid", w: 35 }, { v: "Remote", w: 24 }, { v: "Not currently working", w: 7 }]);
  } else if (profile === "active_professional") {
    age = randInt(28, 42); employment = pickWeighted([{ v: "Full-time employed", w: 75 }, { v: "Self-employed", w: 20 }, { v: "Part-time employed", w: 5 }]);
    workHours = employment === "Self-employed" ? randInt(35, 60) : randInt(36, 52);
    sleep = randInt(6, 8); steps = randInt(7000, 15000); exercise = pickWeighted([{ v: "2–3x week", w: 38 }, { v: "4–5x week", w: 44 }, { v: "Daily", w: 14 }, { v: "1x week", w: 4 }]);
    relationship = pickWeighted([{ v: "In a relationship", w: 40 }, { v: "Married / partnered", w: 42 }, { v: "Single", w: 14 }, { v: "Dating", w: 4 }]);
    living = pickWeighted([{ v: "With partner", w: 49 }, { v: "Alone", w: 26 }, { v: "With family", w: 16 }, { v: "Other", w: 9 }]);
    ownRent = pickWeighted([{ v: "Rent", w: 56 }, { v: "Own", w: 40 }, { v: "Other", w: 4 }]);
    income = pickWeighted([{ v: "20–40k", w: 10 }, { v: "40–70k", w: 34 }, { v: "70–120k", w: 34 }, { v: "120–200k", w: 16 }, { v: "Over 200k", w: 6 }]);
    workSetting = pickWeighted([{ v: "On-site", w: 28 }, { v: "Hybrid", w: 42 }, { v: "Remote", w: 28 }, { v: "Not currently working", w: 2 }]);
  } else if (profile === "family_parent") {
    age = randInt(30, 48); children = "Yes"; childrenCount = randInt(1, 3); firstChildAge = randInt(24, Math.min(age - 1, 39));
    employment = pickWeighted([{ v: "Full-time employed", w: 52 }, { v: "Part-time employed", w: 26 }, { v: "Self-employed", w: 14 }, { v: "Other", w: 8 }]);
    workHours = employment === "Part-time employed" ? randInt(16, 30) : randInt(28, 48);
    sleep = randInt(5, 7); steps = randInt(4500, 10000); relationship = pickWeighted([{ v: "Married / partnered", w: 72 }, { v: "In a relationship", w: 20 }, { v: "Divorced", w: 6 }, { v: "Separated", w: 2 }]);
    living = pickWeighted([{ v: "With family", w: 73 }, { v: "With partner", w: 21 }, { v: "Other", w: 6 }]);
    ownRent = pickWeighted([{ v: "Own", w: 57 }, { v: "Rent", w: 39 }, { v: "Other", w: 4 }]);
    income = pickWeighted([{ v: "20–40k", w: 16 }, { v: "40–70k", w: 36 }, { v: "70–120k", w: 30 }, { v: "120–200k", w: 14 }, { v: "Over 200k", w: 4 }]);
    workSetting = pickWeighted([{ v: "On-site", w: 49 }, { v: "Hybrid", w: 29 }, { v: "Remote", w: 13 }, { v: "Not currently working", w: 9 }]);
  } else if (profile === "midlife_mixed") {
    age = randInt(40, 58); employment = pickWeighted([{ v: "Full-time employed", w: 55 }, { v: "Self-employed", w: 14 }, { v: "Part-time employed", w: 15 }, { v: "Looking for work", w: 8 }, { v: "Other", w: 8 }]);
    workHours = employment === "Full-time employed" ? randInt(34, 50) : randInt(0, 44);
    sleep = randInt(6, 8); steps = randInt(3000, 9000); exercise = pickWeighted([{ v: "Never", w: 15 }, { v: "Rarely", w: 25 }, { v: "1x week", w: 22 }, { v: "2–3x week", w: 28 }, { v: "4–5x week", w: 8 }, { v: "Daily", w: 2 }]);
    relationship = pickWeighted([{ v: "Married / partnered", w: 58 }, { v: "In a relationship", w: 18 }, { v: "Single", w: 14 }, { v: "Divorced", w: 8 }, { v: "Separated", w: 2 }]);
    children = pickWeighted([{ v: "Yes", w: 64 }, { v: "No", w: 36 }]);
    if (children === "Yes") { childrenCount = randInt(1, 4); firstChildAge = randInt(22, 36); }
    living = pickWeighted([{ v: "With partner", w: 43 }, { v: "With family", w: 31 }, { v: "Alone", w: 22 }, { v: "Other", w: 4 }]);
    ownRent = pickWeighted([{ v: "Own", w: 52 }, { v: "Rent", w: 44 }, { v: "Other", w: 4 }]);
    income = pickWeighted([{ v: "20–40k", w: 20 }, { v: "40–70k", w: 34 }, { v: "70–120k", w: 26 }, { v: "120–200k", w: 14 }, { v: "Over 200k", w: 6 }]);
    workSetting = pickWeighted([{ v: "On-site", w: 41 }, { v: "Hybrid", w: 30 }, { v: "Remote", w: 16 }, { v: "Not currently working", w: 13 }]);
  } else {
    age = randInt(58, 79); employment = pickWeighted([{ v: "Retired", w: 79 }, { v: "Part-time employed", w: 11 }, { v: "Other", w: 10 }]);
    workHours = employment === "Retired" ? randInt(0, 8) : randInt(8, 24);
    sleep = randInt(6, 9); steps = randInt(2000, 9000); exercise = pickWeighted([{ v: "Never", w: 20 }, { v: "Rarely", w: 28 }, { v: "1x week", w: 22 }, { v: "2–3x week", w: 22 }, { v: "4–5x week", w: 7 }, { v: "Daily", w: 1 }]);
    relationship = pickWeighted([{ v: "Married / partnered", w: 54 }, { v: "Single", w: 18 }, { v: "Widowed", w: 14 }, { v: "Divorced", w: 12 }, { v: "In a relationship", w: 2 }]);
    children = pickWeighted([{ v: "Yes", w: 82 }, { v: "No", w: 18 }]);
    if (children === "Yes") { childrenCount = randInt(1, 5); firstChildAge = randInt(20, 33); }
    living = pickWeighted([{ v: "With partner", w: 44 }, { v: "Alone", w: 37 }, { v: "With family", w: 15 }, { v: "Other", w: 4 }]);
    ownRent = pickWeighted([{ v: "Own", w: 66 }, { v: "Rent", w: 30 }, { v: "Other", w: 4 }]);
    income = pickWeighted([{ v: "Under 20k", w: 21 }, { v: "20–40k", w: 35 }, { v: "40–70k", w: 28 }, { v: "70–120k", w: 12 }, { v: "120–200k", w: 4 }]);
    workSetting = pickWeighted([{ v: "On-site", w: 7 }, { v: "Hybrid", w: 5 }, { v: "Remote", w: 3 }, { v: "Not currently working", w: 85 }]);
  }

  smoking = pickWeighted([{ v: "Never", w: 62 }, { v: "Former smoker", w: 20 }, { v: "Occasionally", w: 9 }, { v: "Daily", w: 9 }]);
  if (smoking === "Daily") cigsDay = randInt(4, 20);
  else if (smoking === "Occasionally") cigsDay = randInt(1, 6);

  alcohol = pickWeighted([{ v: "Never", w: 20 }, { v: "Rarely", w: 26 }, { v: "Monthly", w: 22 }, { v: "Weekly", w: 20 }, { v: "Several times a week", w: 10 }, { v: "Daily", w: 2 }]);
  if (alcohol !== "Never") {
    alcoholUnits = alcohol === "Daily" ? randInt(12, 28)
      : alcohol === "Several times a week" ? randInt(6, 16)
      : alcohol === "Weekly" ? randInt(3, 10)
      : alcohol === "Monthly" ? randInt(1, 7)
      : randInt(1, 4);
  } else alcoholUnits = null;

  const height = gender === "Male" ? randInt(165, 198) : gender === "Female" ? randInt(150, 186) : randInt(155, 193);
  const weight = gender === "Male" ? randInt(60, 115) : gender === "Female" ? randInt(47, 98) : randInt(52, 108);
  const shoeSize = gender === "Male" ? randInt(39, 48) : gender === "Female" ? randInt(35, 44) : randInt(37, 46);

  const household = living === "Alone" ? 1 : living === "With partner" ? (children === "Yes" ? Math.min(8, 2 + (childrenCount || 0)) : 2) : living === "With family" ? randInt(3, 7) : living === "With roommates" ? randInt(2, 6) : randInt(1, 6);

  const mergedAnswers = {
    age,
    birth_month: pickWeighted([
      { v: "January", w: 8 }, { v: "February", w: 8 }, { v: "March", w: 9 }, { v: "April", w: 8 },
      { v: "May", w: 9 }, { v: "June", w: 8 }, { v: "July", w: 9 }, { v: "August", w: 9 },
      { v: "September", w: 8 }, { v: "October", w: 8 }, { v: "November", w: 8 }, { v: "December", w: 8 },
    ]),
    gender,
    country: base.country,
    years_in_country: Math.max(0, Math.min(age - 4, randInt(0, Math.max(2, age - 4)))),
    languages_spoken: pickWeighted([{ v: 1, w: 34 }, { v: 2, w: 42 }, { v: 3, w: 17 }, { v: 4, w: 5 }, { v: 5, w: 2 }]),
    area_type: pickWeighted([{ v: "Urban", w: 58 }, { v: "Suburban", w: 29 }, { v: "Rural", w: 13 }]),
    has_pet: pickWeighted([{ v: "Yes", w: 55 }, { v: "No", w: 45 }]),
    city: pickWeighted([
      { v: "Amsterdam", w: 20 },
      { v: "Rotterdam", w: 14 },
      { v: "Utrecht", w: 12 },
      { v: "Berlin", w: 12 },
      { v: "London", w: 16 },
      { v: "Barcelona", w: 10 },
      { v: "New York", w: 10 },
      { v: "Singapore", w: 6 },
    ]),
    skin_color: pickWeighted([
      { v: "Very light", w: 14 },
      { v: "Light", w: 28 },
      { v: "Medium", w: 24 },
      { v: "Olive", w: 14 },
      { v: "Brown", w: 14 },
      { v: "Dark", w: 5 },
      { v: "Prefer not to say", w: 1 },
    ]),
    dominant_hand: pickWeighted([{ v: "Right", w: 88 }, { v: "Left", w: 10 }, { v: "Both", w: 2 }]),
    education: base.education,
    employment,
    height,
    weight,
    shoe_size: shoeSize,
    eye_color: base.eye_color,
    hair_color: base.hair_color,
    tattoos: base.tattoos,
    tattoo_count: base.tattoos === "None" ? 0 : base.tattoos === "One" ? 1 : base.tattoos === "A few (2–5)" ? randInt(2, 5) : randInt(6, 24),
    piercings: base.piercings,
    sleep,
    weekday_bedtime: pickWeighted([{ v: "Before 21:00", w: 5 }, { v: "21:00–22:59", w: 28 }, { v: "23:00–00:59", w: 52 }, { v: "01:00 or later", w: 15 }]),
    weekday_wakeup: pickWeighted([{ v: "Before 05:00", w: 3 }, { v: "05:00–06:59", w: 33 }, { v: "07:00–08:59", w: 49 }, { v: "09:00 or later", w: 15 }]),
    sleep_latency: randInt(3, 45),
    sleep_quality: pickWeighted([{ v: "Very poor", w: 5 }, { v: "Poor", w: 16 }, { v: "Okay", w: 36 }, { v: "Good", w: 33 }, { v: "Very good", w: 10 }]),
    night_wakeups: randInt(0, 4),
    naps_per_week: randInt(0, 7),
    resting_hr: randInt(48, 98),
    sleep_hours: sleep,
    smoking,
    ...(cigsDay != null ? { cigs_day: cigsDay } : {}),
    alcohol,
    ...(alcoholUnits != null ? { alcohol_units: alcoholUnits } : {}),
    water: randInt(2, 12),
    water_intake: Math.round((randInt(8, 40) / 10) * 10) / 10,
    steps,
    phone_unlocks: randInt(8, 180),
    notifications: randInt(15, 280),
    screen_time: Math.round((randInt(5, 130) / 10) * 10) / 10,
    apps_installed: randInt(35, 220),
    exercise_freq: exercise,
    exercise_type: pickWeighted([{ v: "Walking", w: 28 }, { v: "Running", w: 14 }, { v: "Cycling", w: 10 }, { v: "Gym / weights", w: 22 }, { v: "Yoga / pilates", w: 8 }, { v: "Team sports", w: 7 }, { v: "Swimming", w: 5 }, { v: "Other", w: 4 }, { v: "None", w: 2 }]),
    years_exercising: Math.max(0, Math.min(age - 12, randInt(0, Math.max(1, age - 12)))),
    exercise_minutes_week: randInt(0, 420),
    strength_sessions_week: randInt(0, 7),
    gym_member: pickWeighted([{ v: "Yes", w: 34 }, { v: "No", w: 66 }]),
    // Keep this populated for every row so q_gym_visits comparison has depth.
    gym_visits: 0,
    phone_hours: randInt(1, 8),
    social_hours: randInt(0, 6),
    work_hours: workHours,
    commute_time: employment === "Studying" ? randInt(0, 70) : employment === "Retired" ? 0 : randInt(0, 95),
    work_setting: workSetting,
    meetings_week: ["Full-time employed", "Part-time employed", "Self-employed"].includes(employment) ? randInt(0, 28) : 0,
    devices_owned: randInt(1, 11),
    messaging_apps_weekly: randInt(1, 8),
    emails_sent_day: randInt(0, 55),
    video_calls_week: randInt(0, 20),
    streaming_hours: Math.round((randInt(0, 450) / 10) * 10) / 10,
    subscriptions_count: randInt(0, 11),
    meals: randInt(2, 5),
    home_cooked_meals: randInt(0, 19),
    fruit_servings: randInt(0, 6),
    coffee: randInt(0, 6),
    caffeine_drinks_day: randInt(0, 8),
    eat_out: pickWeighted([{ v: "Never", w: 8 }, { v: "Monthly", w: 24 }, { v: "Weekly", w: 41 }, { v: "Several times a week", w: 23 }, { v: "Daily", w: 4 }]),
    alcohol_days_month: randInt(0, 20),
    fruit_veg_servings_day: randInt(0, 10),
    alarms: randInt(0, 8),
    snooze: randInt(0, 9),
    tabs: randInt(2, 140),
    unread_emails: randInt(0, 1800),
    relationship,
    long_term_count: randInt(0, 6),
    children,
    ...(childrenCount != null ? { children_count: childrenCount } : {}),
    ...(firstChildAge != null ? { first_child_age: firstChildAge } : {}),
    siblings: randInt(0, 6),
    close_contacts_week: randInt(1, 22),
    family_same_city: randInt(0, 12),
    visits_family_month: randInt(0, 10),
    living,
    own_rent: ownRent,
    household,
    income,
    orientation: base.orientation,
    first_sex_age: randInt(15, 24),
    active: pickWeighted([{ v: "Yes", w: 64 }, { v: "No", w: 30 }, { v: "Prefer not to say", w: 6 }]),
    partners_lifetime: randInt(0, 40),
    partners_year: randInt(0, 8),
    frequency: randInt(0, 22),
    anal: pickWeighted([{ v: "Yes", w: 48 }, { v: "No", w: 42 }, { v: "Prefer not to say", w: 10 }]),
    protection: pickWeighted([{ v: "Always", w: 39 }, { v: "Often", w: 25 }, { v: "Sometimes", w: 21 }, { v: "Never", w: 8 }, { v: "Prefer not to say", w: 7 }]),
  };

  // Keep values internally coherent for comparison quality.
  if (mergedAnswers.partners_year > mergedAnswers.partners_lifetime) {
    mergedAnswers.partners_year = mergedAnswers.partners_lifetime;
  }
  if (mergedAnswers.active === "No") {
    mergedAnswers.frequency = 0;
  }
  if (mergedAnswers.gym_member === "Yes") {
    mergedAnswers.gym_visits = randInt(1, 7);
  }
  if (mergedAnswers.relationship === "Single" && mergedAnswers.children === "No") {
    mergedAnswers.household = Math.max(1, Math.min(mergedAnswers.household, 3));
  }

  return mergedAnswers;
}

function buildSnapshot(i) {
  const id = `${Date.now()}-varied-${i}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const raw = makeAnswers(i);
  const answers = {};
  for (const [qid, value] of Object.entries(raw)) {
    answers[qid] = { value, category: "seed", label: qid, type: typeof value === "number" ? "number" : "single" };
  }
  const answeredQids = Object.keys(answers);
  return {
    id,
    created_at: now,
    finished: true,
    finished_at: now,
    version: 2,
    segment_filter: "all",
    total_answered: answeredQids.length,
    total_questions: answeredQids.length,
    categories_completed: 11,
    answers,
    category_uniqueness: {},
  };
}

async function sendOne(i) {
  const payload = {
    secret: WEBHOOK_SECRET,
    snapshot: buildSnapshot(i),
    meta: {
      user_agent: "seed-script",
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
    } catch (_) {
      // retry
    }
    await new Promise((r) => setTimeout(r, attempt * 250));
  }
  return false;
}

async function main() {
  let success = 0;
  let fail = 0;
  const queue = Array.from({ length: TOTAL }, (_, i) => i + 1);

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      const ok = await sendOne(i);
      if (ok) success++;
      else fail++;
      if ((success + fail) % 25 === 0) {
        console.log(`Progress: ${success + fail}/${TOTAL} (ok=${success}, fail=${fail})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`Done. ok=${success}, fail=${fail}, total=${TOTAL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
