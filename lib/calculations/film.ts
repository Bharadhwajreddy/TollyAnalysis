import { LEGACY_SCORE, type MethodologyVersion } from "@/lib/constants/methodology";
import type { ClaimConfidence, LegacyStatus, ScoringStatus } from "@/lib/domain/types";
import type { FilmAudienceScore } from "./audience";
import type { CommercialScore } from "./commercial";
import { clamp, round } from "./result";

const COMMERCIAL_CONFIDENCE_POINTS: Record<ClaimConfidence, number> = {
  high: 40,
  medium: 28,
  low: 15,
  disputed: 5,
};

/**
 * Evidence Quality Score (0–100): rewards confident audience evidence,
 * confident commercial/platform evidence and independent corroborating sources.
 */
export function calculateEvidenceQualityScore(input: {
  audience: FilmAudienceScore | null;
  commercial: CommercialScore | null;
  independentSourceCount: number;
}): number {
  let score = 0;
  if (input.audience) score += 20 + 20 * input.audience.confidenceWeight;
  if (input.commercial?.score != null && input.commercial.confidence)
    score += COMMERCIAL_CONFIDENCE_POINTS[input.commercial.confidence];
  if (input.independentSourceCount >= 2) score += 20;
  return round(clamp(score, 0, 100), 1);
}

/**
 * Share (0–100) of the Film Success Score weight backed by real evidence.
 * Evidence quality is derived, so it does not count towards coverage.
 */
export function calculateEvidenceCoverage(
  available: { audience: boolean; commercialPlatform: boolean; legacy: boolean },
  weights: MethodologyVersion["filmScoreWeights"],
): number {
  const total = weights.audience + weights.commercialPlatform + weights.legacy;
  if (total <= 0) return 0;
  const have =
    (available.audience ? weights.audience : 0) +
    (available.commercialPlatform ? weights.commercialPlatform : 0) +
    (available.legacy ? weights.legacy : 0);
  return round((have / total) * 100, 1);
}

export interface FilmSuccessResult {
  score: number | null;
  /** Score computed even for `not_yet_final` titles, for display only; never used in ratios. */
  indicativeScore: number | null;
  status: ScoringStatus;
  coveragePercent: number;
  components: {
    audience: number | null;
    commercialPlatform: number | null;
    evidenceQuality: number;
    legacy: number | null;
  };
  explanation: string;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000;
}

/**
 * Film Success Score = 0.35·Audience + 0.35·Commercial/Platform + 0.20·Evidence Quality + 0.10·Legacy.
 * Missing components are never treated as zero: their weight is redistributed and
 * coverage drops. With neither audience nor commercial evidence the film is
 * `insufficient_evidence`; with only one of them it is `provisional`.
 */
export function calculateFilmSuccessScore(input: {
  audience: FilmAudienceScore | null;
  commercial: CommercialScore | null;
  evidenceQuality: number;
  legacyStatus: LegacyStatus | null;
  releaseDate: string | null;
  asOf: string;
  methodology: MethodologyVersion;
}): FilmSuccessResult {
  const w = input.methodology.filmScoreWeights;
  const audience = input.audience?.score ?? null;
  const commercialPlatform = input.commercial?.score ?? null;
  const legacy = input.legacyStatus ? LEGACY_SCORE[input.legacyStatus] : null;
  const components = { audience, commercialPlatform, evidenceQuality: input.evidenceQuality, legacy };
  const coveragePercent = calculateEvidenceCoverage(
    { audience: audience !== null, commercialPlatform: commercialPlatform !== null, legacy: legacy !== null },
    w,
  );

  const parts: [number | null, number][] = [
    [audience, w.audience],
    [commercialPlatform, w.commercialPlatform],
    [input.evidenceQuality, w.evidenceQuality],
    [legacy, w.legacy],
  ];
  const usable = parts.filter((p): p is [number, number] => p[0] !== null);
  const weightSum = usable.reduce((a, [, wt]) => a + wt, 0);
  const raw = weightSum > 0 ? usable.reduce((a, [v, wt]) => a + v * wt, 0) / weightSum : null;

  if (audience === null && commercialPlatform === null) {
    return {
      score: null,
      indicativeScore: null,
      status: "insufficient_evidence",
      coveragePercent,
      components,
      explanation: "Neither audience nor commercial/platform evidence is available.",
    };
  }

  const indicative = raw === null ? null : round(raw, 1);
  if (input.releaseDate && daysBetween(input.releaseDate, input.asOf) < input.methodology.recentReleaseDays) {
    return {
      score: null,
      indicativeScore: indicative,
      status: "not_yet_final",
      coveragePercent,
      components,
      explanation: `Released within ${input.methodology.recentReleaseDays} days; run not yet reconciled.`,
    };
  }

  const status: ScoringStatus = audience !== null && commercialPlatform !== null ? "scored" : "provisional";
  return {
    score: indicative,
    indicativeScore: indicative,
    status,
    coveragePercent,
    components,
    explanation:
      status === "scored"
        ? "All core components available."
        : `Provisional: ${audience === null ? "audience" : "commercial/platform"} evidence missing; weight redistributed.`,
  };
}
