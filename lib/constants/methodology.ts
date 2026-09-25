import type { LegacyStatus, PlatformOutcomeBand, TradeVerdict } from "@/lib/domain/types";

/**
 * Versioned methodology. In live mode the active row of `methodology_versions`
 * overrides these values; the demo build uses this object directly.
 */
export interface MethodologyVersion {
  id: string;
  versionName: string;
  effectiveFrom: string;
  filmScoreWeights: {
    audience: number;
    commercialPlatform: number;
    evidenceQuality: number;
    legacy: number;
  };
  heroScoreWeights: {
    filmSuccess: number;
    audience: number;
    consistency: number;
    socialReach: number;
    momentum: number;
  };
  /** Bayesian minimum-vote threshold `m`. */
  voteThresholdM: number;
  /** Fallback baseline rating `C` when the title universe is too small to derive one. */
  baselineRatingFallback: number;
  /** Rating range mapped onto the 0–100 audience index. */
  ratingIndexFloor: number;
  ratingIndexCeiling: number;
  /** Film Success Score at or above which a film counts as a success. */
  successThreshold: number;
  audienceSuccessThreshold: number;
  /** Films released within this many days of the as-of date are `not_yet_final`. */
  recentReleaseDays: number;
  consistencyMinFilms: number;
  consistencyMaxStdDev: number;
  momentumWindow: number;
  /** Momentum delta (score points) that maps to the 0 / 100 ends of the index. */
  momentumDeltaRange: number;
  /** Reach range (log10 of combined official followers) mapped to 0–100. */
  socialLog10Floor: number;
  socialLog10Ceiling: number;
  minEligibleFilmsForDefaultRoster: number;
  notes: string;
}

export const METHODOLOGY: MethodologyVersion = {
  id: "mv-2026-09-demo",
  versionName: "v0.1 (demo baseline)",
  effectiveFrom: "2026-09-01",
  filmScoreWeights: {
    audience: 0.35,
    commercialPlatform: 0.35,
    evidenceQuality: 0.2,
    legacy: 0.1,
  },
  heroScoreWeights: {
    filmSuccess: 0.35,
    audience: 0.25,
    consistency: 0.15,
    socialReach: 0.15,
    momentum: 0.1,
  },
  voteThresholdM: 2500,
  baselineRatingFallback: 6.2,
  ratingIndexFloor: 3,
  ratingIndexCeiling: 9,
  successThreshold: 60,
  audienceSuccessThreshold: 60,
  recentReleaseDays: 120,
  consistencyMinFilms: 3,
  consistencyMaxStdDev: 25,
  momentumWindow: 5,
  momentumDeltaRange: 20,
  socialLog10Floor: 4,
  socialLog10Ceiling: 8,
  minEligibleFilmsForDefaultRoster: 3,
  notes:
    "Baseline weights proposed in the product brief. Critic reviews are excluded from v1. All weights are configurable and versioned.",
};

export const TRADE_VERDICT_SCORE: Record<TradeVerdict, number> = {
  disaster: 5,
  flop: 20,
  below_average: 35,
  average: 50,
  above_average: 62,
  hit: 75,
  super_hit: 87,
  blockbuster: 97,
};

export const PLATFORM_BAND_SCORE: Record<PlatformOutcomeBand, number> = {
  weak: 30,
  moderate: 55,
  strong: 78,
  exceptional: 92,
};

/** `not_reviewed` returns null: the component is unavailable, not zero. */
export const LEGACY_SCORE: Record<LegacyStatus, number | null> = {
  none: 50,
  reappraised: 70,
  enduring_popularity: 82,
  cult_favourite: 88,
  not_reviewed: null,
};
