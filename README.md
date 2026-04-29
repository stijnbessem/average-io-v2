# Comparizzon

Immersive comparison questionnaire. Answer playful questions, see how you compare — locally, globally, uniquely.

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The Vite dev server proxies `/api/*` to live `comparizzon.com` (configured in `vite.config.js`), so backend calls hit production data unless you also run `vercel dev`.

## Deploying to Vercel

1. Push to GitHub
2. Import the repo into Vercel
3. Accept the defaults — Vercel auto-detects Vite
4. Set the environment variables below

## Environment variables

Copy `.env.example` → `.env.local` for local dev. Production values live in
Vercel project settings → Environment Variables. Never commit real secrets.

### Supabase (primary data store)
- `SUPABASE_URL` — project URL
- `SUPABASE_SERVICE_ROLE_KEY` — secret key, used by serverless functions
- `SUPABASE_ANON_KEY` — publishable key (currently unused in code, set for future use)

### Stripe (paywall)
- `STRIPE_SECRET_KEY` — `sk_live_...` or test key
- `STRIPE_PUBLISHABLE_KEY` — `pk_live_...` or test key
- `STRIPE_PRICE_ID` — the one-time price ID (`price_...`)
- `SITE_URL` — public app URL for Checkout return URLs

### Admin panel
- `ADMIN_PASSWORD` — gates the in-app admin modal. Verified by `/api/admin-auth`; never sent to the client.

### Token salt (DO NOT ROTATE)
- `GOOGLE_WEBHOOK_SECRET` — historical name; serves only as the HMAC salt seed for room owner/participant tokens. Removing or rotating this invalidates every existing room. (Set `ROOM_TOKEN_SECRET` to `sha256("average-io:room-token-derive:v1:" + GOOGLE_WEBHOOK_SECRET)` if you want to migrate off the legacy var name without breaking tokens.)

## Notes

- `window.storage` is shimmed via `localStorage` outside the Claude artifact runtime (see `storage-shim.js`).
- Paid access is verified server-side using Stripe Checkout `session_id` and persisted in an HttpOnly cookie.
- "Restore purchase" looks up paid Stripe sessions by email at `/api/restore-access`.
- Local `vite` dev does not run `/api/*`; the proxy hits production. Use `vercel dev` for full end-to-end against a staging Supabase project.
