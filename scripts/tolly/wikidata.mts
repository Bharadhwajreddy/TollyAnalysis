/**
 * Tolly Index — Wikidata collector (CC0, query service, no key).
 *   1. Heroes: IMDb person id, birth date, photo, career start.
 *   2. Films by cast: every film item that lists one of our heroes as a cast member (P161),
 *      used to link filmography rows that have no Wikipedia article.
 *   3. Film details for every linked film: release dates, original language, IMDb id,
 *      Wikipedia articles (English, Telugu) and the number of Wikipedia language editions.
 *
 * Output: .cache/tolly/wikidata.json
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/wikidata.mts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const UA = "TollywoodAnalysis/0.4 (https://github.com/Bharadhwajreddy/TollyAnalysis; contact saibharadhwajreddy@gmail.com)";
const OUT = ".cache/tolly/wikidata.json";
mkdirSync(".cache/tolly", { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Binding = Record<string, { value: string } | undefined>;
async function sparql(query: string): Promise<Binding[]> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: { "user-agent": UA, accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ query }),
    });
    const text = await res.text();
    if (res.ok) {
      try {
        return (JSON.parse(text) as { results: { bindings: Binding[] } }).results.bindings;
      } catch {
        // A query that times out server-side returns a truncated body with status 200.
      }
    }
    const wait = Math.max(10, Number(res.headers.get("retry-after")) || 0);
    console.log(`  ${res.status} (${text.length} bytes), waiting ${wait}s`);
    await sleep(wait * 1000);
  }
  throw new Error("Wikidata query failed");
}

const id = (b: Binding, k: string) => b[k]?.value.replace("http://www.wikidata.org/entity/", "") ?? null;
const val = (b: Binding, k: string) => b[k]?.value ?? null;
const title = (b: Binding, k: string) => (b[k] ? decodeURIComponent(b[k]!.value.replace(/^https:\/\/\w+\.wikipedia\.org\/wiki\//, "")).replace(/_/g, " ") : null);

const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const heroQids: string[] = snap.heroes.map((h: { qid: string }) => h.qid);

// 1. Heroes
const heroRows = await sparql(`SELECT ?h ?imdb ?birth ?image ?start WHERE {
  VALUES ?h { ${heroQids.map((q) => `wd:${q}`).join(" ")} }
  OPTIONAL { ?h wdt:P345 ?imdb } OPTIONAL { ?h wdt:P569 ?birth } OPTIONAL { ?h wdt:P18 ?image } OPTIONAL { ?h wdt:P2031 ?start } }`);
const heroes: Record<string, { imdb: string[]; birth: string | null; image: string | null; careerStart: string | null }> = {};
for (const b of heroRows) {
  const h = (heroes[id(b, "h")!] ??= { imdb: [], birth: null, image: null, careerStart: null });
  const imdb = val(b, "imdb");
  if (imdb?.startsWith("nm") && !h.imdb.includes(imdb)) h.imdb.push(imdb);
  h.birth ??= val(b, "birth")?.slice(0, 10) ?? null;
  h.image ??= val(b, "image");
  h.careerStart ??= val(b, "start")?.slice(0, 4) ?? null;
}
console.log(`heroes: ${Object.keys(heroes).length}, with IMDb id ${Object.values(heroes).filter((h) => h.imdb.length).length}`);

// 2 + 3. Films: everything listing a hero as cast, plus every film QID the snapshot already links.
export interface WdFilm {
  qid: string;
  label: string | null;
  cast: string[];
  dates: string[];
  languages: string[];
  imdb: string[];
  en: string | null;
  te: string | null;
  sitelinks: number;
}
const films: Record<string, WdFilm> = {};
const FIELDS = `OPTIONAL { ?film wdt:P577 ?date } OPTIONAL { ?film wdt:P345 ?imdb }
  OPTIONAL { ?film wdt:P364 ?lang . ?lang rdfs:label ?langLabel FILTER(LANG(?langLabel) = "en") }
  OPTIONAL { ?en schema:about ?film ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?te schema:about ?film ; schema:isPartOf <https://te.wikipedia.org/> }
  OPTIONAL { ?film wikibase:sitelinks ?links }
  OPTIONAL { ?film rdfs:label ?label FILTER(LANG(?label) = "en") }`;
function absorb(rows: Binding[]) {
  for (const b of rows) {
    const q = id(b, "film")!;
    const f = (films[q] ??= { qid: q, label: null, cast: [], dates: [], languages: [], imdb: [], en: null, te: null, sitelinks: 0 });
    f.label ??= val(b, "label");
    const push = (arr: string[], v: string | null) => v && !arr.includes(v) && arr.push(v);
    push(f.cast, id(b, "hero"));
    push(f.dates, val(b, "date")?.slice(0, 10) ?? null);
    push(f.languages, val(b, "langLabel"));
    if (val(b, "imdb")?.startsWith("tt")) push(f.imdb, val(b, "imdb"));
    f.en ??= title(b, "en");
    f.te ??= title(b, "te");
    f.sitelinks = Math.max(f.sitelinks, Number(val(b, "links") ?? 0));
  }
}
absorb(await sparql(`SELECT ?hero ?film ?label ?date ?langLabel ?imdb ?en ?te ?links WHERE {
  VALUES ?hero { ${heroQids.map((q) => `wd:${q}`).join(" ")} } ?film wdt:P161 ?hero . ${FIELDS} }`));
console.log(`films by cast: ${Object.keys(films).length}`);
const known: string[] = [...new Set<string>(snap.films.map((f: { qid: string | null }) => f.qid).filter(Boolean))];
for (let i = 0; i < known.length; i += 100) {
  absorb(await sparql(`SELECT ?film ?label ?date ?langLabel ?imdb ?en ?te ?links WHERE { VALUES ?film { ${known.slice(i, i + 100).map((q) => `wd:${q}`).join(" ")} } ${FIELDS} }`));
  await sleep(1000);
}
console.log(`films total: ${Object.keys(films).length}`);
writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), heroes, films }));
