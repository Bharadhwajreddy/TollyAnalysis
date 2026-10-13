/**
 * Tolly Index v0 — joins the real snapshot with IMDb ratings and Wikipedia page views, applies the
 * completeness gate and writes film and hero results to lib/data/tolly/.
 *
 * Inputs (run these first):
 *   npx tsx scripts/tolly/imdb-ratings.mts                       → .cache/tolly/imdb-ours.json
 *   NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/fetch-pageviews.mts → .cache/tolly/pageviews-60d.json
 * Usage: npm run tolly:compute -- [asOf=YYYY-MM-DD]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { scoreFilms, scoreHeroes, TOLLY_VERSION, v0Weights, type TollyFilmInput } from "@/lib/tolly";

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const snap = read("lib/data/real/snapshot.json");
const imdb: Record<string, { tconst: string; rating: number | null; votes: number | null }> = read(".cache/tolly/imdb-ours.json");
const views: Record<string, { views: number; days: number; from: string; to: string } | null> = read(".cache/tolly/pageviews-60d.json");
const teTitles: Record<string, string> = existsSync(".cache/import/tewiki-titles.json") ? read(".cache/import/tewiki-titles.json") : {};

const counted = snap.credits.filter((c: { include: boolean }) => c.include);
const countedFilms = new Set(counted.map((c: { film: string }) => c.film));
let viewsFrom = "";
let viewsTo = "";
const inputs: (TollyFilmInput & { tconst: string | null; enViews: number | null; teViews: number | null })[] = [];
for (const f of snap.films) {
  if (!countedFilms.has(f.key)) continue;
  const en = f.article ? views[`en:${f.article}`] : undefined;
  const te = f.qid && teTitles[f.qid] ? views[`te:${teTitles[f.qid]}`] : undefined;
  for (const v of [en, te]) {
    if (!v) continue;
    if (!viewsFrom || v.from < viewsFrom) viewsFrom = v.from;
    if (v.to > viewsTo) viewsTo = v.to;
  }
  const i = imdb[f.key];
  inputs.push({
    key: f.key,
    title: f.title,
    year: f.year,
    releaseDate: f.releaseDate ?? null,
    dateApproximate: !!f.dateApproximate,
    telugu: f.languages?.length ? f.languages.includes("Telugu") : null,
    imdbRating: i?.rating ?? null,
    imdbVotes: i?.votes ?? null,
    wikiViews: en || te ? (en?.views ?? 0) + (te?.views ?? 0) : null,
    tconst: i?.tconst ?? null,
    enViews: en?.views ?? null,
    teViews: te?.views ?? null,
  });
}

const films = scoreFilms(inputs, asOf);
const heroes = scoreHeroes(
  snap.heroes.map((h: { slug: string; name: string }) => ({ slug: h.slug, name: h.name, films: counted.filter((c: { hero: string }) => c.hero === h.slug).map((c: { film: string }) => c.film) })),
  films,
).sort((a, b) => (b.index ?? -1) - (a.index ?? -1) || b.complete - a.complete);

const byKey = new Map(inputs.map((i) => [i.key, i]));
const filmRows = films.map((r) => {
  const i = byKey.get(r.key)!;
  return { ...r, imdb: { tconst: i.tconst, rating: i.imdbRating, votes: i.imdbVotes }, wikipedia: { en: i.enViews, te: i.teViews } };
});
// IMDb's dataset licence is personal/non-commercial and does not allow republishing its numbers,
// so committed files carry only our derived scores; the full table stays in the gitignored cache.
const publicRows = filmRows.map((f) => {
  const { imdb, ...rest } = f;
  return { ...rest, imdb: { tconst: imdb.tconst } };
});
const count = (s: string) => films.filter((f) => f.status === s).length;
const meta = {
  version: TOLLY_VERSION,
  asOf,
  weights: v0Weights(),
  sources: {
    imdb: "IMDb non-commercial datasets (title.ratings.tsv.gz), downloaded " + asOf,
    wikipedia: `Wikimedia page views via the MediaWiki API, English + Telugu, ${viewsFrom} to ${viewsTo}`,
  },
  films: { total: films.length, complete: count("complete"), provisional: count("provisional"), incomplete: count("incomplete") },
  heroes: { total: heroes.length, qualified: heroes.filter((h) => h.qualified).length },
};

mkdirSync("lib/data/tolly", { recursive: true });
writeFileSync("lib/data/tolly/films.json", JSON.stringify({ meta, films: publicRows }));
writeFileSync("lib/data/tolly/heroes.json", JSON.stringify({ meta, heroes }, null, 1) + "\n");
const csv = (rows: (string | number | null)[][]) => rows.map((r) => r.map((v) => (v === null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n";
writeFileSync(
  "lib/data/tolly/heroes.csv",
  csv([["rank", "hero", "tolly_index", "complete_films", "films", "provisional", "spread", "best_films", "not_ranked_because"], ...heroes.map((h, i) => [h.qualified ? i + 1 : null, h.name, h.index, h.complete, h.films, h.provisional, h.spread, h.best.map((b) => `${b.title} (${b.year}) ${b.index}`).join("; "), h.reason])]),
);
const filmCsv = (full: boolean) =>
  csv([
    ["film", "year", "status", ...(full ? ["imdb_rating", "imdb_votes"] : []), "wiki_views_60d", "rating_adj", "rating", "reach", "stay", "raw", "confidence", "tolly_index", "missing"],
    ...filmRows.map((f) => [f.title, f.year, f.status, ...(full ? [f.imdb.rating, f.imdb.votes] : []), byKey.get(f.key)!.wikiViews, f.ratingAdjusted, f.pillars.rating, f.pillars.reach, f.pillars.stay, f.raw, f.confidence, f.index, f.missing.join("; ")]),
  ]);
writeFileSync("lib/data/tolly/films.csv", filmCsv(false));
writeFileSync(".cache/tolly/films-full.csv", filmCsv(true));
console.log(JSON.stringify(meta, null, 1));
for (const [i, h] of heroes.entries()) console.log(`${String(i + 1).padStart(2)} ${h.name.padEnd(24)} ${h.index ?? "—"}  ${h.complete}/${h.films}${h.reason ? "  (" + h.reason + ")" : ""}`);
