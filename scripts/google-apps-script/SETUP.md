# Apps Script + Sheet setup — private comparison rooms

This guide adds private comparison rooms on top of your existing Google Sheet
webhook. Your current session-logging flow keeps working untouched: when a
request comes in **without** an `action` field, the script delegates to your
previous `doPost(e)`.

You only need to do this once. ~10 minutes.

---

## 0. What you'll change

- **In your existing Sheet:** add 2 new tabs (or let the script auto-create
  them on first use).
- **In your existing Apps Script project:** rename your current `doPost` and
  paste in the new dispatcher script.
- **Add 1 new Script Property** (`ROOM_TOKEN_SECRET`) and confirm
  `WEBHOOK_SECRET` exists.
- **Add a daily trigger** to clean up expired rooms.
- **Redeploy** the web app (same URL is preserved).
- **Add 1 new Vercel env var** (`ROOM_TOKEN_SECRET`) — same value as in Apps
  Script.

Nothing about your existing `log-session` flow changes.

---

## 1. Add the new tabs to your Sheet (recommended)

Open the Google Sheet that's behind `GOOGLE_WEBHOOK_URL` and add two tabs:

### Tab `rooms`

Row 1 should contain these column headers, in this exact order:

```
room_id | owner_token_hash | created_at | expires_at | max_participants | title | questionnaire_version | status
```

### Tab `room_participants`

Row 1:

```
room_id | participant_number | participant_token_hash | status | joined_at | submitted_at | answers_json
```

> If you skip this step the script will create both tabs automatically the
> first time a room is created. Pre-creating them is cleaner because you
> can see the columns immediately.

---

## 2. Update the Apps Script

1. Open the Apps Script project bound to your Sheet (Extensions → Apps Script
   from your Sheet, or open it directly from script.google.com).

2. **Find your existing `doPost(e)` function and rename it to
   `doPostLegacy_(e)`.** Don't change anything inside it. Save.

3. **Create a new file** in the project:
   - Click the `+` next to **Files** → **Script**, name it `Rooms.gs`.
   - Open `scripts/google-apps-script/Code.gs` from this repo and copy its
     **entire contents** into the new `Rooms.gs` file.
   - Save.

That's it for the code. The new file defines a fresh `doPost(e)` which:
- routes any request that has an `action` field to a room handler, and
- otherwise calls back into your renamed `doPostLegacy_(e)` so the session
  logging flow is unaffected.

> If you already have functions in your script with names like `getProp_`,
> `jsonOut_`, etc., they won't collide — every helper in `Rooms.gs` is
> prefixed with `rooms`.

---

## 3. Set Script Properties

In the Apps Script editor:

- **Project Settings** (gear icon, bottom left) → scroll to **Script
  properties** → **Edit script properties** → **Add property**.

Add (or confirm) these two:

| Key | Value |
|-----|-------|
| `WEBHOOK_SECRET` | The same string your Vercel env uses as `GOOGLE_WEBHOOK_SECRET`. If your existing script previously used a hardcoded secret, just put it here. |
| `ROOM_TOKEN_SECRET` | A **fresh** random string of 32+ characters (e.g. from `openssl rand -base64 48`). Save it somewhere safe — you'll add the same value to Vercel in step 6. |

Save.

> Why two secrets? `WEBHOOK_SECRET` proves the request comes from your
> Vercel API. `ROOM_TOKEN_SECRET` is used by Vercel to HMAC-hash participant
> and owner tokens before storing them in the Sheet, so even if someone
> reads the Sheet they can't impersonate a participant.

---

## 4. Add the daily cleanup trigger

In the Apps Script editor:

- **Triggers** (clock icon, left rail) → **Add Trigger**
- Function: `cleanupExpiredRoomsTrigger`
- Deployment: **Head**
- Event source: **Time-driven**
- Type: **Day timer**
- Time: pick anything (e.g. **3am to 4am**)
- Save.

This deletes rooms past their TTL (default 30 days) and removes their
participant rows.

---

## 5. Deploy the new version

- **Deploy** → **Manage deployments** → click the pencil on the existing
  deployment → set **Version** to **New version** → **Deploy**.
- Keep the same web app URL (it's the value of your Vercel
  `GOOGLE_WEBHOOK_URL`). No env change needed for the URL itself.

---

## 6. Add `ROOM_TOKEN_SECRET` to Vercel

In Vercel → your project → **Settings → Environment Variables**, add:

| Name | Value | Environments |
|------|-------|--------------|
| `ROOM_TOKEN_SECRET` | Same string you set in Apps Script step 3. | Production, Preview, Development |

For local development, also add it to `.env.local` at the repo root:

```
ROOM_TOKEN_SECRET=the-same-32+char-string
```

> Important: this value must match exactly between Apps Script and Vercel.
> If you ever rotate it, all existing rooms become unreadable (tokens won't
> hash to anything stored in the Sheet) — that's fine for security, just
> understand it invalidates active rooms.

---

## 7. Smoke test (optional but recommended)

From a terminal, replace `URL`, `WS`, `TS` with your values. The Apps Script
expects form-encoded `payload=...` (same shape your existing webhook uses).

**Create a room** — note that this skips Vercel and talks straight to Apps
Script, just to verify the wiring. The token hash here is a dummy value; in
real traffic the Vercel API computes it from a real random token using
`HMAC-SHA256(token, ROOM_TOKEN_SECRET)`.

```bash
URL="https://script.google.com/macros/s/XXXXXX/exec"
WS="your-WEBHOOK_SECRET"

curl -s "$URL" \
  -d payload='{"secret":"'"$WS"'","action":"create_room","owner_token_hash":"dummyhashabcdef","title":"Smoke test","questionnaire_version":"v1"}'
```

Expected response: `{"ok":true,"room_id":"…","owner_number":1, …}`.

Check your Sheet — you should see one new row each in `rooms` and
`room_participants`.

**Clean up the smoke-test row:** simulate the daily cleanup directly:

```bash
curl -s "$URL" \
  -d payload='{"secret":"'"$WS"'","action":"cleanup_expired"}'
```

Or just delete the row manually.

---

## 8. Rolling back

If you ever need to remove this:

1. Delete the `Rooms.gs` file from the Apps Script project.
2. Rename `doPostLegacy_(e)` back to `doPost(e)`.
3. Redeploy.
4. (Optional) Delete the `rooms` and `room_participants` tabs.
5. Remove the `ROOM_TOKEN_SECRET` env var.

The legacy session-logging flow is restored exactly as before.

---

## Troubleshooting

**“No legacy doPostLegacy_(e) found.”**
You haven't renamed your old `doPost`. Open the Apps Script project, find
your previous `doPost(e)` function, rename it to `doPostLegacy_(e)`, save,
redeploy.

**“Unauthorized” on every action.**
`WEBHOOK_SECRET` in Script Properties doesn't match what Vercel sends.

**Rooms appear but answers never arrive.**
`ROOM_TOKEN_SECRET` differs between Apps Script and Vercel. The participant
token hashes won't match anything in the Sheet, so `submit_answers` returns
`"Not a participant"`. Make sure both sides use the exact same string.

**Cleanup trigger isn't firing.**
Apps Script triggers can fail silently. Open **Triggers → Executions** to
see the log. If you see permission prompts pending, run
`cleanupExpiredRoomsTrigger` manually once from the editor to authorize.

**Sheet rows are stuck after a kick/leave.**
That's intentional — `kick` and `leave` flip the row's `status` to
`kicked`/`left` and clear `answers_json`, but keep the row for audit. The
daily cleanup only removes rows when the whole room expires.
