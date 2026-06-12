#!/bin/bash
# MUSEA deploy script — requires VERCEL_TOKEN env var
set -e
cd "$(dirname "$0")"

if [ -z "$VERCEL_TOKEN" ]; then echo "VERCEL_TOKEN not set"; exit 1; fi

V="npx vercel --token $VERCEL_TOKEN --yes"

# link/create project
$V link --project musea 2>/dev/null || true

# env vars (idempotent-ish: remove then add)
if [ -n "$DATABASE_URL" ]; then
  echo "$DATABASE_URL" | npx vercel env add DATABASE_URL production --token "$VERCEL_TOKEN" --force 2>/dev/null || true
fi
if [ -n "$SEED_TOKEN" ]; then
  echo "$SEED_TOKEN" | npx vercel env add SEED_TOKEN production --token "$VERCEL_TOKEN" --force 2>/dev/null || true
fi

# production deploy
$V deploy --prod
