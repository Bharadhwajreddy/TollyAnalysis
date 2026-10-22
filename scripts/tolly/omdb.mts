/**
 * Tolly Index — OMDb lookups (needs OMDB_API_KEY; the free key allows 1,000 requests a day).
 * 1. Films with no IMDb link: title search (year ±1), kept only for a Telugu-language movie whose
 *    actors include the hero. OMDb indexes IMDb, so a hit is an IMDb id our dataset match missed.
 * 2. Linked films, most-voted first: Rotten Tomatoes and Metacritic scores where OMDb has them
 *    (critics cross-check only). OMDb's copy of IMDb ratings is stale, so those are not used.
 * Resumable: stops at the daily cap and continues on the next run.
 *
 * Output: .cache/tolly/omdb.json  { search: { filmKey: {...} }, ratings: { tconst: { rt, metacritic } | null } }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/omdb.mts [maxRequests=950]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { titlesLooselyMatch, titlesMatch } from "@/lib/tolly/match";

const KEY = process.env.OMDB_API_KEY;
if (!KEY) {
  console.log("OMDb skipped: set OMDB_API_KEY (omdbapi.com → API Key → free tier).");
  process.exit(0);
}
const OUT = ".cache/tolly/omdb.json";
const MAX = Number(process.argv[2] ?? 950);
let used = 0;
const get = async <T,>(params: Record<string, string>): Promise<T | null> => {
  if (used >= MAX) return null;
  used++;
  const url = `https://www.omdbapi.com/?${new URLSearchParams({ ...params, apikey: KEY as string })}`;
  let res: Response | null = null;
  for (let attempt = 0; attempt < 5 && !res; attempt++) {
    res = await fetch(url).catch(async () => (await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt)), null));
  }
  if (!res) throw new Error("OMDb unreachable after 5 attempts");
  if (res.status === 401) {
    const body = await res.text();
    if (/limit/i.test(body)) {
      console.log("Daily limit reached; run again tomorrow.");
      used = MAX;
      return null;
    }
    throw new Error(`OMDb 401: ${body.slice(0, 120)}`);
  }
  return res.ok ? ((await res.json()) as T) : null;
};

type Linked = { key: string; title: string; heroes: string[]; year: number; tconst: string | null; imdbVotes: number };
type Detail = { Response: string; Title: string; Year: string; Type: string; Language: string; Actors: string; imdbID: string; Ratings?: { Source: string; Value: string }[] };
const linked: Linked[] = JSON.parse(readFileSync(".cache/tolly/films-linked.json", "utf8"));
const heroName: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8")).heroes as { slug: string; name: string }[]).map((h) => [h.slug, h.name]),
);
const nameKey = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "");
const out: { search: Record<string, object>; ratings: Record<string, { rt: number | null; metacritic: number | null } | null> } = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { search: {}, ratings: {} };

for (const f of linked.filter((l) => !l.tconst && !(l.key in out.search))) {
  const hits = new Map<string, { imdbID: string; Title: string; Year: string }>();
  for (const y of [f.year, f.year - 1, f.year + 1]) {
    const s = await get<{ Search?: { imdbID: string; Title: string; Year: string }[] }>({ s: f.title, y: String(y), type: "movie" });
    if (!s) break;
    for (const h of s.Search ?? []) if (titlesMatch(h.Title, f.title) || titlesLooselyMatch(h.Title, f.title)) hits.set(h.imdbID, h);
  }
  if (used >= MAX) break;
  const ok: Detail[] = [];
  for (const h of [...hits.values()].slice(0, 4)) {
    const d = await get<Detail>({ i: h.imdbID });
    if (d?.Response === "True" && /telugu/i.test(d.Language) && f.heroes.some((s) => d.Actors.split(",").some((a) => nameKey(a) === nameKey(heroName[s] ?? s)))) ok.push(d);
  }
  writeFileSync(OUT, JSON.stringify(out));
  out.search[f.key] = ok.length === 1 ? { accepted: true, imdbId: ok[0].imdbID, title: ok[0].Title, year: ok[0].Year } : { accepted: false, candidates: [...hits.keys()], matched: ok.length };
}

// "85%" → 85, "67/100" → 67
const pct = (v?: string) => (v ? Number(v.split("/")[0].replace(/[^0-9.]/g, "")) : null);
for (const f of linked.filter((l) => l.tconst && !(l.tconst in out.ratings)).sort((a, b) => b.imdbVotes - a.imdbVotes)) {
  const d = await get<Detail>({ i: f.tconst as string });
  if (!d) break;
  const r = (src: string) => pct(d.Ratings?.find((x) => x.Source === src)?.Value);
  out.ratings[f.tconst as string] = d.Response === "True" ? { rt: r("Rotten Tomatoes"), metacritic: r("Metacritic") } : null;
  if (used % 100 === 0) writeFileSync(OUT, JSON.stringify(out));
}
writeFileSync(OUT, JSON.stringify(out));
const rv = Object.values(out.ratings).filter(Boolean) as { rt: number | null; metacritic: number | null }[];
console.log(
  `done: ${used} requests; search found ${Object.values(out.search).filter((v) => (v as { accepted: boolean }).accepted).length} of ${Object.keys(out.search).length}; ` +
    `${Object.keys(out.ratings).length} films checked for critics: ${rv.filter((v) => v.rt !== null).length} with Rotten Tomatoes, ${rv.filter((v) => v.metacritic !== null).length} with Metacritic`,
);
