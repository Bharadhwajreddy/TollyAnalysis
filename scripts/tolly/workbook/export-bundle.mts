/**
 * Tolly Index workbook — gathers every film and hero input the workbook needs into one file.
 * Holds IMDb numbers (personal, non-commercial use), so it is written to the gitignored cache.
 *
 * Needs: npm run tolly:compute (lib/data/tolly/*.json) and the .cache/tolly inputs it used.
 * Output: .cache/tolly/workbook-bundle.json
 * Usage: npx tsx scripts/tolly/workbook/export-bundle.mts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { REPORTED_INSTAGRAM } from "@/lib/data/real/reported-social";

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const snap = read("lib/data/real/snapshot.json");
const tolly = read("lib/data/tolly/films.json");
const tollyHeroes = read("lib/data/tolly/heroes.json");
const linked: Record<string, unknown>[] = read(".cache/tolly/films-linked.json");
const views: Record<string, { views: number } | null> = read(".cache/tolly/pageviews-60d.json");
const letterboxd: Record<string, { avg: number; count: number; url: string }> = existsSync(".cache/tolly/manual-letterboxd.json") ? read(".cache/tolly/manual-letterboxd.json") : {};
const editorFollowers: Record<string, { noAccount: boolean }> = existsSync("lib/data/real/hero-followers.json") ? read("lib/data/real/hero-followers.json").heroes : {};

type Linked = {
  key: string;
  year: number;
  yearSources: { wikidata: number | null; imdb: number | null };
  releaseDate: string | null;
  releaseDateBy: string | null;
  telugu: boolean | null;
  languageBy: string | null;
  qid: string | null;
  tconst: string | null;
  tconstBy: string | null;
  imdbRating: number | null;
  imdbVotes: number;
  runtimeMin: number | null;
  genres: string[];
  en: string | null;
  te: string | null;
  sitelinks: number | null;
};
type SnapFilm = {
  key: string;
  director?: string | null;
  music?: string | null;
  runtimeMin?: number | null;
  genres?: string[];
  budget?: { low: number; high: number } | null;
  gross?: { low: number; high: number } | null;
  verdict?: { verdict: string; source: string } | null;
};
const byKey = new Map((linked as Linked[]).map((l) => [l.key, l]));
const snapFilm = new Map((snap.films as SnapFilm[]).map((f) => [f.key, f]));
const heroName = new Map((snap.heroes as { slug: string; name: string }[]).map((h) => [h.slug, h.name]));
const mid = (r?: { low: number; high: number } | null) => (r ? (r.low + r.high) / 2 : null);
// Same rule as compute.mts: an article with no measured views is missing data; no article is a measured zero.
const viewsOf = (lang: "en" | "te", title: string | null) => {
  if (!title) return 0;
  const k = `${lang}:${title}`;
  return k in views ? (views[k]?.views ?? 0) : null;
};

const films = (
  tolly.films as { key: string; title: string; year: number; heroes: string[]; status: string; index: number | null; critics: { reviews: number; average: number } | null; sources: { rating?: string } }[]
).map(
  (f) => {
    const l = byKey.get(f.key) as Linked;
    const s = snapFilm.get(f.key) ?? ({} as SnapFilm);
    // Where IMDb could not rate the film, compute.mts used the editor's Letterboxd rating (stars × 2);
    // the workbook gets the same numbers, and the Letterboxd page stands in for the IMDb link and year.
    const lb = f.sources?.rating === "letterboxd" ? letterboxd[f.key] : null;
    const yearOk = [l.yearSources.wikidata, l.yearSources.imdb].some((y) => y !== null && Math.abs(y - l.year) <= 1);
    return {
      id: f.key,
      title: f.title,
      year: f.year,
      heroes: f.heroes.map((h) => heroName.get(h) ?? h).join(", "),
      heroSlugs: f.heroes,
      date: l.releaseDate,
      dateBy: l.releaseDateBy,
      telugu: l.telugu,
      langBy: l.languageBy,
      imdb: l.tconst ?? (lb ? "Letterboxd" : null),
      imdbBy: lb ? "letterboxd rating (editor)" : l.tconstBy,
      rating: lb ? Math.round(lb.avg * 2 * 100) / 100 : l.imdbRating,
      votes: lb ? lb.count : l.tconst ? l.imdbVotes : null,
      wdYear: l.yearSources.wikidata,
      imdbYear: lb && !yearOk ? l.year : l.yearSources.imdb,
      qid: l.qid,
      en: l.en,
      te: l.te,
      editions: l.sitelinks ?? (l.en ? 1 : 0) + (l.te ? 1 : 0),
      enViews: viewsOf("en", l.en),
      teViews: viewsOf("te", l.te),
      director: s.director ?? null,
      music: s.music ?? null,
      runtime: s.runtimeMin ?? l.runtimeMin ?? null,
      genres: (s.genres?.length ? s.genres : l.genres ?? []).join(", "),
      budget: mid(s.budget),
      gross: mid(s.gross),
      verdict: s.verdict?.verdict ?? null,
      verdictBy: s.verdict?.source ?? null,
      critics: f.critics?.average ?? null,
      criticsN: f.critics?.reviews ?? null,
      appIndex: f.index,
      appStatus: f.status,
    };
  },
);

const profiles = new Map(
  (read(".cache/tolly/heroes-profile.json") as { slug: string; birthDate: string | null; birthDateBy: string | null; debutYear: number | null; debutYearBy: string | null; hasFreePhoto: boolean; imdb: string[] }[]).map((p) => [p.slug, p]),
);
type AppHero = { slug: string; index: number | null; followers?: { total: number; asOf: string } | null; career?: { judged: number; hits: number; recentJudged: number; recentHits: number; leadFilms: number } | null };
const appHero = new Map((tollyHeroes.heroes as AppHero[]).map((h) => [h.slug, h]));
type SnapHero = { slug: string; name: string; qid: string | null; article: string | null; filmographyPage: string | null; social?: { x?: { followers: number | null; date: string | null; username: string | null } | null } };
const heroes = (snap.heroes as SnapHero[]).map((h) => {
  const p = profiles.get(h.slug);
  return {
    slug: h.slug,
    name: h.name,
    qid: h.qid,
    imdb: p?.imdb?.join(", ") ?? "",
    article: h.article,
    filmography: h.filmographyPage,
    birth: p?.birthDate ?? null,
    birthBy: p?.birthDateBy ?? null,
    debut: p?.debutYear ?? null,
    debutBy: p?.debutYearBy ?? null,
    photo: !!p?.hasFreePhoto,
    x: h.social?.x?.followers ?? null,
    xDate: h.social?.x?.date ?? null,
    xUser: h.social?.x?.username ?? null,
    ig: (REPORTED_INSTAGRAM.followers as Record<string, number>)[h.slug] ?? null,
    fameFollowers: appHero.get(h.slug)?.followers?.total ?? null,
    fameDate: appHero.get(h.slug)?.followers?.asOf ?? null,
    noAccount: !!editorFollowers[h.slug]?.noAccount,
    career: appHero.get(h.slug)?.career ?? null,
    appIndex: appHero.get(h.slug)?.index ?? null,
  };
});

writeFileSync(".cache/tolly/workbook-bundle.json", JSON.stringify({ meta: tolly.meta, films, heroes }));
console.log(`wrote .cache/tolly/workbook-bundle.json: ${films.length} films, ${heroes.length} heroes (as of ${tolly.meta.asOf})`);
