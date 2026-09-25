import type { ReceptionEvidence } from "@/lib/domain/types";
import { clamp, round } from "./result";

/**
 * Bayesian vote-confidence adjustment:
 *   adjusted = (v / (v + m)) × R + (m / (v + m)) × C
 * With no votes the result collapses to the baseline C.
 */
export function calculateBayesianRating(input: {
  rating: number;
  votes: number;
  baseline: number;
  minVotes: number;
}): number {
  const v = Math.max(0, input.votes);
  const m = Math.max(0, input.minVotes);
  if (v + m === 0) return input.baseline;
  return (v / (v + m)) * input.rating + (m / (v + m)) * input.baseline;
}

/** Linear map of `value` from [floor, ceiling] onto 0–100, clamped. */
export function normaliseToIndex(value: number, floor: number, ceiling: number): number {
  if (ceiling <= floor) return 0;
  return clamp(((value - floor) / (ceiling - floor)) * 100, 0, 100);
}

/** Vote-weighted mean rating across the title universe; the `C` of the Bayesian formula. */
export function calculateBaselineRating(
  evidence: Pick<ReceptionEvidence, "rating" | "voteCount">[],
  fallback: number,
  minTitles = 20,
): number {
  if (evidence.length < minTitles) return fallback;
  const totalVotes = evidence.reduce((a, e) => a + e.voteCount, 0);
  if (totalVotes <= 0) return fallback;
  return evidence.reduce((a, e) => a + e.rating * e.voteCount, 0) / totalVotes;
}

export interface FilmAudienceScore {
  /** 0–100 index of the adjusted rating. */
  score: number;
  adjustedRating: number;
  rawRating: number;
  voteCount: number;
  /** v / (v + m): how much the film's own votes drive the adjusted rating. */
  confidenceWeight: number;
  provider: ReceptionEvidence["provider"];
}

/**
 * Picks the primary approved reception source (IMDb, then TMDb, then synthetic demo)
 * and turns it into a confidence-adjusted 0–100 score. Returns null when none exists.
 */
export function calculateFilmAudienceScore(
  evidence: ReceptionEvidence[],
  opts: { baseline: number; minVotes: number; floor: number; ceiling: number },
): FilmAudienceScore | null {
  const approved = evidence.filter((e) => e.approvalStatus === "approved" && e.voteCount >= 0);
  const priority: ReceptionEvidence["provider"][] = ["imdb", "tmdb", "synthetic_demo"];
  const primary = priority
    .map((p) => approved.filter((e) => e.provider === p).sort((a, b) => b.retrievedAt.localeCompare(a.retrievedAt))[0])
    .find(Boolean);
  if (!primary) return null;
  const adjusted = calculateBayesianRating({
    rating: primary.rating,
    votes: primary.voteCount,
    baseline: opts.baseline,
    minVotes: opts.minVotes,
  });
  return {
    score: round(normaliseToIndex(adjusted, opts.floor, opts.ceiling), 1),
    adjustedRating: round(adjusted, 2),
    rawRating: primary.rating,
    voteCount: primary.voteCount,
    confidenceWeight: round(primary.voteCount / (primary.voteCount + opts.minVotes), 3),
    provider: primary.provider,
  };
}
