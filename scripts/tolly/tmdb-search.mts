/**
 * Tolly Index — finds films with no IMDb link on TMDB (needs TMDB_API_READ_TOKEN). For each such
 * film, searches TMDB by title around its release year and accepts a result only when it is a
 * Telugu-language film, released within a year, with a matching title AND the hero in its top-billed
 * cast. The accepted film's IMDb id (if TMDB has one) links it to IMDb's ratings; its release date
 * is a second source for the year.
 *
 * Output: .cache/tolly/tmdb-search.json  { filmKey: { accepted, reason, tmdbId?, title?, releaseDate?, imdbId?, voteAverage?, voteCount?, heroBilled? } }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/tmdb-search.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { titleKey, titlesLooselyMatch, titlesMatch } from "@/lib/tolly/match";

const TOKEN = process.env.TMDB_API_READ_TOKEN;
if (!TOKEN) {
  console.log("TMDB search skipped: set TMDB_API_READ_TOKEN (TMDB → Settings → API → API Read Access Token).");
  process.exit(0);
}
const OUT = ".cache/tolly/tmdb-search.json";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const api = async <T,>(path: string): Promise<T> => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://api.themoviedb.org/3${path}`, { headers: { authorization: `Bearer ${TOKEN}`, accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 401) throw new Error("TMDB rejected the token (401). Check TMDB_API_READ_TOKEN.");
    await sleep(Math.max(2, Number(res.headers.get("retry-after")) || 2 ** attempt) * 1000);
  }
  throw new Error(`TMDB failed on ${path}`);
};

type Linked = { key: string; title: string; heroes: string[]; year: number; te: string | null; tconst: string | null };
type Result = { id: number; title: string; original_title: string; original_language: string; release_date?: string };
type Detail = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  external_ids?: { imdb_id?: string | null };
  credits?: { cast: { name: string; order: number }[] };
};

const linked: Linked[] = JSON.parse(readFileSync(".cache/tolly/films-linked.json", "utf8"));
const heroName: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8")).heroes as { slug: string; name: string }[]).map((h) => [h.slug, h.name]),
);
const nameKey = (n: string) => n.toLowerCase().replace(/[^a-z]/g, "");
const todo = linked.filter((l) => !l.tconst);
console.log(`TMDB search: ${todo.length} films without an IMDb link`);

const out: Record<string, object> = {};
for (const f of todo) {
  const queries = [...new Set([f.title, f.te].filter((q): q is string => !!q))];
  const seen = new Map<number, Result>();
  for (const q of queries) {
    for (const year of [f.year, f.year - 1, f.year + 1, null]) {
      const res = await api<{ results: Result[] }>(`/search/movie?query=${encodeURIComponent(q)}&include_adult=false${year ? `&primary_release_year=${year}` : ""}`);
      for (const r of res.results) seen.set(r.id, r);
      await sleep(50);
    }
  }
  const candidates = [...seen.values()].filter((r) => {
    const y = Number((r.release_date ?? "").slice(0, 4));
    const titleOk = [r.title, r.original_title].some((t) => titlesMatch(t, f.title) || titlesLooselyMatch(t, f.title) || (f.te && titleKey(t) === titleKey(f.te)));
    return r.original_language === "te" && y > 0 && Math.abs(y - f.year) <= 1 && titleOk;
  });
  const checked: (Detail & { heroBilled: number | null })[] = [];
  for (const c of candidates.slice(0, 4)) {
    const d = await api<Detail>(`/movie/${c.id}?append_to_response=external_ids,credits`);
    const billed = (d.credits?.cast ?? []).filter((m) => m.order < 6);
    const hit = f.heroes.map((s) => billed.find((m) => nameKey(m.name) === nameKey(heroName[s] ?? s))).find(Boolean);
    checked.push({ ...d, heroBilled: hit ? hit.order + 1 : null });
    await sleep(50);
  }
  const good = checked.filter((d) => d.heroBilled !== null);
  if (good.length === 1) {
    const d = good[0];
    out[f.key] = {
      accepted: true,
      reason: "Telugu, year ±1, title matches, hero top-billed",
      tmdbId: d.id,
      title: d.title,
      releaseDate: d.release_date || null,
      imdbId: d.external_ids?.imdb_id || null,
      voteAverage: d.vote_average,
      voteCount: d.vote_count,
      heroBilled: d.heroBilled,
    };
  } else {
    out[f.key] = {
      accepted: false,
      reason: good.length > 1 ? `${good.length} candidates fit; left for review` : candidates.length ? "title found but hero not in the top-billed cast" : "no Telugu film with this title within a year",
      candidates: checked.map((d) => ({ tmdbId: d.id, title: d.title, releaseDate: d.release_date, heroBilled: d.heroBilled })),
    };
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
const acc = Object.values(out).filter((v) => (v as { accepted: boolean }).accepted) as { imdbId: string | null; voteCount: number }[];
console.log(`done: ${acc.length} of ${todo.length} found on TMDB, ${acc.filter((a) => a.imdbId).length} with an IMDb id, ${acc.filter((a) => a.voteCount >= 10).length} with 10+ TMDB votes`);
