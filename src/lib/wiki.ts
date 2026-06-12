/**
 * All content fetchers. Everything returned here is verbatim Wikipedia /
 * Wikidata material — no generated facts.
 */

const UA = "MuseaArtTimeline/1.0 (educational demo; contact via repo)";

async function getJSON(url: string, accept = "application/json") {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} for ${url.slice(0, 120)}`);
  return res.json();
}

/** Split plain text into sentences, avoiding common abbreviation traps. */
export function sentences(text: string): string[] {
  const guarded = text
    .replace(/\b(c|ca|St|Mr|Mrs|Dr|Jr|Sr|no|No|vol|Vol|pp|approx)\.\s/g, "$1\u2024 ")
    .replace(/\b([A-Z])\.\s/g, "$1\u2024 ");
  return guarded
    .split(/(?<=[.!?])\s+(?=["'“‘(]?[A-Z0-9])/)
    .map((s) => s.replace(/\u2024/g, ".").trim())
    .filter((s) => s.length > 25);
}

export interface WikiPageInfo {
  title: string;
  extract: string; // plain-text intro, verbatim from Wikipedia
  thumbUrl: string | null; // sized thumbnail
  originalUrl: string | null;
  originalWidth: number;
  pageUrl: string;
}

/** Batched intro extracts + page images for up to 20 titles. */
export async function fetchPagesInfo(
  titles: string[],
  thumbSize = 1600
): Promise<Map<string, WikiPageInfo>> {
  const out = new Map<string, WikiPageInfo>();
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
      "&prop=extracts%7Cpageimages&exintro=1&explaintext=1&exlimit=20" +
      `&piprop=thumbnail%7Coriginal&pithumbsize=${thumbSize}&pilimit=20` +
      `&titles=${encodeURIComponent(batch.join("|"))}`;
    const data = await getJSON(url);
    const redirects: Record<string, string> = {};
    for (const r of data.query?.redirects ?? []) redirects[r.to] = r.from;
    const normalized: Record<string, string> = {};
    for (const n of data.query?.normalized ?? []) normalized[n.to] = n.from;
    for (const page of Object.values<any>(data.query?.pages ?? {})) {
      if (page.missing !== undefined || !page.title) continue;
      const info: WikiPageInfo = {
        title: page.title,
        extract: (page.extract ?? "").trim(),
        thumbUrl: page.thumbnail?.source ?? null,
        originalUrl: page.original?.source ?? null,
        originalWidth: page.original?.width ?? 0,
        pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(
          page.title.replace(/ /g, "_")
        )}`,
      };
      // map back through redirect/normalization chains so callers can
      // look up by the title they asked for
      out.set(page.title, info);
      const redirected = redirects[page.title];
      if (redirected) {
        out.set(redirected, info);
        if (normalized[redirected]) out.set(normalized[redirected], info);
      }
      if (normalized[page.title]) out.set(normalized[page.title], info);
    }
  }
  return out;
}

/** Short description line, e.g. "Italian painter (1571–1610)". */
export async function fetchDescription(title: string): Promise<string> {
  try {
    const data = await getJSON(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title.replace(/ /g, "_")
      )}`
    );
    return data.description ?? "";
  } catch {
    return "";
  }
}

export interface WikidataWork {
  title: string; // enwiki article title
  year: number | null;
}

export interface WikidataArtist {
  born: number | null;
  died: number | null;
  works: WikidataWork[];
}

/**
 * For an artist's enwiki title: life dates + their visual artworks that
 * have their own English Wikipedia article, most-notable first
 * (by sitelink count).
 */
export async function fetchArtistFromWikidata(
  enwikiTitle: string,
  limit = 24
): Promise<WikidataArtist> {
  const safe = enwikiTitle.replace(/"/g, '\\"');
  const query = `
SELECT ?birth ?death ?workArticle ?inception ?links WHERE {
  ?article schema:about ?artist ;
           schema:isPartOf <https://en.wikipedia.org/> ;
           schema:name "${safe}"@en .
  OPTIONAL { ?artist wdt:P569 ?birth. }
  OPTIONAL { ?artist wdt:P570 ?death. }
  OPTIONAL {
    ?work wdt:P170 ?artist ;
          wdt:P31/wdt:P279* wd:Q4502142 ;
          wikibase:sitelinks ?links .
    ?workArticle schema:about ?work ;
                 schema:isPartOf <https://en.wikipedia.org/> .
    OPTIONAL { ?work wdt:P571 ?inception. }
  }
}
ORDER BY DESC(?links)
LIMIT 80`;
  const url =
    "https://query.wikidata.org/sparql?format=json&query=" +
    encodeURIComponent(query);
  const data = await getJSON(url, "application/sparql-results+json");
  const rows: any[] = data.results?.bindings ?? [];
  const year = (v?: { value: string }) => {
    if (!v?.value) return null;
    const m = v.value.match(/^(-?\d{1,4})/);
    return m ? parseInt(m[1], 10) : null;
  };
  let born: number | null = null;
  let died: number | null = null;
  const seen = new Set<string>();
  const works: WikidataWork[] = [];
  for (const r of rows) {
    born = born ?? year(r.birth);
    died = died ?? year(r.death);
    if (r.workArticle?.value) {
      const title = decodeURIComponent(
        r.workArticle.value.split("/wiki/")[1] ?? ""
      ).replace(/_/g, " ");
      if (title && !seen.has(title)) {
        seen.add(title);
        works.push({ title, year: year(r.inception) });
        if (works.length >= limit) break;
      }
    }
  }
  return { born, died, works };
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
