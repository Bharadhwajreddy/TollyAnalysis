/**
 * Tolly Index — second pass over IMDb's non-commercial datasets (streamed, never stored whole):
 *   1. Billing order of the actors in every film we linked, so each lead credit can be checked
 *      against a second source (Wikipedia's billing vs IMDb's cast order).
 *   2. For films still without an IMDb title: search every Indian movie title on IMDb (titles
 *      released in India, from title.akas) for one with the same title, give or take spelling,
 *      released within a year. Accepted only when exactly one title fits.
 *
 * Needs: .cache/tolly/films-linked.json, .cache/tolly/imdb/title.basics.tsv.gz
 * Output: .cache/tolly/imdb-extra.json
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/imdb-extra.mts
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { soundKey } from "@/lib/tolly/match";

const UA = "TollywoodAnalysis/0.5 (contact saibharadhwajreddy@gmail.com)";
async function* lines(file: string) {
  const local = `.cache/tolly/imdb/${file}`;
  let input: NodeJS.ReadableStream;
  if (existsSync(local)) input = createReadStream(local);
  else {
    const res = await fetch(`https://datasets.imdbws.com/${file}`, { headers: { "user-agent": UA } });
    if (!res.ok || !res.body) throw new Error(`${file}: ${res.status}`);
    input = Readable.fromWeb(res.body as never);
  }
  const rl = createInterface({ input: input.pipe(createGunzip()), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) if (n++) yield line.split("\t");
}

const linked: { key: string; title: string; year: number; tconst: string | null }[] = JSON.parse(readFileSync(".cache/tolly/films-linked.json", "utf8"));
const ours = new Set(linked.map((f) => f.tconst).filter((t): t is string => !!t));
const unlinked = linked.filter((f) => !f.tconst);
const wantKeys = new Map<string, typeof unlinked>();
for (const f of unlinked) wantKeys.set(soundKey(f.title), [...(wantKeys.get(soundKey(f.title)) ?? []), f]);
console.log(`${ours.size} linked titles, ${unlinked.length} films still unlinked`);

// 1. Actor billing order for our titles.
const actors: Record<string, { ordering: number; nconst: string }[]> = {};
for await (const [tconst, ordering, nconst, category] of lines("title.principals.tsv.gz")) {
  if (!ours.has(tconst) || (category !== "actor" && category !== "actress")) continue;
  (actors[tconst] ??= []).push({ ordering: Number(ordering), nconst });
}
for (const list of Object.values(actors)) list.sort((a, b) => a.ordering - b.ordering);
console.log(`actor order for ${Object.keys(actors).length} titles`);

// 2. Indian titles whose name sounds like an unlinked film.
const indian = new Set<string>();
const candidates = new Map<string, Set<string>>(); // tconst -> film keys it may be
for await (const [tconst, , title, region] of lines("title.akas.tsv.gz")) {
  if (region !== "IN") continue;
  indian.add(tconst);
  for (const f of wantKeys.get(soundKey(title)) ?? []) candidates.set(tconst, (candidates.get(tconst) ?? new Set()).add(f.key));
}
for await (const [tconst, type, primary, original, , start] of lines("title.basics.tsv.gz")) {
  if (!indian.has(tconst)) continue;
  for (const t of [primary, original]) for (const f of wantKeys.get(soundKey(t)) ?? []) candidates.set(tconst, (candidates.get(tconst) ?? new Set()).add(f.key));
  const hit = candidates.get(tconst);
  if (!hit) continue;
  const y = Number(start);
  // Keep only feature films released within a year of the filmography year.
  for (const key of [...hit]) {
    const f = linked.find((x) => x.key === key)!;
    if (!(type === "movie" || type === "tvMovie") || !y || Math.abs(y - f.year) > 1) hit.delete(key);
  }
  if (!hit.size) candidates.delete(tconst);
}
const byFilm = new Map<string, string[]>();
for (const [tconst, keys] of candidates) for (const k of keys) byFilm.set(k, [...(byFilm.get(k) ?? []), tconst]);
const links: Record<string, string> = {};
const ambiguous: Record<string, string[]> = {};
for (const [key, list] of byFilm) {
  const uniq = [...new Set(list)].filter((t) => !ours.has(t));
  if (uniq.length === 1) links[key] = uniq[0];
  else if (uniq.length > 1) ambiguous[key] = uniq;
}
console.log(`unique Indian-title matches: ${Object.keys(links).length}, ambiguous: ${Object.keys(ambiguous).length}`);
writeFileSync(".cache/tolly/imdb-extra.json", JSON.stringify({ fetchedAt: new Date().toISOString(), actors, links, ambiguous }));
