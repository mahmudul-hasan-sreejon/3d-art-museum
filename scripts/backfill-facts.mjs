/**
 * Backfill the "FROM THE ARCHIVE" facts for paintings whose facts are empty.
 *
 * The seed route derives facts from leftover Wikipedia intro sentences, so
 * stub articles end up with none. This pulls structured metadata from
 * Wikidata (medium, collection, location, genre) instead, which exists even
 * for short articles, and writes museum-placard-style fact lines.
 *
 * Run:  node --env-file=.env.local scripts/backfill-facts.mjs [--dry]
 */
import pg from "pg";

const DRY = process.argv.includes("--dry");
const UA = "MuseaArtTimeline/1.0 (educational demo; facts backfill)";
const BATCH = 12;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL || "")
    ? false
    : { rejectUnauthorized: false },
});

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

async function fetchMeta(titles) {
  const values = titles.map((t) => `"${esc(t)}"@en`).join(" ");
  const query = `
SELECT ?title
  (GROUP_CONCAT(DISTINCT ?mediumLabel; separator=", ") AS ?media)
  (GROUP_CONCAT(DISTINCT ?collectionLabel; separator=", ") AS ?collections)
  (GROUP_CONCAT(DISTINCT ?genreLabel; separator=", ") AS ?genres)
WHERE {
  VALUES ?title { ${values} }
  ?article schema:about ?work ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
  OPTIONAL { ?work wdt:P186 ?m. ?m rdfs:label ?mediumLabel. FILTER(LANG(?mediumLabel)="en") }
  OPTIONAL { ?work wdt:P195 ?c. ?c rdfs:label ?collectionLabel. FILTER(LANG(?collectionLabel)="en") }
  OPTIONAL { ?work wdt:P136 ?g. ?g rdfs:label ?genreLabel. FILTER(LANG(?genreLabel)="en") }
}
GROUP BY ?title`;
  const url =
    "https://query.wikidata.org/sparql?format=json&query=" +
    encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error(`SPARQL ${res.status}`);
  const data = await res.json();
  const out = new Map();
  for (const b of data.results?.bindings ?? []) {
    out.set(b.title.value, {
      media: b.media?.value || "",
      collections: b.collections?.value || "",
      genres: b.genres?.value || "",
    });
  }
  return out;
}

// split a GROUP_CONCAT list, dedupe case-insensitively, and drop items that
// are substrings of another (e.g. "X Collection" vs "X Collection (1910-1930)")
function cleanList(s) {
  const items = s
    .split(", ")
    .map((x) => x.trim())
    .filter(Boolean);
  const kept = items.filter(
    (a, i) =>
      !items.some(
        (b, j) =>
          j !== i &&
          b.toLowerCase().includes(a.toLowerCase()) &&
          (b.length > a.length || j < i)
      )
  );
  return kept.join(", ");
}

function buildFacts(m) {
  const f = [];
  const media = cleanList(m.media);
  const collections = cleanList(m.collections);
  const genres = cleanList(m.genres);
  // P276 location is intentionally omitted: it frequently resolves to a
  // gallery room or storage depot ("Room A4", "Louvre storage") that reads
  // poorly; the P195 collection already names the owning institution.
  if (media) f.push(`Medium: ${media}.`);
  if (collections) f.push(`In the collection of the ${collections}.`);
  if (genres) f.push(`Genre: ${genres}.`);
  return f.slice(0, 4);
}

const { rows } = await pool.query(
  "SELECT id, title FROM paintings WHERE facts='[]'::jsonb ORDER BY id"
);
console.log(`${rows.length} paintings with empty facts`);

let filled = 0;
let still = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  let meta;
  try {
    meta = await fetchMeta(slice.map((r) => r.title));
  } catch (e) {
    console.error(`batch ${i}: ${e.message} — retrying once`);
    await sleep(2000);
    meta = await fetchMeta(slice.map((r) => r.title));
  }
  for (const r of slice) {
    const facts = buildFacts(meta.get(r.title) ?? {});
    if (!facts.length) {
      still++;
      continue;
    }
    if (DRY) {
      console.log(`• ${r.title}\n    ${facts.join("\n    ")}`);
    } else {
      await pool.query("UPDATE paintings SET facts=$1 WHERE id=$2", [
        JSON.stringify(facts),
        r.id,
      ]);
    }
    filled++;
  }
  process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  await sleep(350);
}

console.log(
  `\n${DRY ? "[dry] would fill" : "filled"} ${filled}, still empty ${still}`
);
await pool.end();
