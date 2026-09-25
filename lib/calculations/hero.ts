import type { MethodologyVersion } from "@/lib/constants/methodology";
import type { ConfidenceGrade, ScoringStatus, SocialSnapshot } from "@/lib/domain/types";
import {
  clamp,
  coverage,
  mean,
  median,
  round,
  stdDev,
  weightedMean,
  type MetricResult,
} from "./result";

/** Per-film input to hero-level metrics. One row per eligible lead credit. */
export interface HeroFilmInput {
  filmId: string;
  releaseDate: string | null;
  status: ScoringStatus;
  filmSuccessScore: number | null;
  audienceScore: number | null;
  audienceConfidenceWeight: number | null;
  coveragePercent: number;
}

const isScored = (f: HeroFilmInput) =>
  (f.status === "scored" || f.status === "provisional") && f.filmSuccessScore !== null;

function result(
  value: number | null,
  num: number,
  den: number,
  status: MetricResult["status"],
  m: MethodologyVersion,
  explanation: string,
): MetricResult {
  return { value, coverage: coverage(num, den), status, methodVersion: m.id, explanation };
}

/** Films meeting the success threshold ÷ films with enough evidence to be scored. */
export function calculateOverallSuccessRatio(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const scored = films.filter(isScored);
  const hits = scored.filter((f) => (f.filmSuccessScore ?? 0) >= m.successThreshold).length;
  if (scored.length === 0)
    return result(null, 0, films.length, "insufficient", m, "No eligible film has enough evidence to be scored.");
  return result(
    round((hits / scored.length) * 100, 1),
    scored.length,
    films.length,
    scored.length < 3 ? "low_sample" : "ok",
    m,
    `${hits} of ${scored.length} scored films reached a Film Success Score of ${m.successThreshold}+.`,
  );
}

/** Films whose audience score meets the audience threshold ÷ films with audience evidence. */
export function calculateAudienceSuccessRatio(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const withAudience = films.filter((f) => f.audienceScore !== null);
  const hits = withAudience.filter((f) => (f.audienceScore ?? 0) >= m.audienceSuccessThreshold).length;
  if (withAudience.length === 0)
    return result(null, 0, films.length, "insufficient", m, "No audience evidence.");
  return result(
    round((hits / withAudience.length) * 100, 1),
    withAudience.length,
    films.length,
    withAudience.length < 3 ? "low_sample" : "ok",
    m,
    `${hits} of ${withAudience.length} films with audience evidence reached ${m.audienceSuccessThreshold}+.`,
  );
}

/**
 * Audience Reception Index: confidence-weighted mean of adjusted title-level audience
 * scores. Each film's weight is v/(v+m), capped at 1, so thinly-voted titles count less.
 */
export function calculateAudienceIndex(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const pairs = films
    .filter((f) => f.audienceScore !== null)
    .map((f) => ({ value: f.audienceScore as number, weight: clamp(f.audienceConfidenceWeight ?? 0.5, 0.05, 1) }));
  const value = weightedMean(pairs);
  if (value === null) return result(null, 0, films.length, "insufficient", m, "No audience evidence.");
  return result(
    round(value, 1),
    pairs.length,
    films.length,
    pairs.length < 3 ? "low_sample" : "ok",
    m,
    "Vote-confidence-weighted average of Bayesian-adjusted audience scores (film-wide ratings).",
  );
}

/** Consistency Index: 100 minus normalised standard deviation of Film Success Scores. */
export function calculateConsistencyIndex(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const scores = films.filter(isScored).map((f) => f.filmSuccessScore as number);
  if (scores.length < m.consistencyMinFilms)
    return result(
      null,
      scores.length,
      films.length,
      "insufficient",
      m,
      `Needs at least ${m.consistencyMinFilms} scored films.`,
    );
  const sd = stdDev(scores) ?? 0;
  return result(
    round(100 - clamp((sd / m.consistencyMaxStdDev) * 100, 0, 100), 1),
    scores.length,
    films.length,
    "ok",
    m,
    `Standard deviation of Film Success Scores is ${round(sd, 1)} points (${m.consistencyMaxStdDev}+ maps to 0).`,
  );
}

/**
 * Recent Career Momentum: recency-weighted mean of the latest N scored titles minus the
 * career baseline, mapped so that 50 = on baseline. Fewer than N titles → low_sample.
 */
export function calculateRecentMomentum(
  windowFilms: HeroFilmInput[],
  careerFilms: HeroFilmInput[],
  m: MethodologyVersion,
): MetricResult {
  const byDateDesc = (a: HeroFilmInput, b: HeroFilmInput) =>
    (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
  const recent = windowFilms.filter(isScored).sort(byDateDesc).slice(0, m.momentumWindow);
  const baseline = mean(careerFilms.filter(isScored).map((f) => f.filmSuccessScore as number));
  if (recent.length === 0 || baseline === null)
    return result(null, 0, m.momentumWindow, "insufficient", m, "No scored recent titles.");
  const weighted = weightedMean(
    recent.map((f, i) => ({ value: f.filmSuccessScore as number, weight: m.momentumWindow - i })),
  ) as number;
  const delta = weighted - baseline;
  return result(
    round(clamp(50 + (delta / m.momentumDeltaRange) * 50, 0, 100), 1),
    recent.length,
    m.momentumWindow,
    recent.length < m.momentumWindow ? "low_sample" : "ok",
    m,
    `Latest ${recent.length} scored titles average ${round(delta, 1) >= 0 ? "+" : ""}${round(delta, 1)} vs career baseline.`,
  );
}

const MS_PER_MONTH = 86_400_000 * 30.4375;

/** Median months between consecutive eligible release dates. Lower = more frequent. */
export function calculateMedianReleaseGapMonths(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const dates = films
    .map((f) => f.releaseDate)
    .filter((d): d is string => !!d)
    .map((d) => Date.parse(d))
    .sort((a, b) => a - b);
  if (dates.length < 2)
    return result(null, dates.length, films.length, "insufficient", m, "Needs at least 2 dated releases.");
  const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / MS_PER_MONTH);
  return result(
    round(median(gaps) as number, 1),
    dates.length,
    films.length,
    dates.length < 4 ? "low_sample" : "ok",
    m,
    `Median of ${gaps.length} gaps between consecutive eligible releases.`,
  );
}

/** Highest number of eligible releases in any one calendar year. */
export function calculatePeakFilmsInCalendarYear(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const counts = new Map<number, number>();
  for (const f of films) {
    if (!f.releaseDate) continue;
    const y = Number(f.releaseDate.slice(0, 4));
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  if (counts.size === 0) return result(null, 0, films.length, "insufficient", m, "No dated releases.");
  let peak = 0;
  let peakYear = 0;
  for (const [y, c] of counts) if (c > peak || (c === peak && y > peakYear)) [peak, peakYear] = [c, y];
  const dated = [...counts.values()].reduce((a, b) => a + b, 0);
  return result(peak, dated, films.length, "ok", m, `${peak} eligible release${peak === 1 ? "" : "s"} in ${peakYear}.`);
}

/** Eligible films ÷ inclusive active years between first and last eligible release (min 1). */
export function calculateFilmsPerActiveYear(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const years = films.filter((f) => f.releaseDate).map((f) => Number((f.releaseDate as string).slice(0, 4)));
  if (years.length === 0) return result(null, 0, films.length, "insufficient", m, "No dated releases.");
  const active = Math.max(...years) - Math.min(...years) + 1;
  return result(
    round(years.length / active, 2),
    years.length,
    films.length,
    years.length < 3 ? "low_sample" : "ok",
    m,
    `${years.length} films across ${active} active year${active === 1 ? "" : "s"}.`,
  );
}

/**
 * Verified Public Social Reach Index from official-profile snapshots only.
 * Uses the latest snapshot per platform, sums public followers and maps log10(reach)
 * onto 0–100. This is reach, never a "fan count".
 */
export function calculateSocialReachIndex(
  snapshots: SocialSnapshot[],
  m: MethodologyVersion,
): MetricResult & { snapshotAt: string | null } {
  const official = snapshots.filter((s) => s.isOfficial && s.followersCount !== null);
  const latest = new Map<string, SocialSnapshot>();
  for (const s of official) {
    const prev = latest.get(s.platform);
    if (!prev || s.snapshotAt > prev.snapshotAt) latest.set(s.platform, s);
  }
  const chosen = [...latest.values()];
  const total = chosen.reduce((a, s) => a + (s.followersCount ?? 0), 0);
  const snapshotAt = chosen.map((s) => s.snapshotAt).sort().at(-1) ?? null;
  if (chosen.length === 0 || total <= 0)
    return { ...result(null, 0, 4, "insufficient", m, "No official profile snapshot."), snapshotAt };
  const idx = ((Math.log10(total) - m.socialLog10Floor) / (m.socialLog10Ceiling - m.socialLog10Floor)) * 100;
  return {
    ...result(
      round(clamp(idx, 0, 100), 1),
      chosen.length,
      4,
      chosen.length < 2 ? "low_sample" : "ok",
      m,
      `Official public reach on ${chosen.length} platform${chosen.length === 1 ? "" : "s"}, log-scaled.`,
    ),
    snapshotAt,
  };
}

/** Film Success Index: coverage-weighted mean Film Success Score of scored titles. */
export function calculateFilmSuccessIndex(films: HeroFilmInput[], m: MethodologyVersion): MetricResult {
  const scored = films.filter(isScored);
  const value = weightedMean(
    scored.map((f) => ({ value: f.filmSuccessScore as number, weight: Math.max(0.25, f.coveragePercent / 100) })),
  );
  if (value === null) return result(null, 0, films.length, "insufficient", m, "No scored films.");
  return result(
    round(value, 1),
    scored.length,
    films.length,
    scored.length < 3 ? "low_sample" : "ok",
    m,
    "Coverage-weighted mean of Film Success Scores.",
  );
}

/**
 * Hero Performance Index = 0.35·Film Success + 0.25·Audience + 0.15·Consistency
 *   + 0.15·Social Reach + 0.10·Momentum.
 * Unavailable components are dropped and their weight redistributed; the result is
 * withheld unless both Film Success and Audience indices exist.
 */
export function calculateHeroPerformanceIndex(
  parts: {
    filmSuccess: number | null;
    audience: number | null;
    consistency: number | null;
    socialReach: number | null;
    momentum: number | null;
  },
  m: MethodologyVersion,
): MetricResult {
  const w = m.heroScoreWeights;
  const entries: [keyof typeof w, number | null][] = [
    ["filmSuccess", parts.filmSuccess],
    ["audience", parts.audience],
    ["consistency", parts.consistency],
    ["socialReach", parts.socialReach],
    ["momentum", parts.momentum],
  ];
  const present = entries.filter((e): e is [keyof typeof w, number] => e[1] !== null);
  if (parts.filmSuccess === null || parts.audience === null)
    return result(null, present.length, entries.length, "insufficient", m, "Film Success and Audience indices are required.");
  const value = weightedMean(present.map(([k, v]) => ({ value: v, weight: w[k] })));
  const missing = entries.filter((e) => e[1] === null).map((e) => e[0]);
  return result(
    round(value as number, 1),
    present.length,
    entries.length,
    missing.length ? "low_sample" : "ok",
    m,
    missing.length
      ? `Weights redistributed; unavailable: ${missing.join(", ")}.`
      : "All five components available.",
  );
}

/** Confidence grade from sample size and evidence coverage. */
export function calculateConfidenceGrade(eligibleFilms: number, coveragePercent: number): ConfidenceGrade {
  if (eligibleFilms >= 8 && coveragePercent >= 75) return "high";
  if (eligibleFilms >= 5 && coveragePercent >= 50) return "medium";
  if (eligibleFilms >= 1 && coveragePercent > 0) return "low";
  return "insufficient";
}
