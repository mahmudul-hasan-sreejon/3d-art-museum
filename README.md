# MUSEA — A Walkable History of Art

An interactive 3D art museum in the browser. Zoom through a timeline of
art history, meet the artists, then walk through a first-person 3D
gallery of their actual paintings.

**Every bio, story, fact and image comes from Wikipedia / Wikimedia
Commons** — fetched at seed time and stored in Postgres. Nothing is
AI-generated.

## Features

**The Timeline** — a zoomable, pannable canvas of 15 movements
(Medieval & Gothic → Contemporary) on a piecewise-warped real-date axis,
with three switchable views:

- **Strata** — parchment bands stacked like geological layers
- **Constellation** — artists as gilt stars in night-sky clusters
- **Corridor** — gilded museum rooms receding in perspective

Zoom into any period to reveal its artists positioned by their actual
working years. Filter by period or artist through a GSAP-animated
dropdown. Click an artist for a museum-placard card, then enter their
gallery through a pair of gilded doors.

**The Museum** — a walkable React Three Fiber gallery per artist:
WASD + mouse-look, PBR materials, a spotlight per painting, soft
shadows, reflective floors, frame glare. Click a painting and the
camera glides up to it; a placard slides in with the year, the story,
and facts from the painting's own Wikipedia article. Scroll to zoom
into the high-res image.

## Stack

Next.js 14 (App Router) · React Three Fiber + drei + postprocessing ·
GSAP · Tailwind · PostgreSQL (Neon) · data from the Wikipedia Action
API, REST API and Wikidata SPARQL.

## Running locally

```bash
npm install --legacy-peer-deps
npm run dev
```

Without `DATABASE_URL` set, the app serves clearly-labelled placeholder
data so the UI can be developed offline.

## Production setup

1. Create a Postgres database (e.g. [Neon](https://neon.tech)).
2. Set env vars on your host: `DATABASE_URL`, and optionally
   `SEED_TOKEN` to protect the seeding endpoint.
3. Deploy (e.g. `npx vercel deploy --prod`).
4. Seed from Wikipedia (≈15 requests, one per movement):

```bash
BASE=https://your-deployment.vercel.app
curl "$BASE/api/seed?step=schema&token=$SEED_TOKEN"
for slug in medieval-gothic renaissance baroque rococo neoclassicism \
  romanticism realism impressionism post-impressionism expressionism \
  cubism surrealism abstract-expressionism pop-art contemporary; do
  curl "$BASE/api/seed?step=period&slug=$slug&token=$SEED_TOKEN"
done
curl "$BASE/api/seed?step=status&token=$SEED_TOKEN"
```

## Content & licensing

Texts are verbatim excerpts from English Wikipedia article
introductions (CC BY-SA); each card and placard links its source
article. Images are hot-linked from Wikimedia Commons, preferring
Commons-hosted (public-domain / freely-licensed) files; for some
20th-century works only English-Wikipedia-hosted images exist and these
are flagged with a `license` column in the database.

`?lite=1` on a museum URL disables shadows/post-processing for
low-powered devices.
