/**
 * LOCAL DEV ONLY. Served when DATABASE_URL is missing so the UI can be
 * developed in a sandbox without network access. Production always reads
 * the Wikipedia-seeded Postgres database.
 */
import { CURATION } from "./curation";
import { slugify } from "./wiki";

function ph(label: string, hue: number, w = 1200, h = 900): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
  <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
  <stop offset='0' stop-color='hsl(${hue},38%,30%)'/>
  <stop offset='1' stop-color='hsl(${(hue + 40) % 360},45%,14%)'/></linearGradient></defs>
  <rect width='${w}' height='${h}' fill='url(#g)'/>
  <circle cx='${w * 0.62}' cy='${h * 0.4}' r='${h * 0.22}' fill='hsl(${hue},50%,52%)' opacity='0.65'/>
  <rect x='${w * 0.12}' y='${h * 0.55}' width='${w * 0.5}' height='${h * 0.3}' fill='hsl(${(hue + 90) % 360},35%,40%)' opacity='0.5'/>
  <text x='50%' y='94%' text-anchor='middle' font-family='serif' font-size='${h * 0.05}' fill='#ece5d3'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const mockArtists = CURATION.flatMap((p, pi) =>
  p.artists.map((a, ai) => ({
    id: pi * 10 + ai,
    slug: slugify(a.wiki),
    periodSlug: p.slug,
    name: a.wiki,
    born: p.start + ai * 8,
    died: p.start + 60 + ai * 8,
    nationality: "Painter (mock data — production uses Wikipedia)",
    movement: p.name,
    bio: "Local placeholder biography. In production this text is the verbatim introduction of the artist's Wikipedia article, fetched at seed time and stored in Postgres.",
    significance:
      "Placeholder significance line — replaced by a verbatim Wikipedia sentence in production.",
    portraitUrl: ph(a.wiki, (pi * 47 + ai * 23) % 360, 600, 760),
    wikiUrl: "https://en.wikipedia.org/",
    paintingCount: 10,
  }))
);

export const MOCK_TIMELINE = {
  periods: CURATION.map((p, i) => ({
    id: i + 1,
    slug: p.slug,
    name: p.name,
    startYear: p.start,
    endYear: p.end,
    blurb:
      "Placeholder movement blurb — in production this is the verbatim opening of the movement's Wikipedia article.",
    color: p.color,
    sort: i,
  })),
  artists: mockArtists,
};

export function MOCK_ARTIST(slug: string) {
  const artist =
    mockArtists.find((a) => a.slug === slug) ?? mockArtists[0];
  return {
    artist,
    paintings: Array.from({ length: 10 }, (_, i) => ({
      id: i,
      title: `Untitled Study No. ${i + 1}`,
      yearText: String((artist.born ?? 1600) + 20 + i * 2),
      yearNum: (artist.born ?? 1600) + 20 + i * 2,
      imageUrl: ph(`${artist.name} — ${i + 1}`, (i * 36 + 12) % 360, 1600, i % 3 === 0 ? 1100 : 1300),
      thumbUrl: ph(`${artist.name} — ${i + 1}`, (i * 36 + 12) % 360, 1200, i % 3 === 0 ? 825 : 975),
      story:
        "Placeholder story. In production, this paragraph is the verbatim introduction of the painting's own Wikipedia article.",
      facts: [
        "Placeholder fact one — verbatim Wikipedia sentence in production.",
        "Placeholder fact two — verbatim Wikipedia sentence in production.",
        "Placeholder fact three — verbatim Wikipedia sentence in production.",
      ],
      wikiUrl: "https://en.wikipedia.org/",
    })),
  };
}
