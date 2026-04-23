# Comparizzon

Immersive comparison questionnaire. Answer playful questions, see how you compare — locally, globally, uniquely.

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deploying to Vercel

1. Push this repo to GitHub
2. Import the repo into Vercel
3. Accept the defaults — Vercel auto-detects Vite
4. Done

## Stripe paywall setup

The overview paywall now opens a real Stripe Checkout session through `api/create-checkout-session.js`.

Set these environment variables in Vercel:

- `STRIPE_SECRET_KEY` = your Stripe secret key (`sk_live_...` or test key)
- `STRIPE_PRICE_ID` = the one-time EUR 1.00 price ID (`price_...`)
- `SITE_URL` = your public app URL (for success/cancel return URLs)

Notes:

- Do **not** hardcode secret keys in client code.
- The sample zip you shared includes a hardcoded test key in Ruby; do not reuse that in production.
- Local `vite` dev does not run the `/api` function. Use Vercel deployment (or `vercel dev`) when testing full checkout end-to-end.

## Notes

- `window.storage` is shimmed via `localStorage` outside the Claude artifact runtime (see `src/storage-shim.js`).
- The Google Apps Script webhook URL and secret are hardcoded in `src/App.jsx`. For a public deployment, review them before pushing.
- Admin password is also hardcoded — search for `ADMIN_PASSWORD` in `src/App.jsx` and change it before going public.
- Questionnaire answers are now multi-choice only. Numeric/text prompts are converted to curated choice buckets so all answers can be compared as categorical distributions.
- Moderate dedupe is applied to remove look-alike prompts (for example overlapping sleep/water/screen-time style questions) and keep each category focused.
