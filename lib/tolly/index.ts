/**
 * Tolly Index v0 (0–100): how audiences rated a film, how many took part and whether people
 * still look it up years later. No rupee figure enters it, so inflation and ticket prices
 * cannot move it.
 *
 *   Rating — IMDb rating, Bayesian-shrunk toward that year's average:
 *            R' = v/(v+m)·R + m/(v+m)·C_y   (m = median votes of the year, C_y = mean rating of the year)
 *            score = (R' − 1) / 9 × 100      (absolute: a 7.5 means the same in any year)
 *   Reach  — IMDb vote count, percentile within the release year (log scale; ranks are unchanged by log)
 *   Stay   — Wikipedia page views (English + Telugu, last 60 days), percentile within the release year
 *   Voice  — not in v0 (needs the social APIs); its 30% is shared pro rata among the other three.
 *
 *   raw_f = Σ w_p · pillar_p
 *   c_f   = min(1, log10(1 + votes) / 3)            evidence confidence (1 000 votes → full)
 *   TI_f  = c_f · raw_f + (1 − c_f) · mean raw of that year's complete films
 *   TI_h  = (Σ c_f · TI_f + k · M) / (Σ c_f + k),  k = 3, M = mean TI of all complete films
 *
 * Only complete films are scored; a hero needs ≥ 5 complete films and ≥ 60 % of his
 * non-provisional films complete.
 */

export const TOLLY_VERSION = "tolly-v0";

/** Weights from the proposal; Voice is null in v0 and its weight is shared among the rest. */
export const PILLAR_WEIGHTS = { rating: 35, voice: 30, reach: 20, stay: 15 } as const;
export type Pillar = keyof typeof PILLAR_WEIGHTS;
export const V0_PILLARS: Pillar[] = ["rating", "reach", "stay"];

export const MIN_VOTES = 100;
export const MIN_AGE_MONTHS = 24;
export const HERO_MIN_COMPLETE = 5;
export const HERO_MIN_SHARE = 0.6;
export const HERO_PRIOR_FILMS = 3;

export type FilmStatus = "complete" | "provisional" | "incomplete";

export interface TollyFilmInput {
  key: string;
  title: string;
  year: number;
  releaseDate: string | null;
  dateApproximate: boolean;
  /** null when the original language is unknown (e.g. no Wikipedia article). */
  telugu: boolean | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  /** Wikipedia views over the last 60 days, English + Telugu; null when the film has no article. */
  wikiViews: number | null;
}

export interface TollyFilmResult {
  key: string;
  title: string;
  year: number;
  status: FilmStatus;
  missing: string[];
  pillars: Record<Pillar, number | null>;
  /** Rating after Bayesian shrinkage (out of 10). */
  ratingAdjusted: number | null;
  raw: number | null;
  confidence: number | null;
  index: number | null;
}

export interface TollyHeroResult {
  slug: string;
  name: string;
  films: number;
  complete: number;
  provisional: number;
  qualified: boolean;
  reason: string | null;
  index: number | null;
  best: { title: string; year: number; index: number }[];
  /** Standard deviation of his complete films' indexes (lower = more consistent). */
  spread: number | null;
}

export const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function monthsBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
}

/** Percentile rank 0–100 within a group; ties share the average rank; a lone value gets 50. */
export function percentileRanks(values: Map<string, number>): Map<string, number> {
  const entries = [...values.entries()].sort((a, b) => a[1] - b[1]);
  const out = new Map<string, number>();
  const n = entries.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && entries[j + 1][1] === entries[i][1]) j++;
    const pct = n === 1 ? 50 : ((i + j) / 2 / (n - 1)) * 100;
    for (let k = i; k <= j; k++) out.set(entries[k][0], pct);
    i = j + 1;
  }
  return out;
}

export function filmStatus(f: TollyFilmInput, asOf: string): { status: FilmStatus; missing: string[] } {
  const missing: string[] = [];
  if (f.telugu === null) missing.push("original language");
  else if (!f.telugu) missing.push("not a Telugu-language film");
  if (!f.releaseDate || f.dateApproximate) missing.push("exact release date");
  if (f.imdbRating === null || (f.imdbVotes ?? 0) < MIN_VOTES) missing.push(`IMDb rating with ${MIN_VOTES}+ votes`);
  if (f.wikiViews === null) missing.push("Wikipedia article (for page views)");
  if (missing.length) return { status: "incomplete", missing };
  if (monthsBetween(f.releaseDate as string, asOf) < MIN_AGE_MONTHS) return { status: "provisional", missing: [`${MIN_AGE_MONTHS} months since release`] };
  return { status: "complete", missing };
}

export function v0Weights(): Record<Pillar, number> {
  const total = V0_PILLARS.reduce((a, p) => a + PILLAR_WEIGHTS[p], 0);
  return { rating: PILLAR_WEIGHTS.rating / total, voice: 0, reach: PILLAR_WEIGHTS.reach / total, stay: PILLAR_WEIGHTS.stay / total };
}

/**
 * Scores every film. Year statistics (m, C_y, percentiles, the year mean) use the films that are
 * complete or provisional, so a provisional film is ranked against its own year too, but it never
 * feeds a hero's index.
 */
export function scoreFilms(films: TollyFilmInput[], asOf: string): TollyFilmResult[] {
  const w = v0Weights();
  const results = new Map<string, TollyFilmResult>();
  const scorable: TollyFilmInput[] = [];
  for (const f of films) {
    const { status, missing } = filmStatus(f, asOf);
    results.set(f.key, { key: f.key, title: f.title, year: f.year, status, missing, pillars: { rating: null, voice: null, reach: null, stay: null }, ratingAdjusted: null, raw: null, confidence: null, index: null });
    if (status !== "incomplete") scorable.push(f);
  }
  const byYear = new Map<number, TollyFilmInput[]>();
  for (const f of scorable) byYear.set(f.year, [...(byYear.get(f.year) ?? []), f]);

  for (const group of byYear.values()) {
    const m = median(group.map((f) => f.imdbVotes as number));
    const C = mean(group.map((f) => f.imdbRating as number));
    const reach = percentileRanks(new Map(group.map((f) => [f.key, Math.log10(1 + (f.imdbVotes as number))])));
    const stay = percentileRanks(new Map(group.map((f) => [f.key, Math.log10(1 + (f.wikiViews as number))])));
    for (const f of group) {
      const r = results.get(f.key)!;
      const v = f.imdbVotes as number;
      const adj = (v / (v + m)) * (f.imdbRating as number) + (m / (v + m)) * C;
      r.ratingAdjusted = round(adj, 2);
      r.pillars = { rating: round(((adj - 1) / 9) * 100), voice: null, reach: round(reach.get(f.key)!), stay: round(stay.get(f.key)!) };
      r.raw = round(w.rating * r.pillars.rating! + w.reach * r.pillars.reach! + w.stay * r.pillars.stay!);
      r.confidence = round(Math.min(1, Math.log10(1 + v) / 3), 3);
    }
    const yearMean = mean(group.map((f) => results.get(f.key)!.raw as number));
    for (const f of group) {
      const r = results.get(f.key)!;
      r.index = round(r.confidence! * r.raw! + (1 - r.confidence!) * yearMean);
    }
  }
  return films.map((f) => results.get(f.key)!);
}

export function scoreHeroes(heroes: { slug: string; name: string; films: string[] }[], filmResults: TollyFilmResult[]): TollyHeroResult[] {
  const byKey = new Map(filmResults.map((r) => [r.key, r]));
  const allComplete = filmResults.filter((r) => r.status === "complete");
  const M = allComplete.length ? mean(allComplete.map((r) => r.index as number)) : 0;
  return heroes.map((h) => {
    // A film counts once per hero even when the filmography lists it on several rows.
    const rs = [...new Set(h.films)].map((k) => byKey.get(k)).filter((r): r is TollyFilmResult => !!r);
    const complete = rs.filter((r) => r.status === "complete");
    const provisional = rs.filter((r) => r.status === "provisional").length;
    const judged = rs.length - provisional;
    const share = judged ? complete.length / judged : 0;
    let reason: string | null = null;
    if (!rs.length) reason = "no lead films counted since 2000";
    else if (complete.length < HERO_MIN_COMPLETE) reason = `only ${complete.length} complete film${complete.length === 1 ? "" : "s"} (needs ${HERO_MIN_COMPLETE})`;
    else if (share < HERO_MIN_SHARE) reason = `only ${Math.round(share * 100)}% of his films are complete (needs ${HERO_MIN_SHARE * 100}%)`;
    const sumC = complete.reduce((a, r) => a + (r.confidence as number), 0);
    const index = reason ? null : round((complete.reduce((a, r) => a + (r.confidence as number) * (r.index as number), 0) + HERO_PRIOR_FILMS * M) / (sumC + HERO_PRIOR_FILMS));
    const idx = complete.map((r) => r.index as number);
    const spread = complete.length >= 2 ? round(Math.sqrt(mean(idx.map((x) => (x - mean(idx)) ** 2)))) : null;
    const best = [...complete].sort((a, b) => (b.index as number) - (a.index as number)).slice(0, 3).map((r) => ({ title: r.title, year: r.year, index: r.index as number }));
    return { slug: h.slug, name: h.name, films: rs.length, complete: complete.length, provisional, qualified: !reason, reason, index, best, spread };
  });
}
