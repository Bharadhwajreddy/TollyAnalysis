import type { MethodologyVersion } from "@/lib/constants/methodology";
import type {
  CommercialEvidence,
  ConfidenceGrade,
  Dataset,
  Film,
  FilterWindow,
  Industry,
  LegacyStatus,
  Person,
  ReceptionEvidence,
  RoleScope,
} from "@/lib/domain/types";
import { calculateBaselineRating, calculateFilmAudienceScore, type FilmAudienceScore } from "./audience";
import { calculateCommercialScore, type CommercialScore } from "./commercial";
import { isEligibleLeadCredit } from "./eligibility";
import { calculateEvidenceQualityScore, calculateFilmSuccessScore, type FilmSuccessResult } from "./film";
import {
  calculateAudienceIndex,
  calculateAudienceSuccessRatio,
  calculateConfidenceGrade,
  calculateConsistencyIndex,
  calculateAverageRating,
  calculateBoxOfficeHits,
  calculateBoxOfficeSuccessRatio,
  calculateFollowers,
  calculateGross,
  calculateRecentBoxOfficeRatio,
  calculateFilmCount,
  calculateFilmSuccessIndex,
  calculateFilmsPerActiveYear,
  calculateYearsActive,
  calculateHeroPerformanceIndex,
  calculateMedianReleaseGapMonths,
  calculatePeakFilmsInCalendarYear,
  calculateRecentMomentum,
  calculateSocialReachIndex,
  type HeroFilmInput,
} from "./hero";
import { coverage, round, type MetricResult } from "./result";
import { applyStarScore, type StarPart } from "./star";

export interface FilmMetric {
  film: Film;
  audience: FilmAudienceScore | null;
  commercial: CommercialScore;
  success: FilmSuccessResult;
  legacyStatus: LegacyStatus | null;
  sourceIds: string[];
}

export type HeroMetricKey =
  | "hpi"
  | "filmSuccess"
  | "overallSuccessRatio"
  | "audienceSuccessRatio"
  | "audienceIndex"
  | "consistency"
  | "socialReach"
  | "momentum"
  | "releaseGap"
  | "peakFilms"
  | "filmsPerYear"
  | "films"
  | "hits"
  | "avgRating"
  | "recentSuccessRatio"
  | "yearsActive"
  | "blockbusters"
  | "totalGross"
  | "topGross"
  | "avgGross"
  | "bigFilms"
  | "xFollowers"
  | "igFollowers"
  | "starScore";

export interface HeroSnapshot {
  personId: string;
  slug: string;
  name: string;
  industry: Industry;
  window: FilterWindow;
  /** All-time eligible lead films; drives the 3+ default roster rule. */
  careerFilmCount: number;
  isEmerging: boolean;
  eligibleFilmCount: number;
  scoredFilmCount: number;
  coLeadFilmCount: number;
  dubbedFilmCount: number;
  ottFilmCount: number;
  firstYear: number | null;
  lastYear: number | null;
  metrics: Record<HeroMetricKey, MetricResult>;
  /** Breakdown of the Star Score (filled after all heroes in the window are computed). */
  starParts?: StarPart[];
  evidenceCoveragePercent: number;
  audienceCoveragePercent: number;
  commercialCoveragePercent: number;
  confidence: ConfidenceGrade;
  socialSnapshotAt: string | null;
  methodologyVersion: string;
  calculatedAt: string;
}

export interface HeroFilmRow {
  filmId: string;
  roleScope: RoleScope;
  coLeadIds: string[];
}

export interface EngineOutput {
  asOf: string;
  calculatedAt: string;
  methodology: MethodologyVersion;
  baselineRating: number;
  films: Map<string, FilmMetric>;
  /** personId → eligible lead credits, newest first. */
  heroFilms: Map<string, HeroFilmRow[]>;
  snapshots: Record<FilterWindow, HeroSnapshot[]>;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

export function computeFilmMetrics(dataset: Dataset, m: MethodologyVersion) {
  const reception = groupBy(dataset.reception, (r) => r.filmId);
  const commercial = groupBy(dataset.commercial, (c) => c.filmId);
  const legacy = new Map(
    dataset.legacy.filter((l) => l.approvalStatus === "approved").map((l) => [l.filmId, l.status]),
  );
  const approvedReception = dataset.reception.filter((r) => r.approvalStatus === "approved");
  const baselineRating = round(calculateBaselineRating(approvedReception, m.baselineRatingFallback), 3);

  const films = new Map<string, FilmMetric>();
  for (const film of dataset.films) {
    const rec: ReceptionEvidence[] = reception.get(film.id) ?? [];
    const com: CommercialEvidence[] = commercial.get(film.id) ?? [];
    const audience = calculateFilmAudienceScore(rec, {
      baseline: baselineRating,
      minVotes: m.voteThresholdM,
      floor: m.ratingIndexFloor,
      ceiling: m.ratingIndexCeiling,
    });
    const commercialScore = calculateCommercialScore(film, com);
    const sourceIds = [
      ...new Set([
        ...rec.filter((r) => r.approvalStatus === "approved").map((r) => r.sourceId),
        ...com.filter((c) => c.approvalStatus === "approved").map((c) => c.sourceId),
      ]),
    ];
    const evidenceQuality = calculateEvidenceQualityScore({
      audience,
      commercial: commercialScore,
      independentSourceCount: sourceIds.length,
    });
    const legacyStatus = legacy.get(film.id) ?? null;
    const success = calculateFilmSuccessScore({
      audience,
      commercial: commercialScore,
      evidenceQuality,
      legacyStatus,
      releaseDate: film.teluguRelease.releaseDate,
      asOf: dataset.asOf,
      methodology: m,
    });
    films.set(film.id, { film, audience, commercial: commercialScore, success, legacyStatus, sourceIds });
  }
  return { films, baselineRating };
}

function yearsBefore(iso: string, years: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function applyWindow(inputs: HeroFilmInput[], window: FilterWindow, asOf: string): HeroFilmInput[] {
  const sorted = [...inputs].sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  if (window === "last_10_films") return sorted.slice(0, 10);
  if (window === "last_5_years") {
    const from = yearsBefore(asOf, 5);
    return sorted.filter((f) => (f.releaseDate ?? "") >= from);
  }
  return sorted;
}

export function computeHeroSnapshot(args: {
  person: Person;
  window: FilterWindow;
  rows: HeroFilmRow[];
  films: Map<string, FilmMetric>;
  dataset: Dataset;
  m: MethodologyVersion;
  calculatedAt: string;
}): HeroSnapshot {
  const { person, window, rows, films, dataset, m } = args;
  const toInput = (r: HeroFilmRow): HeroFilmInput => {
    const fm = films.get(r.filmId)!;
    return {
      filmId: r.filmId,
      releaseDate: fm.film.teluguRelease.releaseDate,
      status: fm.success.status,
      filmSuccessScore: fm.success.score,
      audienceScore: fm.audience?.score ?? null,
      audienceConfidenceWeight: fm.audience?.confidenceWeight ?? null,
      audienceRawRating: fm.audience?.rawRating ?? null,
      // A run is not over until it is reconciled: recent releases get no verdict yet.
      boxOffice: fm.success.status === "not_yet_final" ? null : fm.commercial.label,
      grossCrore: fm.commercial.grossCrore,
      coveragePercent: fm.success.coveragePercent,
    };
  };
  const career = rows.map(toInput);
  const inWindow = applyWindow(career, window, dataset.asOf);
  const windowIds = new Set(inWindow.map((f) => f.filmId));
  const windowRows = rows.filter((r) => windowIds.has(r.filmId));

  const filmSuccess = calculateFilmSuccessIndex(inWindow, m);
  const audienceIndex = calculateAudienceIndex(inWindow, m);
  const consistency = calculateConsistencyIndex(inWindow, m);
  const momentum = calculateRecentMomentum(inWindow, career, m);

  const personSocial = dataset.social.filter((x) => x.personId === person.id);
  let socialReach: MetricResult;
  let socialSnapshotAt: string | null = null;
  const synthetic = dataset.syntheticSocial.find((s) => s.personId === person.id);
  if (dataset.mode === "demo" && synthetic) {
    socialReach = {
      value: synthetic.index,
      coverage: coverage(1, 1),
      status: "ok",
      methodVersion: m.id,
      explanation: "Synthetic demo index — no follower counts are stored or shown in demo mode.",
    };
    socialSnapshotAt = synthetic.snapshotAt;
  } else {
    const s = calculateSocialReachIndex(
      dataset.social.filter((x) => x.personId === person.id),
      m,
    );
    socialReach = s;
    socialSnapshotAt = s.snapshotAt;
  }

  const hpi = calculateHeroPerformanceIndex(
    {
      filmSuccess: filmSuccess.value,
      audience: audienceIndex.value,
      consistency: consistency.value,
      socialReach: socialReach.value,
      momentum: momentum.value,
    },
    m,
  );

  const scoredCount = inWindow.filter((f) => f.status === "scored" || f.status === "provisional").length;
  const audienceCount = inWindow.filter((f) => f.audienceScore !== null).length;
  const commercialCount = windowRows.filter((r) => films.get(r.filmId)!.commercial.score !== null).length;
  // Mean share of Film Success weight backed by evidence (insufficient-evidence films count as 0).
  const evidenceCoveragePercent = inWindow.length
    ? round(inWindow.reduce((a, f) => a + (f.status === "insufficient_evidence" ? 0 : f.coveragePercent), 0) / inWindow.length, 1)
    : 0;
  const years = inWindow.filter((f) => f.releaseDate).map((f) => Number(f.releaseDate!.slice(0, 4)));

  return {
    personId: person.id,
    slug: person.slug,
    name: person.displayName,
    industry: person.industry,
    window,
    careerFilmCount: career.length,
    isEmerging: career.length < m.minEligibleFilmsForDefaultRoster,
    eligibleFilmCount: inWindow.length,
    scoredFilmCount: scoredCount,
    coLeadFilmCount: windowRows.filter((r) => r.coLeadIds.length > 0).length,
    dubbedFilmCount: windowRows.filter((r) => films.get(r.filmId)!.film.teluguRelease.releaseType === "dubbed").length,
    ottFilmCount: windowRows.filter((r) => films.get(r.filmId)!.film.teluguRelease.route === "ott").length,
    firstYear: years.length ? Math.min(...years) : null,
    lastYear: years.length ? Math.max(...years) : null,
    metrics: {
      hpi,
      filmSuccess,
      overallSuccessRatio: calculateBoxOfficeSuccessRatio(inWindow, m),
      audienceSuccessRatio: calculateAudienceSuccessRatio(inWindow, m),
      audienceIndex,
      consistency,
      socialReach,
      momentum,
      releaseGap: calculateMedianReleaseGapMonths(inWindow, m),
      peakFilms: calculatePeakFilmsInCalendarYear(inWindow, m),
      filmsPerYear: calculateFilmsPerActiveYear(inWindow, m),
      films: calculateFilmCount(inWindow, m),
      hits: calculateBoxOfficeHits(inWindow, m),
      blockbusters: calculateBoxOfficeHits(inWindow, m, true),
      totalGross: calculateGross(inWindow, m, "total"),
      topGross: calculateGross(inWindow, m, "top"),
      avgGross: calculateGross(inWindow, m, "avg"),
      bigFilms: calculateGross(inWindow, m, "big"),
      xFollowers: calculateFollowers(personSocial, "x", m),
      igFollowers: calculateFollowers(personSocial, "instagram", m),
      avgRating: calculateAverageRating(inWindow, m),
      recentSuccessRatio: calculateRecentBoxOfficeRatio(inWindow, m),
      yearsActive: calculateYearsActive(inWindow, m),
      // Needs every hero in the window; set by applyStarScore in runEngine.
      starScore: { value: null, coverage: coverage(0, 0), status: "insufficient", methodVersion: m.id, explanation: "Not calculated yet." },
    },
    evidenceCoveragePercent,
    audienceCoveragePercent: coverage(audienceCount, inWindow.length).percent,
    commercialCoveragePercent: coverage(commercialCount, inWindow.length).percent,
    confidence: calculateConfidenceGrade(inWindow.length, evidenceCoveragePercent),
    socialSnapshotAt,
    methodologyVersion: m.id,
    calculatedAt: args.calculatedAt,
  };
}

/** Runs the full pipeline: film metrics → eligible credits → hero snapshots per window. */
export function runEngine(
  dataset: Dataset,
  m: MethodologyVersion,
  calculatedAt = dataset.asOf,
  /** personId → fans' ranking points; omit while the fans' ranking is off. */
  fanPoints?: Map<string, number>,
): EngineOutput {
  const { films, baselineRating } = computeFilmMetrics(dataset, m);
  const filmById = new Map(dataset.films.map((f) => [f.id, f]));

  const eligibleCredits = dataset.credits.filter((c) => {
    const film = filmById.get(c.filmId);
    return film ? isEligibleLeadCredit(c, film) : false;
  });
  const leadsByFilm = groupBy(eligibleCredits, (c) => c.filmId);

  const heroFilms = new Map<string, HeroFilmRow[]>();
  for (const c of eligibleCredits) {
    const coLeadIds = (leadsByFilm.get(c.filmId) ?? []).map((x) => x.personId).filter((id) => id !== c.personId);
    const rows = heroFilms.get(c.personId) ?? [];
    // A film counts once per hero even if duplicated in source data.
    if (!rows.some((r) => r.filmId === c.filmId)) rows.push({ filmId: c.filmId, roleScope: c.roleScope, coLeadIds });
    heroFilms.set(c.personId, rows);
  }
  for (const rows of heroFilms.values())
    rows.sort((a, b) =>
      (filmById.get(b.filmId)!.teluguRelease.releaseDate ?? "").localeCompare(
        filmById.get(a.filmId)!.teluguRelease.releaseDate ?? "",
      ),
    );

  const heroes = dataset.people.filter(
    (p) => p.status !== "excluded" && p.visibility !== "hidden" && (heroFilms.get(p.id)?.length ?? 0) > 0,
  );
  const windows: FilterWindow[] = ["all_time", "last_5_years", "last_10_films"];
  const snapshots = Object.fromEntries(
    windows.map((w) => [
      w,
      heroes.map((person) =>
        computeHeroSnapshot({
          person,
          window: w,
          rows: heroFilms.get(person.id)!,
          films,
          dataset,
          m,
          calculatedAt,
        }),
      ),
    ]),
  ) as Record<FilterWindow, HeroSnapshot[]>;
  for (const w of windows) applyStarScore(snapshots[w], m.id, fanPoints);

  return { asOf: dataset.asOf, calculatedAt, methodology: m, baselineRating, films, heroFilms, snapshots };
}
