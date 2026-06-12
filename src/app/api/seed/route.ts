import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { CURATION } from "@/lib/curation";
import {
  fetchArtistFromWikidata,
  fetchPagesInfo,
  fetchDescription,
  sentences,
  slugify,
} from "@/lib/wiki";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS periods (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  sort INT NOT NULL
);
CREATE TABLE IF NOT EXISTS artists (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  period_id INT NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  born INT,
  died INT,
  nationality TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  significance TEXT NOT NULL DEFAULT '',
  portrait_url TEXT,
  wiki_url TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS paintings (
  id SERIAL PRIMARY KEY,
  artist_id INT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year_text TEXT NOT NULL DEFAULT '',
  year_num INT,
  image_url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  story TEXT NOT NULL DEFAULT '',
  facts JSONB NOT NULL DEFAULT '[]',
  wiki_url TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT 'commons',
  sort INT NOT NULL DEFAULT 0,
  UNIQUE (artist_id, title)
);
`;

function authorized(req: NextRequest): boolean {
  const token = process.env.SEED_TOKEN;
  if (!token) return true;
  return (
    req.nextUrl.searchParams.get("token") === token ||
    req.headers.get("x-seed-token") === token
  );
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const step = req.nextUrl.searchParams.get("step") ?? "status";
  const pool = getPool();

  try {
    if (step === "schema") {
      await pool.query(SCHEMA_SQL);
      // upsert all periods immediately (blurbs filled per-period later)
      for (let i = 0; i < CURATION.length; i++) {
        const p = CURATION[i];
        await pool.query(
          `INSERT INTO periods (slug, name, start_year, end_year, color, sort)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (slug) DO UPDATE SET
             name=$2, start_year=$3, end_year=$4, color=$5, sort=$6`,
          [p.slug, p.name, p.start, p.end, p.color, i]
        );
      }
      return NextResponse.json({ ok: true, periods: CURATION.length });
    }

    if (step === "period") {
      const slug = req.nextUrl.searchParams.get("slug");
      const period = CURATION.find((p) => p.slug === slug);
      if (!period) {
        return NextResponse.json({ error: "unknown period" }, { status: 400 });
      }
      const report = await seedPeriod(period);
      return NextResponse.json(report);
    }

    // status
    const [p, a, w, short] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM periods"),
      pool.query("SELECT COUNT(*)::int AS n FROM artists"),
      pool.query("SELECT COUNT(*)::int AS n FROM paintings"),
      pool.query(
        `SELECT ar.name, COUNT(pa.id)::int AS works FROM artists ar
         LEFT JOIN paintings pa ON pa.artist_id = ar.id
         GROUP BY ar.id HAVING COUNT(pa.id) < 8 ORDER BY works`
      ),
    ]);
    return NextResponse.json({
      periods: p.rows[0].n,
      artists: a.rows[0].n,
      paintings: w.rows[0].n,
      artistsUnderEight: short.rows,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function seedPeriod(period: (typeof CURATION)[number]) {
  const pool = getPool();

  // 1. movement blurb, verbatim from the movement's Wikipedia intro
  const movementInfo = await fetchPagesInfo([period.wiki], 600);
  const mInfo = movementInfo.get(period.wiki);
  const blurb = mInfo ? sentences(mInfo.extract).slice(0, 2).join(" ") : "";
  const { rows: pr } = await pool.query(
    "UPDATE periods SET blurb=$1 WHERE slug=$2 RETURNING id",
    [blurb, period.slug]
  );
  const periodId = pr[0].id;

  const results: any[] = [];
  // 2. artists — sequential per artist, parallel fetches within
  for (const a of period.artists) {
    try {
      results.push(await seedArtist(periodId, a.wiki));
    } catch (e: any) {
      results.push({ artist: a.wiki, error: e.message });
    }
  }
  return { period: period.slug, blurb: !!blurb, artists: results };
}

async function seedArtist(periodId: number, wikiTitle: string) {
  const pool = getPool();

  const [wd, infoMap, description] = await Promise.all([
    fetchArtistFromWikidata(wikiTitle),
    fetchPagesInfo([wikiTitle], 700),
    fetchDescription(wikiTitle),
  ]);
  const info = infoMap.get(wikiTitle);
  if (!info) throw new Error(`no Wikipedia page for ${wikiTitle}`);

  const intro = sentences(info.extract);
  const bio = intro.slice(0, 2).join(" ");
  const sig =
    intro
      .slice(2)
      .find((s) =>
        /influen|regard|consider|greatest|pioneer|found|leading|renowned|famous|important|best.known|major figure/i.test(
          s
        )
      ) ??
    intro[2] ??
    "";

  const slug = slugify(wikiTitle);
  const { rows: ar } = await pool.query(
    `INSERT INTO artists (slug, period_id, name, born, died, nationality, bio, significance, portrait_url, wiki_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (slug) DO UPDATE SET
       period_id=$2, name=$3, born=$4, died=$5, nationality=$6,
       bio=$7, significance=$8, portrait_url=$9, wiki_url=$10
     RETURNING id`,
    [
      slug,
      periodId,
      info.title,
      wd.born,
      wd.died,
      description,
      bio,
      sig,
      info.thumbUrl,
      info.pageUrl,
    ]
  );
  const artistId = ar[0].id;

  // 3. paintings: top works that have enwiki articles, batched info fetch
  const workTitles = wd.works.map((w) => w.title).slice(0, 22);
  const pages = await fetchPagesInfo(workTitles, 1600);

  type Candidate = {
    title: string;
    year: number | null;
    info: NonNullable<ReturnType<typeof pages.get>>;
    commons: boolean;
  };
  const candidates: Candidate[] = [];
  for (const w of wd.works) {
    const pi = pages.get(w.title);
    if (!pi || !pi.thumbUrl) continue;
    candidates.push({
      title: pi.title,
      year: w.year,
      info: pi,
      commons: pi.thumbUrl.includes("/wikipedia/commons/"),
    });
  }
  // prefer public-domain / freely-licensed Commons images first
  candidates.sort((a, b) => Number(b.commons) - Number(a.commons));
  const chosen = candidates.slice(0, 12);

  let sort = 0;
  let inserted = 0;
  for (const c of chosen) {
    const ss = sentences(c.info.extract);
    const story = ss.slice(0, 3).join(" ");
    const facts = ss.slice(3, 7);
    const yearText =
      c.year !== null
        ? String(c.year)
        : (c.info.extract.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/) ?? [""])[0];
    // inspect image: original if reasonably sized, else upscale the thumb path
    let image = c.info.originalUrl ?? c.info.thumbUrl!;
    if (c.info.originalWidth > 2600 && c.info.thumbUrl) {
      image = c.info.thumbUrl.replace(/\/\d+px-/, "/2400px-");
    }
    await pool.query(
      `INSERT INTO paintings (artist_id, title, year_text, year_num, image_url, thumb_url, story, facts, wiki_url, license, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (artist_id, title) DO UPDATE SET
         year_text=$3, year_num=$4, image_url=$5, thumb_url=$6,
         story=$7, facts=$8, wiki_url=$9, license=$10, sort=$11`,
      [
        artistId,
        c.title,
        yearText,
        c.year,
        image,
        c.info.thumbUrl,
        story,
        JSON.stringify(facts),
        c.info.pageUrl,
        c.commons ? "commons" : "wikipedia-en",
        sort++,
      ]
    );
    inserted++;
  }

  return { artist: info.title, works: inserted, commonsOnly: chosen.every((c) => c.commons) };
}
