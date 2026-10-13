/**
 * Tolly Index — every IMDb title each hero is credited in, from IMDb's non-commercial datasets
 * (title.principals for cast and billing order, title.akas for alternate titles). The files are
 * streamed and filtered on the fly, never stored whole.
 *
 * Needs .cache/tolly/wikidata.json (hero IMDb ids).
 * Output: .cache/tolly/imdb-cast.json
 *   { heroes: { slug: [{ tconst, ordering, category }] }, akas: { tconst: [titles] } }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/imdb-cast.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";

const BASE = "https://datasets.imdbws.com";
const UA = "TollywoodAnalysis/0.4 (contact saibharadhwajreddy@gmail.com)";

async function* stream(file: string) {
  const res = await fetch(`${BASE}/${file}`, { headers: { "user-agent": UA } });
  if (!res.ok || !res.body) throw new Error(`${file}: ${res.status}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body as never).pipe(createGunzip()), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (n++ === 0) continue;
    if (n % 20_000_000 === 0) console.log(`  ${file}: ${n / 1e6}M rows`);
    yield line;
  }
}

const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const wd = JSON.parse(readFileSync(".cache/tolly/wikidata.json", "utf8"));
const heroByNconst = new Map<string, string>();
for (const h of snap.heroes) for (const n of wd.heroes[h.qid]?.imdb ?? []) heroByNconst.set(n, h.slug);
console.log(`${heroByNconst.size} IMDb person ids`);

const heroes: Record<string, { tconst: string; ordering: number; category: string }[]> = {};
for await (const line of stream("title.principals.tsv.gz")) {
  // tconst ordering nconst category job characters
  const t1 = line.indexOf("\t");
  const t2 = line.indexOf("\t", t1 + 1);
  const t3 = line.indexOf("\t", t2 + 1);
  const slug = heroByNconst.get(line.slice(t2 + 1, t3));
  if (!slug) continue;
  const t4 = line.indexOf("\t", t3 + 1);
  (heroes[slug] ??= []).push({ tconst: line.slice(0, t1), ordering: Number(line.slice(t1 + 1, t2)), category: line.slice(t3 + 1, t4) });
}
const tconsts = new Set(Object.values(heroes).flatMap((rows) => rows.map((r) => r.tconst)));
console.log(`principals: ${tconsts.size} titles for ${Object.keys(heroes).length} heroes`);

const akas: Record<string, string[]> = {};
for await (const line of stream("title.akas.tsv.gz")) {
  const t1 = line.indexOf("\t");
  const tconst = line.slice(0, t1);
  if (!tconsts.has(tconst)) continue;
  const title = line.split("\t")[2];
  const list = (akas[tconst] ??= []);
  if (!list.includes(title)) list.push(title);
}
console.log(`akas: ${Object.keys(akas).length} titles with alternate names`);
writeFileSync(".cache/tolly/imdb-cast.json", JSON.stringify({ fetchedAt: new Date().toISOString(), heroes, akas }));
