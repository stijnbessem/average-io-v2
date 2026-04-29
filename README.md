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
- `STRIPE_PUBLISHABLE_KEY` = your Stripe publishable key (`pk_live_...` or test key)
- `STRIPE_PRICE_ID` = the one-time EUR 1.00 price ID (`price_...`)
- `SITE_URL` = your public app URL (for success/cancel return URLs)
- `GOOGLE_WEBHOOK_URL` = your Google Apps Script webhook URL (`https://script.google.com/macros/s/.../exec`)
- `GOOGLE_WEBHOOK_SECRET` = secret token expected by your Apps Script
- `GOOGLE_SHEETS_CLIENT_EMAIL` = service account email from your Google Cloud credentials JSON
- `GOOGLE_SHEETS_PRIVATE_KEY` = private key from credentials JSON (paste full key, including BEGIN/END lines)
- `GOOGLE_SHEETS_SPREADSHEET_ID` = the target spreadsheet id (the long id in the sheet URL)
- `GOOGLE_SHEETS_RANGE` = optional read range (default `A:ZZ`, or set `Form Responses 1!A:ZZ`)

Notes:

- Do **not** hardcode secret keys in client code.
- The sample zip you shared includes a hardcoded test key in Ruby; do not reuse that in production.
- Local `vite` dev does not run the `/api` function. Use Vercel deployment (or `vercel dev`) when testing full checkout end-to-end.
- Paid access is verified server-side using Stripe Checkout `session_id` and persisted in an HttpOnly cookie.
- Restore purchase is available from the paywall via email (`/api/restore-access`), checking paid Stripe sessions for the configured `STRIPE_PRICE_ID`.

## Notes

- `window.storage` is shimmed via `localStorage` outside the Claude artifact runtime (see `src/storage-shim.js`).
- Google Sheets logging now goes through `api/log-session.js` so webhook secrets stay server-side.
- Live peer reads now go through `api/live-peers.js` using a Google service account, so the Sheet can stay `Beperkt`.
- Share the Sheet with `GOOGLE_SHEETS_CLIENT_EMAIL` as Viewer (or Editor if needed), otherwise reads will fail.
- Admin password is also hardcoded — search for `ADMIN_PASSWORD` in `App.jsx` and change it before going public.
- Questionnaire answers are now multi-choice only. Numeric/text prompts are converted to curated choice buckets so all answers can be compared as categorical distributions.
- Moderate dedupe is applied to remove look-alike prompts (for example overlapping sleep/water/screen-time style questions) and keep each category focused.
