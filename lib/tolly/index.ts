/**
 * Tolly Index v1 (0–100): how audiences rated a film, how widely it travelled and whether people
 * still look it up today. No rupee figure enters it, so inflation and ticket prices cannot move it.
 * Every input exists for films of every era, so a 2002 film and a 2022 film are scored the same way.
 *
 * Cohort: a film is compared with the films released within one year of it (year − 1 … year + 1).
 *
 *   Rating — IMDb rating, shrunk toward the cohort's average in proportion to how few voted:
 *            R' = v/(v+m)·R + m/(v+m)·C   (m = cohort median vote count, C = cohort mean rating)
 *            score = (R' − 1) / 9 × 100   (absolute: a 7.5 means the same in every year)
 *   Reach  — ⅔ × percentile of IMDb vote count + ⅓ × percentile of Wikipedia language editions,
 *            both within the cohort
 *   Stay   — percentile of Wikipedia page views (English + Telugu, last 60 days) within the cohort
 *   Voice  — reserved for social-media sentiment; not in v1 (needs API keys).
 *
 *   raw   = 0.50 · Rating + 0.30 · Reach + 0.20 · Stay
 *   c     = min(1, log10(1 + votes) / 3)          evidence confidence (1,000 votes → full)
 *   TI    = c · raw + (1 − c) · mean raw of the cohort
 *   TI_h  = (Σ c · TI + k · M) / (Σ c + k)        k = 3, M = mean TI of all complete films
 *   band  = ± 1.96 · spread / √(Σ c + k)
 *
 * Completeness gate: a film is scored only when every input above is present and checked; a hero
 * is ranked only when HERO_MIN_COMPLETE films and HERO_MIN_SHARE of his judged films are complete.
 */

export const TOLLY_VERSION = "tolly-v1";

/** Proposal weights once Voice exists: Rating 35, Voice 30, Reach 20, Stay 15. */
export const WEIGHTS_WITH_VOICE = { rating: 35, voice: 30, reach: 20, stay: 15 } as const;
/** v1 weights, with no Voice. */
export const WEIGHTS = { rating: 0.5, voice: 0, reach: 0.3, stay: 0.2 } as const;
export type Pillar = keyof typeof WEIGHTS;
export const REACH_PARTS = { votes: 2 / 3, editions: 1 / 3 } as const;

export const MIN_VOTES = 10;
export const MIN_AGE_MONTHS = 24;
export const COHORT_YEARS = 1;
export const FULL_CONFIDENCE_VOTES = 1000;
export const HERO_MIN_COMPLETE = 5;
export const HERO_MIN_SHARE = 0.9;
export const HERO_PRIOR_FILMS = 3;

export type FilmStatus = "complete" | "provisional" | "incomplete" | "excluded";

export interface TollyFilmInput {
  key: string;
  title: string;
  year: number;
  /** Exact release date when known. */
  releaseDate: string | null;
  /** true / false from Wikipedia, Wikidata or the filmography; null when no source says. */
  telugu: boolean | null;
  /** Matched to an IMDb title. */
  linked: boolean;
  /** Release year agrees (± 1) with a second source (Wikidata or IMDb). */
  yearConfirmed: boolean;
  imdbRating: number | null;
  imdbVotes: number | null;
  /** Number of Wikipedia language editions with an article (0 when there is none). */
  editions: number | null;
  /** Wikipedia views over the last 60 days, English + Telugu (0 when neither article exists). */
  wikiViews: number | null;
}

export interface TollyFilmResult {
  key: string;
  title: string;
  year: number;
  status: FilmStatus;
  missing: string[];
  pillars: Record<Pillar, number | null>;
  /** Rating after shrinkage (out of 10). */
  ratingAdjusted: number | null;
  raw: number | null;
  confidence: number | null;
  index: number | null;
  cohort: { films: number; medianVotes: number; meanRating: number } | null;
}

export interface TollyHeroResult {
  slug: string;
  name: string;
  films: number;
  excluded: number;
  provisional: number;
  complete: number;
  /** Films at least 2 years old (the ones that must be complete). */
  judged: number;
  qualified: boolean;
  reason: string | null;
  index: number | null;
  /** Half-width of the 95% band around the index. */
  band: number | null;
  best: { title: string; year: number; index: number }[];
  /** Standard deviation of his complete films' indexes (lower = more consistent). */
  spread: number | null;
  pillars: { rating: number; reach: number; stay: number } | null;
  missing: { title: string; year: number; missing: string[] }[];
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

/** Mid-rank percentile (0–100) of `value` among `others` (the film itself excluded). */
export function percentileOf(value: number, others: number[]): number {
  if (!others.length) return 50;
  let below = 0;
  let equal = 0;
  for (const o of others) {
    if (o < value) below++;
    else if (o === value) equal++;
  }
  return ((below + equal / 2) / others.length) * 100;
}

/** Age check: exact date when known; otherwise the release year settles it unless it is borderline. */
function ageStatus(f: TollyFilmInput, asOf: string): "old" | "young" | "unknown" {
  if (f.releaseDate) return monthsBetween(f.releaseDate, asOf) >= MIN_AGE_MONTHS ? "old" : "young";
  if (monthsBetween(`${f.year}-12-31`, asOf) >= MIN_AGE_MONTHS) return "old";
  if (monthsBetween(`${f.year}-01-01`, asOf) < MIN_AGE_MONTHS) return "young";
  return "unknown";
}

export function filmStatus(f: TollyFilmInput, asOf: string): { status: FilmStatus; missing: string[] } {
  if (f.telugu === false) return { status: "excluded", missing: ["not a Telugu-language film"] };
  const missing: string[] = [];
  if (f.telugu === null) missing.push("original language");
  if (!f.linked) missing.push("IMDb title");
  else if (f.imdbRating === null || (f.imdbVotes ?? 0) < MIN_VOTES) missing.push(`IMDb rating with ${MIN_VOTES}+ votes`);
  if (!f.yearConfirmed) missing.push("release year from a second source");
  if (f.editions === null) missing.push("Wikipedia language editions");
  if (f.wikiViews === null) missing.push("Wikipedia page views");
  const age = ageStatus(f, asOf);
  // A film under 2 years old never counts yet, so its gaps (often no ratings so soon) do not hold a hero back.
  if (age === "young") return { status: "provisional", missing: [`${MIN_AGE_MONTHS} months since release`, ...missing] };
  if (age === "unknown") missing.push("exact release date");
  if (missing.length) return { status: "incomplete", missing };
  return { status: "complete", missing };
}

export const confidenceOf = (votes: number) => Math.min(1, Math.log10(1 + votes) / Math.log10(FULL_CONFIDENCE_VOTES));

/**
 * Scores every film. Cohort statistics use complete and provisional films, so a provisional film
 * is ranked against its own era too, but it never feeds a hero's index.
 */
export function scoreFilms(films: TollyFilmInput[], asOf: string): TollyFilmResult[] {
  const results = films.map((f): TollyFilmResult => {
    const { status, missing } = filmStatus(f, asOf);
    return { key: f.key, title: f.title, year: f.year, status, missing, pillars: { rating: null, voice: null, reach: null, stay: null }, ratingAdjusted: null, raw: null, confidence: null, index: null, cohort: null };
  });
  const scorable = films.map((f, i) => ({ f, r: results[i] })).filter(({ r }) => r.status === "complete" || (r.status === "provisional" && r.missing.length === 1));
  const cohortOf = (year: number) => scorable.filter(({ f }) => Math.abs(f.year - year) <= COHORT_YEARS);

  // Pass 1: pillars and raw score.
  for (const { f, r } of scorable) {
    const others = cohortOf(f.year).filter((x) => x.f !== f);
    const cohort = [f, ...others.map((x) => x.f)];
    const m = median(cohort.map((x) => x.imdbVotes as number));
    const C = mean(cohort.map((x) => x.imdbRating as number));
    const v = f.imdbVotes as number;
    const adj = (v / (v + m)) * (f.imdbRating as number) + (m / (v + m)) * C;
    const lv = (x: TollyFilmInput) => Math.log10(1 + (x.imdbVotes as number));
    const reach = REACH_PARTS.votes * percentileOf(lv(f), others.map((x) => lv(x.f))) + REACH_PARTS.editions * percentileOf(f.editions as number, others.map((x) => x.f.editions as number));
    const lw = (x: TollyFilmInput) => Math.log10(1 + (x.wikiViews as number));
    const stay = percentileOf(lw(f), others.map((x) => lw(x.f)));
    r.ratingAdjusted = round(adj, 2);
    r.pillars = { rating: round(((adj - 1) / 9) * 100), voice: null, reach: round(reach), stay: round(stay) };
    r.raw = round(WEIGHTS.rating * r.pillars.rating! + WEIGHTS.reach * r.pillars.reach! + WEIGHTS.stay * r.pillars.stay!);
    r.confidence = round(confidenceOf(v), 3);
    r.cohort = { films: cohort.length, medianVotes: m, meanRating: round(C, 3) };
  }
  // Pass 2: pull thin evidence toward the cohort's mean raw score.
  for (const { f, r } of scorable) {
    const cohortMean = mean(cohortOf(f.year).map((x) => x.r.raw as number));
    r.index = round(r.confidence! * r.raw! + (1 - r.confidence!) * cohortMean);
  }
  return results;
}

export function scoreHeroes(heroes: { slug: string; name: string; films: string[] }[], filmResults: TollyFilmResult[]): TollyHeroResult[] {
  const byKey = new Map(filmResults.map((r) => [r.key, r]));
  const allComplete = filmResults.filter((r) => r.status === "complete");
  const M = allComplete.length ? mean(allComplete.map((r) => r.index as number)) : 0;
  return heroes.map((h) => {
    // A film counts once per hero even when the filmography lists it on several rows.
    const all = [...new Set(h.films)].map((k) => byKey.get(k)).filter((r): r is TollyFilmResult => !!r);
    const excluded = all.filter((r) => r.status === "excluded").length;
    const rs = all.filter((r) => r.status !== "excluded");
    const complete = rs.filter((r) => r.status === "complete");
    const provisional = rs.filter((r) => r.status === "provisional").length;
    const judged = rs.length - provisional;
    const share = judged ? complete.length / judged : 0;
    let reason: string | null = null;
    if (!rs.length) reason = "no Telugu lead films counted since 2000";
    else if (!complete.length) reason = `no complete films (needs ${HERO_MIN_COMPLETE})`;
    else if (complete.length < HERO_MIN_COMPLETE) reason = `only ${complete.length} complete film${complete.length === 1 ? "" : "s"} (needs ${HERO_MIN_COMPLETE})`;
    else if (share < HERO_MIN_SHARE) reason = `${complete.length} of ${judged} films complete (${Math.round(share * 100)}%, needs ${HERO_MIN_SHARE * 100}%)`;
    const sumC = complete.reduce((a, r) => a + (r.confidence as number), 0);
    const idx = complete.map((r) => r.index as number);
    const spread = complete.length >= 2 ? Math.sqrt(mean(idx.map((x) => (x - mean(idx)) ** 2))) : null;
    const index = reason ? null : round((complete.reduce((a, r) => a + (r.confidence as number) * (r.index as number), 0) + HERO_PRIOR_FILMS * M) / (sumC + HERO_PRIOR_FILMS));
    const band = index !== null && spread !== null ? round((1.96 * spread) / Math.sqrt(sumC + HERO_PRIOR_FILMS)) : null;
    const wavg = (p: "rating" | "reach" | "stay") => round(complete.reduce((a, r) => a + (r.confidence as number) * (r.pillars[p] as number), 0) / sumC);
    return {
      slug: h.slug,
      name: h.name,
      films: all.length,
      excluded,
      provisional,
      complete: complete.length,
      judged,
      qualified: !reason,
      reason,
      index,
      band,
      best: [...complete].sort((a, b) => (b.index as number) - (a.index as number)).slice(0, 3).map((r) => ({ title: r.title, year: r.year, index: r.index as number })),
      spread: spread === null ? null : round(spread),
      pillars: complete.length ? { rating: wavg("rating"), reach: wavg("reach"), stay: wavg("stay") } : null,
      missing: rs.filter((r) => r.status === "incomplete").map((r) => ({ title: r.title, year: r.year, missing: r.missing })),
    };
  });
}
