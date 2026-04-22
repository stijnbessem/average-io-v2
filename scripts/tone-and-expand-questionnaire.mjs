#!/usr/bin/env node
/**
 * Rewrites questionnaire copy toward Gen-X / Millennial tone (warm, dry wit, fewer memes)
 * and ensures each category has at least 10 questions.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = join(__dirname, "../data/average_io_full_questions.json");

/** Order matters: longer / more specific replacements first. */
const REPLACEMENTS = [
  [/Rather not say 🤐/g, "Prefer not to say"],
  [/Rather not elaborate 🤐/g, "Prefer not to elaborate"],
  [/Rather not know/g, "Prefer not to know"],
  // Note: avoid blanket "Rather not" → "Prefer not" (breaks "Rather not say").
  [/touch grass/gi, "get outside"],
  [/Touch grass/g, "Get outside"],
  [/touch-grass/gi, "outdoorsy"],
  [/Sci-fi \/ fantasy lore deep 🚀/g, "Sci-fi / fantasy deep dives"],
  [/brain melt/gi, "short-form video"],
  [/doomscroll/gi, "endless scrolling"],
  [/digestive lore/gi, "digestive issues"],
  [/ hyperfixations/gi, " obsessions"],
  [/hyperfixation/gi, "deep dive"],
  [/main-character/gi, "Priority"],
  [/Main-character/g, "Priority"],
  [/delulu/gi, "optimistic"],
  [/the ick/gi, "the instant turnoff"],
  [/The ick/g, "The instant turnoff"],
  [/chronically icked/gi, "easily turned off"],
  [/Gen-Z/gi, ""],
  [/LinkedIn sparkle ✨/g, "résumé polish"],
  [/YouTube university PhD 📺/g, "YouTube deep dives"],
  [/certification hunter — LinkedIn sparkle ✨/g, "Professional certs — résumé polish"],
  [/Where you at/g, "Region"],
  [/Where you're really from \(vibes\)/g, "Background / where you're from"],
  [/Third-culture soup 🌐/g, "Third-culture kid / blended background"],
  [/concrete jungle level/g, "Size of place you live"],
  [/Sibling headcount/g, "Siblings"],
  [/Partner \+ kids chaos 👶/g, "Partner and kids"],
  [/Hermit — bed is Paris 🛏️/g, "Rarely travel — homebody"],
  [/catch flights not feelings ✈️/g, "Always on the move"],
  [/hometown hive 🐝/g, "Home country only"],
  [/passport thick 🌍/g, "Stamp-heavy passport"],
  [/Dies in 2 hours 🔋/g, "Drains in a couple of hours"],
  [/send it 🪂/g, "Say yes often"],
  [/What is consequence anyway/g, "Impulsive wiring"],
  [/labels are cringe 🤷/g, "Skeptical of labels"],
  [/golden retriever energy 🐕/g, "Warm and steady"],
  [/Funemployed chill/g, "Between jobs — calm about it"],
  [/Side-hustle goblin/g, "Always a side project"],
  [/Nope, factory settings ✨/g, "No — untouched"],
  [/Injectables \/ tweak era 💉/g, "Injectables / fillers"],
  [/Revision \/ fix-up round 🔁/g, "Revision / follow-up surgery"],
  [/Full storyline arc 🔪/g, "Major surgical work"],
  [/Glutes \/ posterior chat 🍑/g, "Glutes / buttocks"],
  [/Plant era only — zero fur 🌱/g, "Plants only — no pets"],
  [/Allergic — fur is betrayal 🤧/g, "Allergic to animals"],
  [/Short-form brain melt 📲/g, "Short-form video"],
  [/Rotating hyperfixations 🌀/g, "Rotating interests"],
  [/Podcasts — pretend productivity 🎙️/g, "Podcasts"],
  [/Gaming is life 🎮/g, "Gaming"],
  [/doomscroll PhD/g, "heavy scrolling"],
  [/screen is my spine 📱/g, "Screens all day"],
  [/Can't split work vs leisure anymore 🫠/g, "Work and leisure blur together"],
  [/Aspires to routine — fails weekly 📉/g, "Aspires to routine — slips weekly"],
  [/Seasonal — winter ≠ summer brain/g, "Seasonal — winter vs summer"],
  [/Tea person in denial 🍵/g, "Mostly tea"],
  [/Energy drinks — different religion ⚡/g, "Energy drinks"],
  [/What's self-care — survival mode 🫥/g, "\"Self-care?\" — survival mode"],
  [/Weekly-ish slot — calendar negotiates 🗓️/g, "Weekly-ish — calendar decides"],
  [/Daily tiny habits — stack wins 🧱/g, "Small daily habits"],
  [/blackout curtain lore 😴/g, "Sleep / blackout setup"],
  [/grass touch subscription 🌲/g, "Getting outside"],
  [/No sparkle — coping is memes only 😅/g, "No frills — coping is low-key"],
  [/Bowel honesty — #2 per day-ish/g, "Bowel movements per day (roughly)"],
  [/bloated lore/g, "bloating"],
  [/speedrun digestive/g, "fast digestion"],
  [/IBS \/ GI saga — it's complicated 🌀/g, "IBS / GI issues — ongoing"],
  [/Basically never — suspicious 🛡️/g, "Basically never — lucky immune"],
  [/daycare \/ petri dish life/g, "kids / crowded life"],
  [/Long-term post-viral fatigue adjacent 🫥/g, "Long COVID–type fatigue"],
  [/Surgery once — story for drinks 🏥/g, "Surgery once — a story"],
  [/Old accident → chronic pain sequel 🫠/g, "Old injury → chronic pain"],
  [/Between gigs — searching 🔍/g, "Between jobs — looking"],
  [/Part-time puzzle 🧩/g, "Part-time"],
  [/Freelance — feast or famine 💸/g, "Freelance — income swings"],
  [/Someone else's tax bracket — dependent era 💳/g, "Supported by someone else financially"],
  [/Negative net month — send help 💀/g, "Negative month — tight"],
  [/Lower-mid — ramen sometimes optional/g, "Lower-middle — tight budget"],
  [/Rich energy 💸/g, "Comfortable — high income"],
  [/I herd people 🐑/g, "People manager"],
  [/Exec \/ founder chaos 👔/g, "Executive / founder"],
  [/2h\+ each way — podcast university 🎧/g, "Long commute — podcasts help"],
  [/Remote — touch grass sometimes/g, "Remote — remember to leave the house"],
  [/On-site warrior 🚇/g, "On-site daily"],
  [/Straight-A anxiety arc 📎/g, "Straight-A stress"],
  [/Secret nerd hive 🐝/g, "Quiet academic streak"],
  [/Dropped out — still winning/g, "Left school — doing fine anyway"],
  [/Quit then came back older 🔄/g, "Returned to study later"],
  [/I'm done with books 📕❌/g, "Done with formal study"],
  [/Mental health plot — where are you at \(honest buckets\)\?/g, "Mental health — where things stand (honest buckets)"],
  [/In assessment \/ waiting list era 📋/g, "On a waiting list / assessment"],
  [/attention soup 🌀/g, "attention differences"],
  [/chart is a novel 📚/g, "several diagnoses"],
  [/Coping with memes only — details classified 😅/g, "Prefer not to go into detail"],
  [/Disability-level impact — spoons are currency 🥄/g, "Major daily impact — limited energy"],
  [/Never been — fridge is my therapist 🧊/g, "Never tried therapy"],
  [/Weekly regular — standing appointment energy 📆/g, "Weekly sessions"],
  [/Intensive — IOP \/ DBT \/ group era 🏥/g, "Intensive program (IOP / DBT / group)"],
  [/Neurotype self-ID \(optional vibe check\)/g, "Neurotype self-ID (optional)"],
  [/coordination lore 🤹/g, "coordination differences"],
  [/Kink \/ fetish radar — fantasy lane \(consenting-adults energy\)/g, "Fantasy / kink spectrum (consenting adults)"],
  [/Ace \/ aego \/ sex-indifferent — horny for lore not acts 💜/g, "Ace spectrum — fantasy > physical"],
  [/Still exploring — label stuck on loading 🌀/g, "Still figuring it out"],
  [/Partnered sex-ish moments — last ~12 months \(count however you define it\)/g, "Partnered intimacy — last ~12 months (your definition)"],
  [/honeymoon algorithm 📈/g, "very frequent"],
  [/Open \/ poly — body count math is a spreadsheet 📊/g, "Non-monogamy — complicated counting"],
  [/Parking tickets only — meter trauma 🅿️/g, "Parking tickets only"],
];

function retoneString(s) {
  if (typeof s !== "string") return s;
  let t = s;
  for (const [re, rep] of REPLACEMENTS) {
    t = t.replace(re, rep);
  }
  return t;
}

function walkQuestionnaire(data) {
  for (const block of data.questionnaire || []) {
    for (const q of block.questions || []) {
      q.question = retoneString(q.question);
      for (const o of q.options || []) {
        if (o && typeof o.label === "string") o.label = retoneString(o.label);
      }
    }
  }
}

const EXTRA = {
  Education: [
    {
      id: "edu_student_debt",
      question: "Student loans or education-related debt",
      options: [
        { value: "none", label: "None" },
        { value: "paid_off", label: "Had some — paid off" },
        { value: "small", label: "Small balance — manageable" },
        { value: "medium", label: "Mid-sized balance — budgeting around it" },
        { value: "large", label: "Large balance — weighs on decisions" },
        { value: "na_country", label: "Not applicable where I studied" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "languages_count",
      question: "Languages you speak comfortably",
      options: [
        { value: "1", label: "One" },
        { value: "2", label: "Two" },
        { value: "3", label: "Three" },
        { value: "4plus", label: "Four or more" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "study_abroad",
      question: "Ever study or live abroad for school",
      options: [
        { value: "never", label: "Never" },
        { value: "short", label: "Short program — weeks to a semester" },
        { value: "year_plus", label: "A year or longer" },
        { value: "grown_up_abroad", label: "Grew up internationally — hard to separate" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "mentor_or_teach",
      question: "Do you formally mentor, coach, or teach others",
      options: [
        { value: "no", label: "No" },
        { value: "sometimes", label: "Sometimes — informal" },
        { value: "regular", label: "Regularly — part of work or volunteering" },
        { value: "full_time_edu", label: "Full-time in education / training" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "edu_privilege",
      question: "Access to education growing up",
      options: [
        { value: "strong", label: "Strong — stable schools, resources" },
        { value: "ok", label: "Adequate — uneven but workable" },
        { value: "strained", label: "Strained — gaps, moves, or disruption" },
        { value: "mostly_self", label: "Mostly self-taught after basics" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "professional_license",
      question: "Licensed profession (if any)",
      options: [
        { value: "na", label: "Not in a licensed field" },
        { value: "yes_active", label: "Yes — active license" },
        { value: "yes_lapsed", label: "Had one — lapsed or retired" },
        { value: "in_training", label: "Working toward licensure" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  Work: [
    {
      id: "work_years_band",
      question: "Years in paid work (total)",
      options: [
        { value: "0", label: "0 — student / not started" },
        { value: "1-3", label: "1–3" },
        { value: "4-10", label: "4–10" },
        { value: "11-20", label: "11–20" },
        { value: "21plus", label: "21+" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "work_industry",
      question: "Industry (closest fit)",
      options: [
        { value: "tech", label: "Tech / software / IT" },
        { value: "health", label: "Health / care / bioscience" },
        { value: "education", label: "Education / training" },
        { value: "finance", label: "Finance / insurance / accounting" },
        { value: "creative", label: "Creative / media / design" },
        { value: "trades", label: "Trades / logistics / manufacturing" },
        { value: "public", label: "Government / nonprofit" },
        { value: "retail_hospitality", label: "Retail / hospitality / service" },
        { value: "other", label: "Other / mixed" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "job_stress",
      question: "Stress level on a typical workweek",
      options: [
        { value: "low", label: "Low — manageable" },
        { value: "moderate", label: "Moderate — peaks and valleys" },
        { value: "high", label: "High — often on edge" },
        { value: "burnout_adjacent", label: "Burnout-adjacent — running on fumes" },
        { value: "variable", label: "Depends wildly on the season" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "work_hours_band",
      question: "Hours worked most weeks",
      options: [
        { value: "lt25", label: "Under 25" },
        { value: "25-35", label: "25–35" },
        { value: "36-44", label: "36–44" },
        { value: "45-54", label: "45–54" },
        { value: "55plus", label: "55+" },
        { value: "variable", label: "Too variable to say" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "career_change",
      question: "Ever switch careers (major change)",
      options: [
        { value: "no", label: "Same broad path" },
        { value: "once", label: "Once — clear pivot" },
        { value: "multiple", label: "More than once" },
        { value: "considering", label: "Considering one now" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "job_security_feeling",
      question: "Job security — how it feels lately",
      options: [
        { value: "solid", label: "Solid" },
        { value: "ok", label: "Fine — normal worries" },
        { value: "uncertain", label: "Uncertain — industry or role shifting" },
        { value: "precarious", label: "Precarious — contracts or layoffs nearby" },
        { value: "na", label: "Not employed / retired — skip" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  Lifestyle: [
    {
      id: "cooking_at_home",
      question: "Cooking at home",
      options: [
        { value: "rare", label: "Rare — mostly takeout / dining out" },
        { value: "few_week", label: "A few times a week" },
        { value: "most_days", label: "Most days — simple meals" },
        { value: "almost_all", label: "Almost every meal — kitchen is HQ" },
        { value: "partner_cooks", label: "Someone else cooks most nights" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  Habits: [
    {
      id: "caffeine_daily",
      question: "Caffeinated drinks on a typical day",
      options: [
        { value: "0", label: "None" },
        { value: "1", label: "One" },
        { value: "2-3", label: "2–3" },
        { value: "4plus", label: "Four or more" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "sleep_quality_recent",
      question: "Sleep quality lately",
      options: [
        { value: "good", label: "Generally good" },
        { value: "mixed", label: "Mixed — fine some nights" },
        { value: "poor", label: "Often poor — tired a lot" },
        { value: "insomnia_pattern", label: "Insomnia-style — lying awake" },
        { value: "shift_work", label: "Shift work wrecks rhythm" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "news_consumption",
      question: "News intake",
      options: [
        { value: "minimal", label: "Minimal — headlines only" },
        { value: "daily_light", label: "Daily — short sessions" },
        { value: "heavy", label: "Heavy — always scrolling updates" },
        { value: "avoid", label: "Avoid — bad for anxiety" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "gambling_skin",
      question: "Gambling / betting (including lottery)",
      options: [
        { value: "never", label: "Never" },
        { value: "rare_fun", label: "Rare — lottery or office pool" },
        { value: "occasional", label: "Occasional casino / sports bet" },
        { value: "regular", label: "Regular — material amount" },
        { value: "recovery", label: "Past problem — in recovery" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "sugar_drinks",
      question: "Sugary drinks / soda",
      options: [
        { value: "never", label: "Rarely / never" },
        { value: "weekly", label: "Weekly treat" },
        { value: "daily", label: "Daily habit" },
        { value: "diet_versions", label: "Mostly diet / zero-cal versions" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "meal_timing",
      question: "Meal rhythm",
      options: [
        { value: "regular", label: "Regular breakfast / lunch / dinner" },
        { value: "two_big", label: "Two bigger meals" },
        { value: "graze", label: "Grazing — small bites all day" },
        { value: "skip_breakfast", label: "Skip breakfast often" },
        { value: "late_night_eating", label: "Heavy late-night eating" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "substance_peer_pressure",
      question: "Pressure around drinking or drugs (your social circle)",
      options: [
        { value: "low", label: "Low — people respect boundaries" },
        { value: "moderate", label: "Moderate — occasional nudges" },
        { value: "high", label: "High — hard to opt out" },
        { value: "na", label: "Rarely social — hard to say" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  "Health & Mishaps": [
    {
      id: "dental_visit",
      question: "Dental checkups",
      options: [
        { value: "regular", label: "Roughly twice a year" },
        { value: "annual", label: "About yearly" },
        { value: "sporadic", label: "When something hurts" },
        { value: "years", label: "Years since a routine visit" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "vision_correction",
      question: "Vision",
      options: [
        { value: "natural", label: "Fine without correction" },
        { value: "glasses", label: "Glasses" },
        { value: "contacts", label: "Contacts" },
        { value: "surgery", label: "Laser / surgical correction" },
        { value: "mixed", label: "Mix of above" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "allergies_level",
      question: "Allergies (seasonal or otherwise)",
      options: [
        { value: "none", label: "None worth mentioning" },
        { value: "mild", label: "Mild — annoying but manageable" },
        { value: "moderate", label: "Moderate — meds most seasons" },
        { value: "severe", label: "Severe — epinephrine / ER territory" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "blood_donation",
      question: "Blood donation",
      options: [
        { value: "never", label: "Never" },
        { value: "tried_once", label: "Once or twice" },
        { value: "regular", label: "Regular donor when eligible" },
        { value: "cant", label: "Can't — medical / deferred" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "physical_checkup",
      question: "Routine physical / checkup (non-urgent)",
      options: [
        { value: "annual", label: "About yearly" },
        { value: "every_few", label: "Every few years" },
        { value: "only_sick", label: "Only when something's wrong" },
        { value: "years_none", label: "Can't remember the last one" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  "Travel & World": [
    {
      id: "passport_status",
      question: "Passport",
      options: [
        { value: "none", label: "Don't have one" },
        { value: "valid", label: "Valid — ready to travel" },
        { value: "expired", label: "Expired / lapsed" },
        { value: "multiple", label: "More than one nationality / passport" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "travel_style",
      question: "Travel style that fits you",
      options: [
        { value: "planner", label: "Planned itineraries — bookings ahead" },
        { value: "flexible", label: "Flexible — rough plan, improvise" },
        { value: "budget", label: "Budget-first — hostels / deals" },
        { value: "comfort", label: "Comfort-first — nicer stays" },
        { value: "adventure", label: "Adventure — outdoors / remote" },
        { value: "cultural", label: "Museums / cities / food" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "solo_travel",
      question: "Solo vs group travel",
      options: [
        { value: "solo_ok", label: "Happy solo" },
        { value: "partner_family", label: "Usually with partner / family" },
        { value: "friends", label: "Usually friends" },
        { value: "tours", label: "Organized tours / groups" },
        { value: "never_travel", label: "Rarely travel — hard to say" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "flight_anxiety",
      question: "Flying",
      options: [
        { value: "fine", label: "Fine — routine" },
        { value: "mild", label: "Mild nerves — manageable" },
        { value: "avoid", label: "Avoid when possible" },
        { value: "severe", label: "Severe anxiety / panic" },
        { value: "never_flown", label: "Never flown" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "travel_budget",
      question: "Travel spending comfort",
      options: [
        { value: "tight", label: "Tight — trips are rare / short" },
        { value: "moderate", label: "Moderate — save for one trip" },
        { value: "comfortable", label: "Comfortable — travel most years" },
        { value: "luxury_ok", label: "Fine splashing out sometimes" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "international_last_year",
      question: "International trips last 12 months",
      options: [
        { value: "0", label: "None" },
        { value: "1", label: "One" },
        { value: "2-3", label: "2–3" },
        { value: "4plus", label: "Four or more" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "dream_destination_type",
      question: "Dream trip right now",
      options: [
        { value: "beach", label: "Beach / warm coast" },
        { value: "mountains", label: "Mountains / hiking" },
        { value: "city", label: "Big international city" },
        { value: "countryside", label: "Countryside — slow pace" },
        { value: "road_trip", label: "Road trip — domestic" },
        { value: "bucket_epic", label: "Epic once-in-a-lifetime route" },
        { value: "stay_home", label: "Honestly — happy staying put" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "travel_barrier",
      question: "Biggest barrier to traveling more",
      options: [
        { value: "money", label: "Money / budget" },
        { value: "time", label: "Time off / workload" },
        { value: "family", label: "Kids / caregiving" },
        { value: "health", label: "Health / mobility" },
        { value: "anxiety", label: "Anxiety about travel" },
        { value: "none", label: "No barrier — just haven't" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  Personality: [
    {
      id: "conflict_style",
      question: "In conflict you tend to",
      options: [
        { value: "address", label: "Address it directly" },
        { value: "cool_off", label: "Cool off first — talk later" },
        { value: "avoid", label: "Avoid until it fades" },
        { value: "humor", label: "Deflect with humor" },
        { value: "shutdown", label: "Shut down / withdraw" },
        { value: "depends", label: "Depends who it is" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "punctuality",
      question: "Arriving on time",
      options: [
        { value: "early", label: "Usually early" },
        { value: "on_time", label: "On time — intentional" },
        { value: "few_late", label: "A few minutes late — often" },
        { value: "chaotic", label: "Chronically late — working on it" },
        { value: "depends", label: "Depends what's at stake" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  Hobbies: [
    {
      id: "instrument_play",
      question: "Playing an instrument",
      options: [
        { value: "none", label: "Don't play" },
        { value: "used_to", label: "Used to — rusty now" },
        { value: "casual", label: "Casual — for fun" },
        { value: "serious", label: "Serious — lessons / gigs" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "maker_crafts",
      question: "Making things with your hands",
      options: [
        { value: "no", label: "Rarely" },
        { value: "sometimes", label: "Sometimes — small projects" },
        { value: "often", label: "Often — woodworking, sewing, etc." },
        { value: "primary", label: "Main hobby" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "collecting_hobby",
      question: "Collecting",
      options: [
        { value: "no", label: "Not really" },
        { value: "casual", label: "Casual — a shelf or two" },
        { value: "serious", label: "Serious — time and money go here" },
        { value: "digital", label: "Mostly digital — games, NFT phase, etc." },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "weekend_projects",
      question: "Weekend projects",
      options: [
        { value: "rest", label: "Rest — minimal plans" },
        { value: "social", label: "Social — people first" },
        { value: "home", label: "House / errands / fixing things" },
        { value: "creative", label: "Creative — deep sessions" },
        { value: "outdoor", label: "Outdoors — sports or nature" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  "Mind & Mood": [
    {
      id: "meditation_practice",
      question: "Meditation or breathwork practice",
      options: [
        { value: "never", label: "Never stuck" },
        { value: "occasional", label: "Occasional — apps or classes" },
        { value: "regular", label: "Regular — part of routine" },
        { value: "spiritual", label: "Spiritual / religious framing" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "journaling_habit",
      question: "Journaling / notes to yourself",
      options: [
        { value: "no", label: "No" },
        { value: "rare", label: "Rare bursts" },
        { value: "weekly", label: "Weekly-ish" },
        { value: "daily", label: "Near-daily" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "stress_first_coping",
      question: "First thing you reach for under stress",
      options: [
        { value: "talk", label: "Talk to someone" },
        { value: "exercise", label: "Movement / sport" },
        { value: "distraction", label: "TV / scroll / games" },
        { value: "food", label: "Food / drink" },
        { value: "work_more", label: "Work harder — distract with tasks" },
        { value: "therapy_tools", label: "Therapy skills — breathing, grounding" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "social_media_mood_effect",
      question: "Social media effect on your mood",
      options: [
        { value: "fine", label: "Mostly neutral / positive" },
        { value: "mixed", label: "Mixed — depends on the day" },
        { value: "negative", label: "Often worse after scrolling" },
        { value: "avoid", label: "Quit or heavily limited — better off" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
    {
      id: "sleep_mental_link",
      question: "Sleep and mental health — how linked for you",
      options: [
        { value: "tight", label: "Very linked — bad sleep wrecks mood" },
        { value: "moderate", label: "Somewhat linked" },
        { value: "decoupled", label: "Mood issues independent of sleep" },
        { value: "unsure", label: "Hard to separate" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
    },
  ],
  "Private sparks": [
    {
      id: "talking_desires_comfort",
      question: "Comfort naming what you want intimately",
      options: [
        { value: "easy", label: "Easy — words flow" },
        { value: "ok", label: "Okay with practice" },
        { value: "awkward", label: "Awkward — easier nonverbally" },
        { value: "hard", label: "Hard — embarrassment / upbringing" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "body_image_intimacy",
      question: "Body image in intimate moments",
      options: [
        { value: "fine", label: "Generally fine" },
        { value: "sometimes", label: "Sometimes self-conscious" },
        { value: "often", label: "Often gets in the way" },
        { value: "major", label: "Major distraction" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "initiation_balance",
      question: "Who tends to initiate",
      options: [
        { value: "balanced", label: "Fairly balanced" },
        { value: "me_more", label: "I initiate more" },
        { value: "partner_more", label: "Partner initiates more" },
        { value: "cycles", label: "Seasons — swings either way" },
        { value: "negotiated", label: "Explicitly talked about" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "aftercare_importance",
      question: "Aftercare / cuddling / debrief importance",
      options: [
        { value: "essential", label: "Essential — non-negotiable" },
        { value: "nice", label: "Nice when it happens" },
        { value: "optional", label: "Optional — not a big deal" },
        { value: "prefer_solo", label: "Prefer solo wind-down" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "libido_vs_life_stress",
      question: "Libido vs life stress lately",
      options: [
        { value: "aligned", label: "Fine — stress hasn't killed it" },
        { value: "dipped", label: "Dipped — stress / fatigue" },
        { value: "gone", label: "Mostly gone — worrying" },
        { value: "up", label: "Higher than usual — odd but okay" },
        { value: "na", label: "Not relevant — ace / celibate path" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "comfort_with_toys",
      question: "Comfort with toys / extras",
      options: [
        { value: "yes", label: "Comfortable — normal part of life" },
        { value: "open", label: "Open — depends on partner" },
        { value: "unsure", label: "Curious but unsure" },
        { value: "no", label: "Prefer without" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
  ],
  "Real Talk": [
    {
      id: "major_money_trouble",
      question: "Ever bankruptcy, foreclosure, or serious debt crisis",
      options: [
        { value: "never", label: "Never" },
        { value: "close", label: "Close call — resolved" },
        { value: "past_resolved", label: "Past — recovered since" },
        { value: "ongoing", label: "Ongoing strain" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "fired_or_laid_off",
      question: "Ever fired or laid off",
      options: [
        { value: "never", label: "Never" },
        { value: "laid_off", label: "Laid off — redundancy" },
        { value: "fired_fit", label: "Fired — poor fit / performance" },
        { value: "fired_conduct", label: "Fired — conduct / conflict" },
        { value: "quit_first", label: "Quit before it came to that" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "estrangement_family",
      question: "Estrangement from close family",
      options: [
        { value: "no", label: "No — in contact" },
        { value: "strained", label: "Strained — occasional contact" },
        { value: "cut_off", label: "Cut off — intentional distance" },
        { value: "death", label: "Loss — not estrangement" },
        { value: "complicated", label: "Complicated — varies by member" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "substance_family_history",
      question: "Substance issues in immediate family growing up",
      options: [
        { value: "no", label: "None significant" },
        { value: "alcohol", label: "Alcohol — noticeable" },
        { value: "drugs", label: "Other drugs — noticeable" },
        { value: "both", label: "Both / multiple" },
        { value: "unsure", label: "Suspected — not confirmed" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "therapy_family_of_origin",
      question: "Therapy partly for family-of-origin patterns",
      options: [
        { value: "yes_major", label: "Yes — major theme" },
        { value: "yes_some", label: "Sometimes comes up" },
        { value: "no", label: "No — other focus" },
        { value: "no_therapy", label: "Not in therapy" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "biggest_regret_category",
      question: "If you had to pick — biggest regret bucket",
      options: [
        { value: "relationships", label: "Love / relationships" },
        { value: "career", label: "Career / money" },
        { value: "education", label: "Education / didn't study X" },
        { value: "health", label: "Health / body" },
        { value: "family", label: "Family — words or absence" },
        { value: "risk_not_taken", label: "Risk not taken" },
        { value: "none", label: "Nothing major — forward focus" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
    {
      id: "truth_over_easy_lie",
      question: "Honesty — hurt someone's feelings with truth lately",
      options: [
        { value: "yes_needed", label: "Yes — felt necessary" },
        { value: "yes_regret", label: "Yes — regret how it landed" },
        { value: "avoided", label: "Avoided — stayed quiet" },
        { value: "softened", label: "Softened — white lies" },
        { value: "prefer_not", label: "Prefer not to say" },
      ],
      sensitive: true,
    },
  ],
};

function main() {
  const raw = readFileSync(PATH, "utf8");
  const data = JSON.parse(raw);

  walkQuestionnaire(data);

  const seen = new Set();
  for (const block of data.questionnaire) {
    for (const q of block.questions || []) {
      seen.add(q.id);
    }
  }

  for (const block of data.questionnaire) {
    const cat = block.category;
    const add = EXTRA[cat];
    if (!add) continue;
    for (const q of add) {
      if (seen.has(q.id)) continue;
      block.questions.push(q);
      seen.add(q.id);
    }
  }

  // Verify counts
  for (const block of data.questionnaire) {
    const n = (block.questions || []).length;
    if (n < 10) {
      console.warn(`WARN: "${block.category}" still has ${n} questions`);
    }
  }

  writeFileSync(PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("Updated", PATH);
}

main();
