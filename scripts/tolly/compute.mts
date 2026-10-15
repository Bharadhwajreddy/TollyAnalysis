/**
 * Tolly Index v1 — scores every counted film and hero from the linked data, applies the
 * completeness gate and writes the results to lib/data/tolly/.
 *
 * Inputs (run in this order; all cached under .cache/tolly):
 *   npm run tolly:wikidata    → wikidata.json        (hero IMDb ids, films by cast, film details)
 *   npm run tolly:imdb        → imdb-ours.json       (IMDb ids matched by title and year)
 *   npm run tolly:cast        → imdb-cast.json       (every IMDb title each hero is credited in)
 *   npm run tolly:link        → films-linked.json    (one record per film, with the source of each field)
 *   npm run tolly:pageviews   → pageviews-60d.json   (Wikipedia views, English + Telugu)
 * Usage: npm run tolly:compute -- [asOf=YYYY-MM-DD]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { correlation, criticScores } from "@/lib/tolly/critics";
import { MIN_VOTES, scoreFilms, scoreHeroes, TOLLY_VERSION, WEIGHTS, type TollyFilmInput } from "@/lib/tolly";

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const snap = read("lib/data/real/snapshot.json");
const linked: {
  key: string;
  title: string;
  heroes: string[];
  year: number;
  yearSources: { filmography: number; wikidata: number | null; imdb: number | null };
  releaseDate: string | null;
  releaseDateBy: string | null;
  telugu: boolean | null;
  languageBy: string | null;
  qid: string | null;
  qidBy: string | null;
  tconst: string | null;
  tconstBy: string | null;
  imdbRating: number | null;
  imdbVotes: number;
  en: string | null;
  te: string | null;
  sitelinks: number | null;
  imdbActorRank?: Record<string, number | null>;
}[] = read(".cache/tolly/films-linked.json");
// Filmographies sometimes spell one film two ways ("RRR" / "RRR (film)"). Rows that resolve to the
// same IMDb title are one film: keep the row with a Wikipedia article and merge the heroes into it.
const alias = new Map<string, string>();
{
  const byTconst = new Map<string, (typeof linked)[number]>();
  for (const l of [...linked].sort((a, b) => Number(a.key.startsWith("unlinked:")) - Number(b.key.startsWith("unlinked:")))) {
    if (!l.tconst) continue;
    const first = byTconst.get(l.tconst);
    if (!first) byTconst.set(l.tconst, l);
    else {
      alias.set(l.key, first.key);
      first.heroes = [...new Set([...first.heroes, ...l.heroes])];
    }
  }
}
const linkedFilms = linked.filter((l) => !alias.has(l.key)).map((l) => ({ ...l, title: l.title.replace(/&nbsp;|\u00a0/g, " ") }));
const views: Record<string, { views: number; from: string; to: string } | null> = read(".cache/tolly/pageviews-60d.json");
const pages: Record<string, string> = read(".cache/import/pages.json");
const profiles: { slug: string; birthDate: string | null; birthDateBy: string | null; debutYear: number | null; debutYearBy: string | null; hasFreePhoto: boolean; imdb: string[] }[] = read(
  ".cache/tolly/heroes-profile.json",
);

let viewsFrom = "";
let viewsTo = "";
const inputs: (TollyFilmInput & { l: (typeof linked)[number]; enViews: number | null; teViews: number | null; critics: number[] })[] = linkedFilms.map((l) => {
  const lookup = (k: string | null) => (k ? views[k] : undefined);
  const en = lookup(l.en ? `en:${l.en}` : null);
  const te = lookup(l.te ? `te:${l.te}` : null);
  for (const v of [en, te]) {
    if (!v) continue;
    if (!viewsFrom || v.from < viewsFrom) viewsFrom = v.from;
    if (v.to > viewsTo) viewsTo = v.to;
  }
  // An article we know of but have no views for is missing data; no article at all is a measured zero.
  const fetched = (title: string | null, v: typeof en) => !title || v !== undefined;
  const wikiViews = fetched(l.en, en) && fetched(l.te, te) ? (en?.views ?? 0) + (te?.views ?? 0) : null;
  const editions = l.sitelinks ?? (l.en ? 1 : 0) + (l.te ? 1 : 0);
  return {
    key: l.key,
    title: l.title,
    year: l.year,
    releaseDate: l.releaseDate,
    telugu: l.telugu,
    linked: !!l.tconst,
    yearConfirmed: [l.yearSources.wikidata, l.yearSources.imdb].some((y) => y !== null && Math.abs(y - l.year) <= 1),
    imdbRating: l.imdbRating,
    imdbVotes: l.imdbVotes,
    editions,
    wikiViews,
    l,
    enViews: en?.views ?? null,
    teViews: te?.views ?? null,
    critics: l.en && pages[l.en] ? criticScores(pages[l.en]) : [],
  };
});

const films = scoreFilms(inputs, asOf);
const counted = snap.credits.filter((c: { include: boolean }) => c.include);
const heroes = scoreHeroes(
  snap.heroes.map((h: { slug: string; name: string }) => ({ slug: h.slug, name: h.name, films: counted.filter((c: { hero: string }) => c.hero === h.slug).map((c: { film: string }) => alias.get(c.film) ?? c.film) })),
  films,
).sort((a, b) => (b.index ?? -1) - (a.index ?? -1) || b.complete / Math.max(1, b.judged) - a.complete / Math.max(1, a.judged));

// Cross-check: do critics agree with the audience Rating pillar?
const byKey = new Map(inputs.map((i) => [i.key, i]));
const pairs = films.filter((f) => f.status === "complete" && byKey.get(f.key)!.critics.length).map((f) => [byKey.get(f.key)!.critics.reduce((a, b) => a + b, 0) / byKey.get(f.key)!.critics.length, f.ratingAdjusted as number]);
const critics = { films: pairs.length, correlation: pairs.length > 2 ? Math.round(correlation(pairs.map((p) => p[0]), pairs.map((p) => p[1])) * 100) / 100 : null };
// Second audience source (MovieLens, research licence): too thin to be an input, so a cross-check on IMDb.
const movielens: Record<string, { votes: number; mean: number }> = existsSync(".cache/tolly/movielens-ours.json") ? read(".cache/tolly/movielens-ours.json") : {};
const mlPairs = linkedFilms.filter((l) => l.tconst && l.imdbRating !== null && (movielens[l.tconst]?.votes ?? 0) >= 10).map((l) => [movielens[l.tconst!].mean, l.imdbRating as number]);
const movielensCheck = {
  films: Object.keys(movielens).length,
  with10: mlPairs.length,
  correlation: mlPairs.length > 2 ? Math.round(correlation(mlPairs.map((p) => p[0]), mlPairs.map((p) => p[1])) * 100) / 100 : null,
};
// Lead credit vs IMDb's cast order (tested as a second check; IMDb's order does not follow billing reliably).
const ranks = linkedFilms.flatMap((l) => Object.values(l.imdbActorRank ?? {}));
const leadCheck = { credits: ranks.length, top3: ranks.filter((r) => r !== null && r <= 3).length, lower: ranks.filter((r) => r !== null && r > 3).length, notListed: ranks.filter((r) => r === null).length };

const count = (s: string) => films.filter((f) => f.status === s).length;
const tally = (k: keyof (typeof linked)[number]) => {
  const t: Record<string, number> = {};
  for (const l of linkedFilms) {
    const v = String(l[k] ?? "missing");
    t[v] = (t[v] ?? 0) + 1;
  }
  return t;
};
const missingTally: Record<string, number> = {};
for (const f of films) if (f.status === "incomplete") for (const m of f.missing) missingTally[m] = (missingTally[m] ?? 0) + 1;
const meta = {
  version: TOLLY_VERSION,
  asOf,
  weights: WEIGHTS,
  minVotes: MIN_VOTES,
  sources: {
    imdb: `IMDb non-commercial datasets (title.basics, title.ratings, title.principals, title.akas), ${asOf}`,
    wikidata: "Wikidata query service (CC0): films by cast, release dates, languages, IMDb ids, language editions",
    wikipedia: `Wikimedia page views via the MediaWiki API, English + Telugu, ${viewsFrom} to ${viewsTo}`,
  },
  films: { total: films.length, complete: count("complete"), provisional: count("provisional"), incomplete: count("incomplete"), excluded: count("excluded") },
  heroes: { total: heroes.length, qualified: heroes.filter((h) => h.qualified).length },
  provenance: { imdb: tally("tconstBy"), wikidata: tally("qidBy"), releaseDate: tally("releaseDateBy"), language: tally("languageBy") },
  missing: missingTally,
  critics,
  movielens: movielensCheck,
  leadCheck,
};

// IMDb's dataset licence is personal/non-commercial and does not allow republishing its numbers,
// so committed files carry only our derived scores; the full table stays in the gitignored cache.
const filmRows = films.map((r) => {
  const i = byKey.get(r.key)!;
  return {
    ...r,
    heroes: i.l.heroes,
    ids: { imdb: i.l.tconst, wikidata: i.l.qid },
    sources: { imdb: i.l.tconstBy, wikidata: i.l.qidBy, releaseDate: i.l.releaseDateBy, language: i.l.languageBy },
    wikipedia: { en: i.enViews, te: i.teViews, editions: i.editions },
    critics: i.critics.length ? { reviews: i.critics.length, average: Math.round((i.critics.reduce((a, b) => a + b, 0) / i.critics.length) * 10) / 10 } : null,
  };
});
const profileBySlug = new Map(profiles.map((p) => [p.slug, p]));
const heroRows = heroes.map((h) => ({ ...h, profile: profileBySlug.get(h.slug) ?? null }));

mkdirSync("lib/data/tolly", { recursive: true });
writeFileSync("lib/data/tolly/films.json", JSON.stringify({ meta, films: filmRows }));
writeFileSync("lib/data/tolly/heroes.json", JSON.stringify({ meta, heroes: heroRows }, null, 1) + "\n");
const csv = (rows: (string | number | null)[][]) => rows.map((r) => r.map((v) => (v === null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n";
writeFileSync(
  "lib/data/tolly/heroes.csv",
  csv([
    ["rank", "hero", "tolly_index", "band", "rating", "reach", "stay", "complete_films", "judged_films", "provisional", "spread", "best_films", "not_ranked_because"],
    ...heroes.map((h, i) => [h.qualified ? i + 1 : null, h.name, h.index, h.band, h.pillars?.rating ?? null, h.pillars?.reach ?? null, h.pillars?.stay ?? null, h.complete, h.judged, h.provisional, h.spread, h.best.map((b) => `${b.title} (${b.year}) ${b.index}`).join("; "), h.reason]),
  ]),
);
const filmCsv = (full: boolean) =>
  csv([
    ["film", "year", "heroes", "status", ...(full ? ["imdb_rating", "imdb_votes"] : []), "editions", "wiki_views_60d", "rating_adj", "rating", "reach", "stay", "raw", "confidence", "tolly_index", "critics_avg", "missing"],
    ...filmRows.map((f) => {
      const i = byKey.get(f.key)!;
      return [f.title, f.year, f.heroes.join(" "), f.status, ...(full ? [i.imdbRating, i.imdbVotes] : []), i.editions, i.wikiViews, f.ratingAdjusted, f.pillars.rating, f.pillars.reach, f.pillars.stay, f.raw, f.confidence, f.index, f.critics?.average ?? null, f.missing.join("; ")];
    }),
  ]);
writeFileSync("lib/data/tolly/films.csv", filmCsv(false));
writeFileSync(".cache/tolly/films-full.csv", filmCsv(true));
console.log(JSON.stringify(meta, null, 1));
for (const [i, h] of heroes.entries()) console.log(`${String(i + 1).padStart(2)} ${h.name.padEnd(24)} ${h.index ?? "—"}${h.band ? " ±" + h.band : ""}  ${h.complete}/${h.judged}${h.reason ? "  (" + h.reason + ")" : ""}`);
