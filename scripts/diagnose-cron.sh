#!/usr/bin/env bash
# One-shot diagnostic for the snapshot cron auth. Pulls the production
# CRON_SECRET, extracts it without shell interpolation, calls the snapshot
# endpoint, then cleans up.
set -uo pipefail

cd "$(dirname "$0")/.."

vercel env pull .env.cron --environment=production --yes >/dev/null
trap 'rm -f .env.cron' EXIT

# Inspect the raw line so we can tell missing-line vs empty-value vs real-value.
RAW_LINE=$(grep '^CRON_SECRET=' .env.cron || echo "<no CRON_SECRET line in pulled file>")
echo "raw line:         $RAW_LINE"

# Extract value verbatim — no `source`, so $/`/\\ in the secret can't break us.
CS=$(grep '^CRON_SECRET=' .env.cron | sed 's/^CRON_SECRET=//; s/^"//; s/"$//')

echo "secret length:    ${#CS}"
echo "secret head:      ${CS:0:6}…"
echo "secret tail:      …${CS: -6}"
echo
echo "--- POST /api/snapshot ---"
curl -sS -i -X GET -H "Authorization: Bearer $CS" https://comparizzon.com/api/snapshot
echo
