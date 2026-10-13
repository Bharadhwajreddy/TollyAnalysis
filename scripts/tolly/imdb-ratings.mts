/**
 * Tolly Index — IMDb ratings for counted films, from IMDb's non-commercial datasets
 * (https://data.imdb.com/non-commercial-datasets/, personal/non-commercial use).
 * Films without an IMDb id from Wikidata are matched by title + year only when exactly
 * one movie in the whole dataset fits, so common titles ("Party", "Hit") are never guessed.
 *
 * Usage: npx tsx scripts/tolly/imdb-ratings.mts   (expects .cache/tolly/imdb/*.tsv.gz)
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";

const DIR = ".cache/tolly/imdb";
const norm = (t: string) => t.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

async function* rows(file: string) {
  const rl = createInterface({ input: createReadStream(`${DIR}/${file}`).pipe(createGunzip()), crlfDelay: Infinity });
  let header = true;
  for await (const line of rl) {
    if (header) {
      header = false;
      continue;
    }
    yield line.split("\t");
  }
}

const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const counted = new Set(snap.credits.filter((c: { include: boolean }) => c.include).map((c: { film: string }) => c.film));
const films = snap.films.filter((f: { key: string }) => counted.has(f.key)) as { key: string; title: string; year: number; releaseDate: string | null; imdbId: string | null }[];
const need = new Map<string, { key: string; year: number }[]>();
for (const f of films) {
  if (f.imdbId) continue;
  const k = norm(f.title);
  const year = Number((f.releaseDate ?? String(f.year)).slice(0, 4));
  need.set(k, [...(need.get(k) ?? []), { key: f.key, year }]);
}

// 1. Title matches for films without an id (movies and TV movies only).
const candidates = new Map<string, string[]>(); // film key -> tconsts
for await (const [tconst, type, primary, original, , start] of rows("title.basics.tsv.gz")) {
  if (type !== "movie" && type !== "tvMovie") continue;
  const y = Number(start);
  if (!y || y < 1999) continue;
  for (const t of new Set([norm(primary), norm(original)])) {
    for (const f of need.get(t) ?? []) if (Math.abs(f.year - y) <= 1) candidates.set(f.key, [...(candidates.get(f.key) ?? []), tconst]);
  }
}
const ids = new Map<string, { tconst: string; matchedBy: "wikidata" | "title-year" }>();
for (const f of films) if (f.imdbId) ids.set(f.key, { tconst: f.imdbId, matchedBy: "wikidata" });
let matched = 0;
for (const [key, list] of candidates) {
  const uniq = [...new Set(list)];
  if (uniq.length === 1) {
    ids.set(key, { tconst: uniq[0], matchedBy: "title-year" });
    matched++;
  }
}

// 2. Ratings.
const want = new Map([...ids].map(([k, v]) => [v.tconst, k]));
const out: Record<string, { tconst: string; matchedBy: string; rating: number | null; votes: number }> = {};
for (const [key, v] of ids) out[key] = { ...v, rating: null, votes: 0 };
for await (const [tconst, avg, votes] of rows("title.ratings.tsv.gz")) {
  const key = want.get(tconst);
  if (key) Object.assign(out[key], { rating: Number(avg), votes: Number(votes) });
}
writeFileSync(".cache/tolly/imdb-ours.json", JSON.stringify(out, null, 1));
const rated = Object.values(out).filter((r) => r.rating !== null);
console.log({ films: films.length, withId: ids.size, matchedByTitle: matched, rated: rated.length, rated100: rated.filter((r) => r.votes >= 100).length });
