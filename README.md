# average.io

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

## Notes

- `window.storage` is shimmed via `localStorage` outside the Claude artifact runtime (see `src/storage-shim.js`).
- The Google Apps Script webhook URL and secret are hardcoded in `src/App.jsx`. For a public deployment, review them before pushing.
- Admin password is also hardcoded — search for `ADMIN_PASSWORD` in `src/App.jsx` and change it before going public.
