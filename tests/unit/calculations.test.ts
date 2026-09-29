import { describe, expect, it } from "vitest";
import {
  calculateBayesianRating,
  calculateCommercialScore,
  calculateConfidenceGrade,
  calculateConsistencyIndex,
  calculateEvidenceCoverage,
  calculateFilmAudienceScore,
  calculateFilmSuccessScore,
  calculateFilmsPerActiveYear,
  calculateHeroPerformanceIndex,
  calculateMedianReleaseGapMonths,
  calculateOverallSuccessRatio,
  calculatePeakFilmsInCalendarYear,
  calculateRecentMomentum,
  calculateSocialReachIndex,
  calculateAudienceIndex,
  majorToMinor,
  normaliseToIndex,
  ratioMinor,
  reconcileAmountClaims,
  type HeroFilmInput,
} from "@/lib/calculations";
import { METHODOLOGY as M } from "@/lib/constants/methodology";
import { AS_OF, claim, film, rating } from "./fixtures";

const hf = (id: string, date: string | null, score: number | null, over: Partial<HeroFilmInput> = {}): HeroFilmInput => ({
  filmId: id,
  releaseDate: date,
  status: score === null ? "insufficient_evidence" : "scored",
  filmSuccessScore: score,
  audienceScore: score,
  audienceConfidenceWeight: 0.8,
  coveragePercent: 100,
  ...over,
});

describe("calculateBayesianRating", () => {
  it("shrinks thinly-voted ratings toward the baseline", () => {
    const few = calculateBayesianRating({ rating: 9.5, votes: 50, baseline: 6, minVotes: 2500 });
    const many = calculateBayesianRating({ rating: 9.5, votes: 250_000, baseline: 6, minVotes: 2500 });
    expect(few).toBeCloseTo(6.07, 2);
    expect(many).toBeGreaterThan(9.4);
  });
  it("returns the baseline with zero votes and a zero threshold (no division by zero)", () => {
    expect(calculateBayesianRating({ rating: 8, votes: 0, baseline: 6.2, minVotes: 0 })).toBe(6.2);
  });
});

describe("normaliseToIndex", () => {
  it("maps linearly and clamps", () => {
    expect(normaliseToIndex(6, 3, 9)).toBe(50);
    expect(normaliseToIndex(10, 3, 9)).toBe(100);
    expect(normaliseToIndex(1, 3, 9)).toBe(0);
    expect(normaliseToIndex(5, 5, 5)).toBe(0);
  });
});

describe("calculateFilmAudienceScore", () => {
  const opts = { baseline: 6, minVotes: 2500, floor: 3, ceiling: 9 };
  it("returns null for empty ratings rather than zero", () => {
    expect(calculateFilmAudienceScore([], opts)).toBeNull();
  });
  it("prefers IMDb over TMDb when both are approved", () => {
    const s = calculateFilmAudienceScore(
      [rating("a", 7, 10_000, { provider: "tmdb" }), rating("a", 8, 10_000, { provider: "imdb" })],
      opts,
    );
    expect(s?.provider).toBe("imdb");
    expect(s?.rawRating).toBe(8);
  });
  it("ignores unapproved evidence", () => {
    expect(calculateFilmAudienceScore([rating("a", 8, 10, { approvalStatus: "pending" })], opts)).toBeNull();
  });
});

describe("money helpers", () => {
  it("parses decimals without float drift", () => {
    expect(majorToMinor("0.1")! + majorToMinor("0.2")!).toBe(majorToMinor("0.3"));
    expect(majorToMinor("12.345")).toBe(BigInt(1234));
  });
  it("never divides by zero", () => {
    expect(ratioMinor(BigInt(5), BigInt(0))).toBeNull();
  });
});

describe("commercial score", () => {
  const original = film("o", "2019-01-01");
  const dub = film("d", "2019-01-01", { originalLanguage: "ta" }, { releaseType: "dubbed" });
  const ott = film("t", "2021-01-01", { releaseRoute: "ott" }, { route: "ott" });

  it("does not credit all-language worldwide gross to a Telugu dub", () => {
    const res = calculateCommercialScore(dub, [
      claim("d", { metricType: "worldwide_all_language", versionScope: "all_language", amountLowMinor: "90000000000" }),
    ]);
    expect(res.score).toBeNull();
    expect(res.ignoredAllLanguageOnly).toBe(true);
  });

  it("uses Telugu-dub evidence when separately reported", () => {
    const res = calculateCommercialScore(dub, [claim("d", { versionScope: "telugu_dub", valueText: "hit" })]);
    expect(res.score).toBe(75);
    expect(res.basis).toBe("trade_verdict");
  });

  it("leaves OTT platform outcome unknown instead of zero when evidence is missing", () => {
    const res = calculateCommercialScore(ott, [claim("t", { valueText: "hit" })]);
    expect(res.score).toBeNull();
    expect(res.reason).toMatch(/unknown/i);
  });

  it("scores OTT titles from platform evidence", () => {
    const res = calculateCommercialScore(ott, [claim("t", { metricType: "platform_outcome_band", valueText: "strong" })]);
    expect(res.score).toBe(78);
    expect(res.basis).toBe("platform_band");
  });

  it("detects disputed collections and uses the conservative value", () => {
    const claims = [
      claim("o", { metricType: "telugu_distributor_share", amountLowMinor: "5000000000" }),
      claim("o", { metricType: "telugu_distributor_share", amountLowMinor: "8000000000", sourceId: "s3" }),
      claim("o", { metricType: "telugu_theatrical_business", amountLowMinor: "5000000000" }),
    ];
    const reconciled = reconcileAmountClaims(claims.slice(0, 2));
    expect(reconciled.disputed).toBe(true);
    expect(reconciled.amount).toBe(BigInt("5000000000"));
    const res = calculateCommercialScore(original, claims);
    expect(res.basis).toBe("recovery_ratio");
    expect(res.disputed).toBe(true);
    expect(res.confidence).toBe("low");
    expect(res.score).toBe(60); // 1.0× recovery
  });

  it("ignores a trade verdict explicitly marked disputed", () => {
    expect(calculateCommercialScore(original, [claim("o", { valueText: "hit", confidence: "disputed" })]).score).toBeNull();
  });
});

describe("calculateFilmSuccessScore", () => {
  const audience = { score: 70, adjustedRating: 7.2, rawRating: 7.5, voteCount: 9000, confidenceWeight: 0.78, provider: "tmdb" as const };
  const commercial = { score: 80, basis: "trade_verdict" as const, confidence: "high" as const, disputed: false, ignoredAllLanguageOnly: false, reason: "", label: "hit" as const, grossCrore: null, budgetCrore: null, multiple: null };
  const base = { evidenceQuality: 80, legacyStatus: "none" as const, releaseDate: "2020-01-01", asOf: AS_OF, methodology: M };

  it("applies the 35/35/20/10 weights", () => {
    const r = calculateFilmSuccessScore({ ...base, audience, commercial });
    expect(r.status).toBe("scored");
    expect(r.score).toBeCloseTo(0.35 * 70 + 0.35 * 80 + 0.2 * 80 + 0.1 * 50, 5);
    expect(r.coveragePercent).toBe(100);
  });
  it("is provisional and redistributes weight when commercial evidence is missing", () => {
    const r = calculateFilmSuccessScore({ ...base, audience, commercial: null });
    expect(r.status).toBe("provisional");
    expect(r.score).toBeCloseTo((0.35 * 70 + 0.2 * 80 + 0.1 * 50) / 0.65, 1);
    expect(r.coveragePercent).toBeCloseTo(56.3, 1);
  });
  it("marks films with no audience or commercial evidence as insufficient", () => {
    const r = calculateFilmSuccessScore({ ...base, audience: null, commercial: null });
    expect(r.status).toBe("insufficient_evidence");
    expect(r.score).toBeNull();
  });
  it("marks recent releases as not_yet_final and withholds the score", () => {
    const r = calculateFilmSuccessScore({ ...base, audience, commercial, releaseDate: "2026-08-01" });
    expect(r.status).toBe("not_yet_final");
    expect(r.score).toBeNull();
    expect(r.indicativeScore).not.toBeNull();
  });
  it("treats not_reviewed legacy as unavailable, not zero", () => {
    expect(calculateEvidenceCoverage({ audience: true, commercialPlatform: true, legacy: false }, M.filmScoreWeights)).toBe(87.5);
  });
});

describe("hero metrics", () => {
  it("counts success ratio over scored films only", () => {
    const films = [hf("a", "2020-01-01", 70), hf("b", "2021-01-01", 40), hf("c", "2022-01-01", null)];
    const r = calculateOverallSuccessRatio(films, M);
    expect(r.value).toBe(50);
    expect(r.coverage).toEqual({ numerator: 2, denominator: 3, percent: 66.7 });
  });
  it("returns insufficient (not zero) with no scored films", () => {
    const r = calculateOverallSuccessRatio([hf("a", "2020-01-01", null)], M);
    expect(r.value).toBeNull();
    expect(r.status).toBe("insufficient");
  });
  it("weights audience index by vote confidence", () => {
    const r = calculateAudienceIndex(
      [hf("a", "2020-01-01", 80, { audienceConfidenceWeight: 1 }), hf("b", "2020-01-01", 40, { audienceConfidenceWeight: 0.1 })],
      M,
    );
    expect(r.value).toBeGreaterThan(75);
  });
  it("requires a minimum sample for consistency", () => {
    expect(calculateConsistencyIndex([hf("a", "2020-01-01", 70), hf("b", "2021-01-01", 70)], M).value).toBeNull();
    expect(calculateConsistencyIndex([hf("a", "2020-01-01", 70), hf("b", "2021-01-01", 70), hf("c", "2022-01-01", 70)], M).value).toBe(100);
  });
  it("momentum is 50 on baseline and flags low samples", () => {
    const films = [hf("a", "2020-01-01", 60), hf("b", "2021-01-01", 60), hf("c", "2022-01-01", 60)];
    const r = calculateRecentMomentum(films, films, M);
    expect(r.value).toBe(50);
    expect(r.status).toBe("low_sample");
  });
  it("momentum rises when recent films beat the career baseline", () => {
    const career = [hf("a", "2010-01-01", 40), hf("b", "2011-01-01", 40), hf("c", "2012-01-01", 40), hf("d", "2024-01-01", 80), hf("e", "2025-01-01", 80)];
    // recency-weighted recent mean 64 vs baseline 56 → +8 points → 50 + 8/20·50
    expect(calculateRecentMomentum(career, career, M).value).toBe(70);
  });
});

describe("release cadence", () => {
  const three = [hf("a", "2022-01-10", 50), hf("b", "2022-05-10", 50), hf("c", "2022-11-10", 50)];
  const two = [hf("d", "2022-01-10", 50), hf("e", "2022-08-10", 50), hf("f", "2024-01-10", 50)];

  it("peak films in one year ranks three releases above two", () => {
    expect(calculatePeakFilmsInCalendarYear(three, M).value).toBe(3);
    expect(calculatePeakFilmsInCalendarYear(two, M).value).toBe(2);
  });
  it("median release gap in months", () => {
    expect(calculateMedianReleaseGapMonths(three, M).value).toBeCloseTo(4.9, 0);
    expect(calculateMedianReleaseGapMonths([hf("a", "2022-01-01", 50)], M).value).toBeNull();
  });
  it("films per active year uses an inclusive span with a minimum denominator of 1", () => {
    expect(calculateFilmsPerActiveYear(three, M).value).toBe(3);
    expect(calculateFilmsPerActiveYear(two, M).value).toBe(1); // 3 films / 3 years (2022–2024)
  });
});

describe("social reach", () => {
  it("uses official profiles only and the latest snapshot per platform", () => {
    const r = calculateSocialReachIndex(
      [
        { personId: "p", platform: "instagram", profileUrl: "", isOfficial: true, followersCount: 1_000_000, snapshotAt: "2026-01-01", sourceMethod: "api" },
        { personId: "p", platform: "instagram", profileUrl: "", isOfficial: true, followersCount: 10_000_000, snapshotAt: "2026-06-01", sourceMethod: "api" },
        { personId: "p", platform: "x", profileUrl: "", isOfficial: false, followersCount: 90_000_000, snapshotAt: "2026-06-01", sourceMethod: "api" },
      ],
      M,
    );
    expect(r.value).toBe(75); // log10(1e7)=7 → (7-4)/(8-4)
    expect(r.snapshotAt).toBe("2026-06-01");
  });
  it("is insufficient without snapshots", () => {
    expect(calculateSocialReachIndex([], M).value).toBeNull();
  });
});

describe("hero performance index", () => {
  it("combines the five components with the versioned weights", () => {
    const r = calculateHeroPerformanceIndex({ filmSuccess: 60, audience: 70, consistency: 80, socialReach: 50, momentum: 40 }, M);
    expect(r.value).toBeCloseTo(0.35 * 60 + 0.25 * 70 + 0.15 * 80 + 0.15 * 50 + 0.1 * 40, 1);
    expect(r.status).toBe("ok");
  });
  it("redistributes weight for unavailable components", () => {
    const r = calculateHeroPerformanceIndex({ filmSuccess: 60, audience: 60, consistency: null, socialReach: null, momentum: null }, M);
    expect(r.value).toBe(60);
    expect(r.status).toBe("low_sample");
  });
  it("is withheld without film success and audience indices", () => {
    expect(calculateHeroPerformanceIndex({ filmSuccess: null, audience: 60, consistency: 60, socialReach: 60, momentum: 60 }, M).value).toBeNull();
  });
});

describe("confidence grade", () => {
  it("grades by sample size and coverage", () => {
    expect(calculateConfidenceGrade(10, 80)).toBe("high");
    expect(calculateConfidenceGrade(6, 60)).toBe("medium");
    expect(calculateConfidenceGrade(1, 50)).toBe("low");
    expect(calculateConfidenceGrade(0, 0)).toBe("insufficient");
  });
});
