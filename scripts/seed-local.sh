#!/usr/bin/env bash
# One-off local seeding driver: hits /api/seed per period with cooldowns and
# retry-on-429 so we stay under Wikipedia's rate limit. Idempotent (upserts).
set -u
TOKEN="1523af69046fdd0a09646e53accb1913369f7f4df399cde8"
BASE="http://localhost:3000/api/seed"
PERIODS="$*"

for slug in $PERIODS; do
  attempt=1
  while :; do
    echo "[$(date +%H:%M:%S)] seeding $slug (attempt $attempt)"
    resp=$(curl -s --max-time 180 "$BASE?step=period&slug=$slug&token=$TOKEN")
    if echo "$resp" | grep -q "\"period\":\"$slug\""; then
      echo "  OK: $(echo "$resp" | head -c 400)"; break
    fi
    # not a valid period result: could be 429, 404/HTML, or other error
    if echo "$resp" | grep -q '429'; then
      echo "  429 rate-limited; cooling down 90s"; sleep 90
    else
      echo "  bad response (retrying in 15s): $(echo "$resp" | head -c 160)"; sleep 15
    fi
    attempt=$((attempt+1))
    [ "$attempt" -le 5 ] && continue
    echo "  GAVE UP on $slug after 5 attempts"; break
  done
  echo "  cooldown 20s before next period"; sleep 20
done
echo "[$(date +%H:%M:%S)] DONE"
