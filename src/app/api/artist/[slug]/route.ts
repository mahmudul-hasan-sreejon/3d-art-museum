import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { MOCK_ARTIST } from "@/lib/mock";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(MOCK_ARTIST(params.slug));
  }
  try {
    const pool = getPool();
    const { rows: ar } = await pool.query(
      `SELECT ar.*, pe.name AS period_name, pe.slug AS period_slug
       FROM artists ar JOIN periods pe ON pe.id = ar.period_id
       WHERE ar.slug = $1`,
      [params.slug]
    );
    if (!ar.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const a = ar[0];
    const { rows: works } = await pool.query(
      "SELECT * FROM paintings WHERE artist_id=$1 ORDER BY sort",
      [a.id]
    );
    return NextResponse.json({
      artist: {
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
        paintingCount: works.length,
      },
      paintings: works.map((w) => ({
        id: w.id,
        title: w.title,
        yearText: w.year_text,
        yearNum: w.year_num,
        imageUrl: w.image_url,
        thumbUrl: w.thumb_url,
        story: w.story,
        facts: w.facts,
        wikiUrl: w.wiki_url,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
