# Comparizzon SEO Playbook

Last updated 2026-04-24. What I implemented in code, and what you must do manually.

---

## ✅ What's now live in the code (implemented 2026-04-24)

1. **Crawlable content in `<body>`** — H1, H2s, category list with descriptions, FAQ copy, internal links. Rendered inside `#root` so React replaces it on hydration — no cloaking, no user-facing change.
2. **FAQPage structured data** — 8 questions eligible for Google expandable FAQ rich results.
3. **Organization schema** — enables Knowledge Panel eligibility.
4. **WebSite schema** — brand + publisher link.
5. **Preconnect / dns-prefetch** for Google Fonts, GTM, Facebook, Apps Script → improves LCP (Core Web Vitals ranking signal).
6. **hreflang** self-reference + `x-default`.
7. **robots.txt upgraded** — explicitly allows modern AI crawlers (OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended) which drive growing referral traffic from ChatGPT, Perplexity, Claude.
8. **sitemap.xml upgraded** — valid XML, image extension, hreflang, correct `Content-Type` header via `vercel.json`.
9. **Keywords meta + author meta** — mild signal, doesn't hurt.

---

## 🔴 What you must do manually (bigger impact than all the code)

SEO is 20% technical, 80% off-page. The code part is done. Now the real work.

### 1. Google Search Console (do this today — 5 minutes)

1. Go to https://search.google.com/search-console
2. Add property → **Domain** option (enter `comparizzon.com`)
3. Verify via DNS — Google gives you a TXT record, add it in Vercel:
   - Vercel dashboard → your domain → DNS → Add record → Type: `TXT`, Name: `@`, Value: the Google verification string
4. Once verified:
   - Go to **Sitemaps** → submit `https://comparizzon.com/sitemap.xml`
   - Go to **URL inspection** → paste `https://comparizzon.com/` → click "Request indexing"
5. In 1–2 weeks: go to **Performance** tab — you'll see the queries you actually rank for. This tells you what to double down on.

### 2. Bing Webmaster Tools (do this today — 2 minutes)

Bing powers ChatGPT Search, Copilot, DuckDuckGo, and Ecosia. It's not optional.

1. https://www.bing.com/webmasters
2. Sign in → "Import from Google Search Console" (fastest if GSC is set up)
3. Submit sitemap: `https://comparizzon.com/sitemap.xml`

### 3. Google Business Profile (if you want local signal — skip if fully online)

Skip unless you have a physical Amsterdam office you want associated.

### 4. Structured data validation (do this after deploy)

Paste `https://comparizzon.com/` into:
- https://search.google.com/test/rich-results — should now show **WebApplication + Offer + FAQPage + Organization + WebSite** (4–5 schemas detected)
- https://validator.schema.org/ — should parse cleanly

FAQPage rich results typically appear in Google SERP within 2–4 weeks. Massive visual real estate.

### 5. Backlinks — the highest-ROI SEO lever (ongoing)

Google ranks sites partially by who links to them. Your current backlink count is near zero. Top options, cheapest to hardest:

**Free directory submissions (1 hour, do all in one session):**
- https://www.producthunt.com — launch Comparizzon (schedule for Tuesday/Wednesday for max visibility)
- https://betalist.com
- https://www.indiehackers.com/products — add your product
- https://alternativeto.net — list as alternative to "BuzzFeed quizzes", "16personalities", "OkCupid tests"
- https://www.saashub.com
- https://www.toolify.ai
- https://theresanaiforthat.com — if you pitch any AI angle
- https://startupstash.com
- https://www.launched.io

**Content marketing (higher effort, bigger return):**
- Write ONE piece of "data journalism" content from your actual dataset. Example title: "We asked 5,000 people about dating in 2026. Here's what we found." Publish on your own domain at `/blog/dating-in-2026` (you'd need to add a blog route), then pitch it to tech/culture journalists on Twitter and Reddit.
- Reddit: r/dataisbeautiful, r/SampleSize (very active for surveys), r/AskReddit threads where you comment with a link. Don't spam — participate genuinely, link when it's on-topic.
- TikTok / Instagram reels: short-form "can you guess what % of people said X?" format. Drives branded searches, which boost rankings.

**Partnerships:**
- Reach out to lifestyle bloggers, dating coaches, wellness newsletters. Offer them unique stats from your dataset in exchange for a link.

### 6. Content expansion (the slow-burn lever)

Long-tail searches like "how unique am I test", "life comparison quiz for adults", "am I normal quiz 2026" are findable — but Google needs to see dedicated content for each query.

The highest-ROI next step: **add a simple blog section** with 5–10 articles, each targeting a specific long-tail keyword. Examples:
- "How unique am I really? The data from 5,000 Comparizzon users"
- "Dating in 2026: what's normal, what's not"
- "Your money habits vs. everyone else's (2026 survey)"
- "Are you a morning person? Here's what the data says"

Each article should be 800–1,500 words, include charts from your sheet data, and internal-link back to `/?start=<relevant-category>`. Over 3–6 months this is what moves your site from "invisible" to "ranks for real queries."

I didn't build the blog infrastructure — it's not currently in the app. If you want, I can add a simple Markdown-based blog next.

### 7. Social seeding (ongoing)

Every social mention with a link to comparizzon.com is a weak backlink. Post results screenshots on LinkedIn, X, Threads, Reddit. Every share creates social proof and modest link equity.

### 8. Core Web Vitals (check after a week)

After real traffic hits: https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fcomparizzon.com

Target:
- LCP < 2.5s
- INP < 200ms
- CLS < 0.1

Main bundle is currently ~500KB. If LCP is slow, consider route-based code splitting on the main `App.jsx` — that's a bigger refactor I can do if PSI reports it as a problem.

---

## 📊 Realistic timeline

| When | What to expect |
|---|---|
| Week 1 | GSC indexes your site, first impressions appear for brand queries ("comparizzon") |
| Week 2–4 | FAQ rich results appear. Any social seeding drives first organic clicks. |
| Month 2 | Long-tail impressions grow if you ship any content. Rankings still below page 1 for competitive terms. |
| Month 3 | With 5+ backlinks and 5+ content pages, page 1 rankings for long-tail queries. |
| Month 6 | Product-market-SEO fit. Rankings for mid-volume queries like "life comparison quiz" if content has been consistent. |

**The biggest compounder is content + backlinks, not code.** The code changes I made bring you to the SEO baseline — from "invisible" to "findable." Everything past that is manual, consistent work. There is no shortcut.

---

## 🎯 The one thing to do first, right now

Set up **Google Search Console** and **submit the sitemap**. This takes 5 minutes and is the prerequisite for everything else. You won't know what's working until GSC starts showing you query data.
