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
 * Final hero index (v3): the film score above is the "audience" factor, joined by every other career KPI
 * (HERO_FACTORS): box-office success and counts, reported grosses, recent form, fame (official followers on
 * Instagram + X, log scale 10k = 0, 100M = 100), consistency, career length and release pace. Each is 0–100;
 *   final = Σ w · factor / Σ w over the factors he has data for;  band × (w_audience / Σ w)
 * Fame enters for everyone at once, only when every ranked hero has a follower count no older than
 * FAME_MAX_AGE_DAYS or is confirmed to have no official account.
 *
 * Completeness gate: a film is scored only when every input above is present and checked; a hero
 * is ranked only when HERO_MIN_COMPLETE films and HERO_MIN_SHARE of his judged films are complete.
 */

export const TOLLY_VERSION = "tolly-v3.0";

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

export const FAME_LOG10_FLOOR = 4;
export const FAME_LOG10_CEILING = 8;
export const FAME_MAX_AGE_DAYS = 365;
/**
 * The final hero index (v3): his films' audience score plus every other career KPI the site has.
 * Each factor is a 0–100 value; weights add up to 100. A factor a hero has no data for is left out and
 * the rest are scaled up. Most factors are percentile ranks among the ranked heroes (ties share the
 * average rank); consistency and release pace rank lower raw values higher.
 */
export const HERO_FACTORS = [
  { key: "audience", group: "audience", label: "Audience score of his films", weight: 37, how: "Hero index from his films' rating, reach and staying power" },
  { key: "success", group: "boxoffice", label: "Success ratio", weight: 9, how: "Hits ÷ films with a known result, pulled toward the typical hero" },
  { key: "hits", group: "boxoffice", label: "Hit films", weight: 6, how: "Number of hits and blockbusters, percentile" },
  { key: "blockbusters", group: "boxoffice", label: "Blockbusters", weight: 4, how: "Number of blockbusters, percentile" },
  { key: "bigFilms", group: "boxoffice", label: "₹100-crore films", weight: 3, how: "Films grossing ₹100 crore or more, percentile" },
  { key: "totalGross", group: "boxoffice", label: "Total box office", weight: 6, how: "Reported worldwide gross of all his films, percentile" },
  { key: "topGross", group: "boxoffice", label: "Biggest film", weight: 3, how: "His highest reported gross, percentile" },
  { key: "avgGross", group: "boxoffice", label: "Box office per film", weight: 4, how: "Average reported gross, percentile" },
  { key: "recent", group: "recent", label: "Recent success", weight: 7, how: "Hit rate of his latest films, pulled toward the typical hero" },
  { key: "fame", group: "fame", label: "Fame", weight: 10, how: "Instagram + X followers, log scale: 10 thousand = 0, 100 million = 100" },
  { key: "consistency", group: "career", label: "Consistency", weight: 4, how: "How little his films' scores vary, percentile (lower spread is better)" },
  { key: "films", group: "career", label: "Films as lead", weight: 3, how: "Number of lead films since 2000, percentile" },
  { key: "years", group: "career", label: "Years active", weight: 2, how: "Years from first to latest film, percentile" },
  { key: "peak", group: "career", label: "Busiest year", weight: 1, how: "Most films released in one year, percentile" },
  { key: "gap", group: "career", label: "Release pace", weight: 1, how: "Typical (median) gap between releases, percentile (shorter is better)" },
] as const;
export type HeroFactorKey = (typeof HERO_FACTORS)[number]["key"];
export type HeroGroupKey = (typeof HERO_FACTORS)[number]["group"];
export const HERO_WEIGHTS = Object.fromEntries(HERO_FACTORS.map((f) => [f.key, f.weight])) as Record<HeroFactorKey, number>;
/** Pseudo-films at the typical hit rate added to a hero's record, so 2 hits from 2 films is not 100%. */
export const SUCCESS_PRIOR_FILMS = 5;
export const RECENT_PRIOR_FILMS = 2;
/** Money factors count only with at least this many reported grosses, covering this share of his films. */
export const MIN_GROSS_FILMS = 3;
export const MIN_GROSS_SHARE = 0.25;
export const FAME_WEIGHT = HERO_WEIGHTS.fame / 100;
/** Fame adds up the two platforms checked for every hero; other platforms are shown on profiles only. */
export const FAME_PLATFORMS: readonly string[] = ["instagram", "x"];

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
  /** Each factor's 0–100 value (null = no data) and its share of the final index in %. */
  factors?: Record<HeroFactorKey, { value: number | null; share: number }>;
  career?: Omit<HeroCareer, "slug"> | null;
  /** Index from his films alone: the audience factor. */
  filmIndex?: number | null;
  /** Fame score 0–100 from his followers, when known and recent. */
  fame?: number | null;
  /** Followers added up across platforms, and the oldest date among the counts used. */
  followers?: { total: number; asOf: string } | null;
}

/** One hero's latest official follower counts (any platform may be missing). */
export interface HeroFollowers {
  slug: string;
  counts: { platform: "instagram" | "x" | "youtube" | "facebook"; followers: number; date: string }[];
  /** Checked: he has no official account on any platform, so he is scored on films alone. */
  noAccount?: boolean;
}

/**
 * Rounds half away from zero on the decimal value, as Excel's ROUND does: first to 15 significant
 * digits (so 0.5 × 45.8 + 0.3 × 70.1 + 0.2 × 67.6 = 57.44999999999999 is read as 57.45), then
 * to `d` places (57.5, not 57.4).
 */
export const round = (v: number, d = 1) => {
  const x = Number(Math.abs(v).toPrecision(15));
  return Math.sign(v) * Number(`${Math.round(Number(`${x}e${d}`))}e-${d}`);
};
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

/** Fame 0–100 from a follower total on a log scale (10k = 0, 100M = 100). */
export const fameOf = (followers: number) =>
  round(Math.max(0, Math.min(100, ((Math.log10(Math.max(1, followers)) - FAME_LOG10_FLOOR) / (FAME_LOG10_CEILING - FAME_LOG10_FLOOR)) * 100)));

/** One hero's career numbers, from the same KPIs the site shows (null = no data). */
export interface HeroCareer {
  slug: string;
  /** Films with a known box-office result, and how many of them were hits or better. */
  judged: number;
  hits: number;
  /** The same over his latest films only. */
  recentJudged: number;
  recentHits: number;
  /** All films as lead hero since 2000. */
  leadFilms: number;
  blockbusters: number | null;
  /** Films grossing ₹100 crore or more. */
  bigFilms: number | null;
  /** Reported worldwide grosses in ₹ crore, and how many films have one. */
  totalGross: number | null;
  topGross: number | null;
  avgGross: number | null;
  grossFilms: number;
  yearsActive: number | null;
  peakFilms: number | null;
  /** Typical (median) gap between releases, in months. */
  releaseGap: number | null;
}

/** A hit rate out of 100, pulled toward the typical hero when he has few judged films. */
export const blendedRate = (hits: number, judged: number, prior: number, priorFilms: number) =>
  judged > 0 ? round(((hits + prior * priorFilms) / (judged + priorFilms)) * 100) : null;

/** Percentile rank 0–100 with ties sharing the average rank (one value → 50); `low` ranks smaller values higher. */
export function percentileRanks(values: Map<string, number>, low = false): Map<string, number> {
  const n = values.size;
  const out = new Map<string, number>();
  for (const [k, v] of values) {
    if (n === 1) {
      out.set(k, 50);
      continue;
    }
    let below = 0;
    let same = 0;
    for (const w of values.values()) {
      if (low ? w > v : w < v) below++;
      else if (w === v) same++;
    }
    out.set(k, round(((below + (same - 1) / 2) / (n - 1)) * 100));
  }
  return out;
}

/** Money factors need enough reported grosses, or a sparsely reported career would look small. */
export const hasMoneyData = (c: Pick<HeroCareer, "grossFilms" | "leadFilms">) => c.grossFilms >= MIN_GROSS_FILMS && c.grossFilms / Math.max(1, c.leadFilms) >= MIN_GROSS_SHARE;

/**
 * Turns each hero's film score into the final Tolly Index by adding every other career KPI
 * (HERO_FACTORS). A factor a hero has no data for is left out and its weight is shared among the rest;
 * fame joins for everyone at once, only when every ranked hero has a recent follower count or is
 * confirmed to have no account.
 */
export function applyHeroFactors(
  heroes: TollyHeroResult[],
  followers: HeroFollowers[],
  career: HeroCareer[],
  asOf: string,
): { applied: boolean; missing: string[]; successPrior: number } {
  const bySlug = new Map(followers.map((f) => [f.slug, f]));
  const careerBy = new Map(career.map((c) => [c.slug, c]));
  const fresh = (date: string) => (new Date(asOf).getTime() - new Date(date).getTime()) / 86_400_000 <= FAME_MAX_AGE_DAYS;
  // The typical hero: hits ÷ judged films pooled over everyone.
  const judgedAll = career.reduce((a, c) => a + c.judged, 0);
  const successPrior = judgedAll ? career.reduce((a, c) => a + c.hits, 0) / judgedAll : 0.5;
  for (const h of heroes) {
    const counts = (bySlug.get(h.slug)?.counts ?? []).filter((c) => FAME_PLATFORMS.includes(c.platform) && c.followers > 0 && fresh(c.date));
    const total = counts.reduce((a, c) => a + c.followers, 0);
    h.filmIndex = h.index;
    h.followers = counts.length ? { total, asOf: counts.map((c) => c.date).sort()[0] } : null;
    h.fame = counts.length ? fameOf(total) : null;
  }
  const missing = heroes.filter((h) => h.qualified && h.fame === null && !bySlug.get(h.slug)?.noAccount).map((h) => h.name);
  const applied = missing.length === 0 && heroes.some((h) => h.qualified);

  // Percentile factors are ranked among the ranked heroes only.
  const ranked = heroes.filter((h) => h.qualified && h.filmIndex !== null && h.filmIndex !== undefined);
  const pctOf = (pick: (c: HeroCareer, h: TollyHeroResult) => number | null | undefined, opts: { money?: boolean; low?: boolean } = {}) => {
    const m = new Map<string, number>();
    for (const h of ranked) {
      const c = careerBy.get(h.slug);
      if (!c || (opts.money && !hasMoneyData(c))) continue;
      const v = pick(c, h);
      if (v !== null && v !== undefined) m.set(h.slug, v);
    }
    return percentileRanks(m, opts.low);
  };
  const pct: Partial<Record<HeroFactorKey, Map<string, number>>> = {
    hits: pctOf((c) => (c.judged ? c.hits : null)),
    blockbusters: pctOf((c) => (c.judged ? c.blockbusters : null)),
    bigFilms: pctOf((c) => c.bigFilms, { money: true }),
    totalGross: pctOf((c) => c.totalGross, { money: true }),
    topGross: pctOf((c) => c.topGross, { money: true }),
    avgGross: pctOf((c) => c.avgGross, { money: true }),
    consistency: pctOf((_, h) => h.spread, { low: true }),
    films: pctOf((c) => c.leadFilms),
    years: pctOf((c) => c.yearsActive),
    peak: pctOf((c) => c.peakFilms),
    gap: pctOf((c) => c.releaseGap, { low: true }),
  };

  for (const h of heroes) {
    const c = careerBy.get(h.slug);
    const values: Partial<Record<HeroFactorKey, number | null>> = {
      audience: h.filmIndex ?? null,
      success: c ? blendedRate(c.hits, c.judged, successPrior, SUCCESS_PRIOR_FILMS) : null,
      recent: c ? blendedRate(c.recentHits, c.recentJudged, successPrior, RECENT_PRIOR_FILMS) : null,
      fame: applied ? (h.fame ?? null) : null,
    };
    for (const f of HERO_FACTORS) if (pct[f.key]) values[f.key] = pct[f.key]?.get(h.slug) ?? null;
    h.career = c ? { ...c } : null;
    const keys = HERO_FACTORS.filter((f) => (values[f.key] ?? null) !== null).map((f) => f.key);
    const weight = keys.reduce((a, k) => a + HERO_WEIGHTS[k], 0);
    h.factors = Object.fromEntries(
      HERO_FACTORS.map((f) => {
        const v = values[f.key] ?? null;
        return [f.key, { value: v, share: v === null ? 0 : round((HERO_WEIGHTS[f.key] / weight) * 100) }];
      }),
    ) as NonNullable<TollyHeroResult["factors"]>;
    if (!h.qualified || h.filmIndex === null || h.filmIndex === undefined) continue;
    h.index = round(keys.reduce((a, k) => a + HERO_WEIGHTS[k] * (values[k] as number), 0) / weight);
    if (h.band !== null) h.band = round((h.band * HERO_WEIGHTS.audience) / weight);
  }
  return { applied, missing, successPrior };
}
