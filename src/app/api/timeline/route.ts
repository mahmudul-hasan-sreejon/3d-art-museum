import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { MOCK_TIMELINE } from "@/lib/mock";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(MOCK_TIMELINE);
  }
  try {
    const pool = getPool();
    const [periods, artists] = await Promise.all([
      pool.query("SELECT * FROM periods ORDER BY sort"),
      pool.query(
        `SELECT ar.*, pe.slug AS period_slug, pe.name AS period_name,
                COUNT(pa.id)::int AS painting_count
         FROM artists ar
         JOIN periods pe ON pe.id = ar.period_id
         LEFT JOIN paintings pa ON pa.artist_id = ar.id
         GROUP BY ar.id, pe.slug, pe.name
         ORDER BY ar.born NULLS LAST`
      ),
    ]);
    return NextResponse.json({
      periods: periods.rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        startYear: p.start_year,
        endYear: p.end_year,
        blurb: p.blurb,
        color: p.color,
        sort: p.sort,
      })),
      artists: artists.rows.map((a) => ({
        id: a.id,
        slug: a.slug,
        periodSlug: a.period_slug,
        name: a.name,
        born: a.born,
        died: a.died,
        nationality: a.nationality,
        movement: a.period_name,
        bio: a.bio,
        significance: a.significance,
        portraitUrl: a.portrait_url,
        wikiUrl: a.wiki_url,
        paintingCount: a.painting_count,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
