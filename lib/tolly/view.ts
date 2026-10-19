/**
 * Read side of the Tolly Index for the site: the results computed by scripts/tolly/compute.mts
 * (lib/data/tolly/*.json). Server-only: films.json is ~400 KB.
 */
import filmsData from "@/lib/data/tolly/films.json";
import heroesData from "@/lib/data/tolly/heroes.json";

export interface TollyFilmView {
  key: string;
  title: string;
  year: number;
  status: "complete" | "provisional" | "incomplete" | "excluded";
  missing: string[];
  index: number | null;
  rating: number | null;
  reach: number | null;
  stay: number | null;
  confidence: number | null;
}

export interface TollyHeroView {
  slug: string;
  name: string;
  rank: number | null;
  index: number | null;
  band: number | null;
  complete: number;
  judged: number;
  provisional: number;
  qualified: boolean;
  reason: string | null;
  spread: number | null;
  pillars: { rating: number; reach: number; stay: number } | null;
  best: { title: string; year: number; index: number }[];
  missing: { title: string; year: number; missing: string[] }[];
}

export interface TollyMeta {
  version: string;
  asOf: string;
  films: { total: number; complete: number; provisional: number; incomplete: number; excluded: number };
  heroes: { total: number; qualified: number };
  weights: { rating: number; reach: number; stay: number; voice: number };
}

type RawFilm = (typeof filmsData.films)[number] & { aliases?: string[] };

export const tollyMeta: TollyMeta = {
  version: filmsData.meta.version,
  asOf: filmsData.meta.asOf,
  films: filmsData.meta.films,
  heroes: heroesData.meta.heroes,
  weights: filmsData.meta.weights,
};

const filmByKey = new Map<string, TollyFilmView>();
for (const f of filmsData.films as RawFilm[]) {
  const view: TollyFilmView = {
    key: f.key,
    title: f.title,
    year: f.year,
    status: f.status as TollyFilmView["status"],
    missing: f.missing,
    index: f.index,
    rating: f.pillars.rating,
    reach: f.pillars.reach,
    stay: f.pillars.stay,
    confidence: f.confidence,
  };
  filmByKey.set(f.key, view);
  for (const a of f.aliases ?? []) filmByKey.set(a, view);
}

const heroes: TollyHeroView[] = (() => {
  const all = heroesData.heroes.map((h) => ({
    slug: h.slug,
    name: h.name,
    rank: null as number | null,
    index: h.index,
    band: h.band,
    complete: h.complete,
    judged: h.judged,
    provisional: h.provisional,
    qualified: h.qualified,
    reason: h.reason,
    spread: h.spread,
    pillars: h.pillars,
    best: h.best,
    missing: h.missing,
  }));
  const ranked = all.filter((h) => h.index !== null).sort((a, b) => (b.index as number) - (a.index as number));
  // Ties share a rank, as in the workbook (1 + number of heroes strictly above).
  for (const h of ranked) h.rank = 1 + ranked.filter((o) => (o.index as number) > (h.index as number)).length;
  return all;
})();

/** Film result by filmography key (merged spelling variants resolve to the same film). */
export function getTollyFilm(key: string): TollyFilmView | null {
  return filmByKey.get(key) ?? null;
}

export function getTollyHero(slug: string): TollyHeroView | null {
  return heroes.find((h) => h.slug === slug) ?? null;
}

/** Ranked heroes best first, then the heroes not ranked yet (most complete films first). */
export function getTollyRanking(): { ranked: TollyHeroView[]; unranked: TollyHeroView[] } {
  return {
    ranked: heroes.filter((h) => h.rank !== null).sort((a, b) => (a.rank as number) - (b.rank as number) || a.name.localeCompare(b.name)),
    unranked: heroes.filter((h) => h.rank === null).sort((a, b) => b.complete / Math.max(1, b.judged) - a.complete / Math.max(1, a.judged) || b.complete - a.complete),
  };
}

/** Best Tolly-Index films overall (complete films only). */
export function getTopTollyFilms(n: number): (TollyFilmView & { heroes: string[] })[] {
  return (filmsData.films as RawFilm[])
    .filter((f) => f.status === "complete" && f.index !== null)
    .sort((a, b) => (b.index as number) - (a.index as number))
    .slice(0, n)
    .map((f) => ({ ...(filmByKey.get(f.key) as TollyFilmView), heroes: f.heroes }));
}
