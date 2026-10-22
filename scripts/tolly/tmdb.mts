/**
 * Tolly Index — second audience rating from TMDB (needs TMDB_API_READ_TOKEN, the "API Read Access
 * Token" from themoviedb.org → Settings → API). For every film linked to IMDb, looks the film up by
 * its IMDb id and keeps TMDB's average vote and vote count. Resumable; ~5 minutes for all films.
 * Without the token it says so and exits cleanly.
 *
 * Output: .cache/tolly/tmdb.json  { tconst: { id, title, releaseDate, language, voteAverage, voteCount } | null }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/tmdb.mts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const TOKEN = process.env.TMDB_API_READ_TOKEN;
if (!TOKEN) {
  console.log("TMDB skipped: set TMDB_API_READ_TOKEN (TMDB → Settings → API → API Read Access Token).");
  process.exit(0);
}
const OUT = ".cache/tolly/tmdb.json";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const linked: { tconst: string | null }[] = JSON.parse(readFileSync(".cache/tolly/films-linked.json", "utf8"));
type Hit = { id: number; title: string; releaseDate: string | null; language: string; voteAverage: number; voteCount: number };
const out: Record<string, Hit | null> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const todo = [...new Set(linked.map((l) => l.tconst).filter((t): t is string => !!t))].filter((t) => !(t in out));
console.log(`TMDB: ${todo.length} films to look up`);

let n = 0;
for (const tconst of todo) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://api.themoviedb.org/3/find/${tconst}?external_source=imdb_id`, { headers: { authorization: `Bearer ${TOKEN}`, accept: "application/json" } });
    if (res.status === 401) {
      console.error("TMDB rejected the token (401). Check TMDB_API_READ_TOKEN.");
      process.exit(1);
    }
    if (res.ok) {
      const json = (await res.json()) as {
        movie_results?: { id: number; title: string; release_date?: string; original_language: string; vote_average: number; vote_count: number }[];
      };
      const m = json.movie_results?.[0];
      out[tconst] = m
        ? { id: m.id, title: m.title, releaseDate: m.release_date || null, language: m.original_language, voteAverage: m.vote_average, voteCount: m.vote_count }
        : null;
      break;
    }
    await sleep(Math.max(2, Number(res.headers.get("retry-after")) || 2 ** attempt) * 1000);
  }
  if (++n % 50 === 0) {
    writeFileSync(OUT, JSON.stringify(out));
    console.log(`  ${n}/${todo.length}`);
  }
  await sleep(50);
}
writeFileSync(OUT, JSON.stringify(out));
const found = Object.values(out).filter(Boolean) as { voteCount: number }[];
console.log(`done: ${found.length} on TMDB, ${found.filter((f) => f.voteCount >= 10).length} with 10+ votes`);
