import { PLATFORM_BAND_SCORE, TRADE_VERDICT_SCORE } from "@/lib/constants/methodology";
import type {
  ClaimConfidence,
  CommercialEvidence,
  Film,
  PlatformOutcomeBand,
  TradeVerdict,
  VersionScope,
} from "@/lib/domain/types";
import { midpointMinor, ratioMinor, relativeDifference, toMinor } from "./money";
import { clamp, round } from "./result";

export type CommercialBasis =
  | "recovery_ratio"
  | "trade_verdict"
  | "platform_band"
  | "synthetic_demo";

export interface CommercialScore {
  score: number | null;
  basis: CommercialBasis | null;
  confidence: ClaimConfidence | null;
  disputed: boolean;
  /** true when evidence existed but only at all-language scope for a dubbed title. */
  ignoredAllLanguageOnly: boolean;
  reason: string;
}

/** Claims that differ by more than this share of the larger value are flagged as disputed. */
export const DISPUTE_THRESHOLD = 0.15;

const CONFIDENCE_RANK: Record<ClaimConfidence, number> = { high: 3, medium: 2, low: 1, disputed: 0 };

export function expectedVersionScope(film: Film): VersionScope {
  return film.teluguRelease.releaseType === "dubbed" ? "telugu_dub" : "telugu_original";
}

/** Recovery ratio (distributor share ÷ theatrical business) → 0–100. 1.0× recovery = 60. */
export function recoveryRatioToScore(ratio: number): number {
  if (ratio < 1) return clamp(10 + ((ratio - 0.3) / 0.7) * 50, 0, 60);
  return clamp(60 + (ratio - 1) * 35, 60, 100);
}

/**
 * Detects material conflicts between approved numeric claims for the same metric.
 * Returns the conservative (lowest) midpoint and whether a dispute was found.
 */
export function reconcileAmountClaims(
  claims: CommercialEvidence[],
): { amount: bigint | null; disputed: boolean; confidence: ClaimConfidence | null } {
  const values = claims
    .map((c) => ({ c, v: midpointMinor(toMinor(c.amountLowMinor), toMinor(c.amountHighMinor)) }))
    .filter((x): x is { c: CommercialEvidence; v: bigint } => x.v !== null);
  if (values.length === 0) return { amount: null, disputed: false, confidence: null };
  let disputed = values.some((x) => x.c.confidence === "disputed");
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++)
      if (relativeDifference(values[i].v, values[j].v) > DISPUTE_THRESHOLD) disputed = true;
  const lowest = values.reduce((a, b) => (b.v < a.v ? b : a));
  const best = values.reduce((a, b) => (CONFIDENCE_RANK[b.c.confidence] > CONFIDENCE_RANK[a.c.confidence] ? b : a));
  return { amount: lowest.v, disputed, confidence: disputed ? "low" : best.c.confidence };
}

/**
 * Commercial / Platform Performance Score for one film.
 * - Dubbed titles only use Telugu-version (`telugu_dub`) evidence; all-language totals are ignored.
 * - OTT titles use platform evidence only; missing platform evidence stays unknown (never zero).
 */
export function calculateCommercialScore(film: Film, evidence: CommercialEvidence[]): CommercialScore {
  const approved = evidence.filter((e) => e.approvalStatus === "approved");
  const scope = expectedVersionScope(film);
  const scoped = approved.filter((e) => e.versionScope === scope);
  const ignoredAllLanguageOnly =
    scoped.length === 0 && approved.some((e) => e.versionScope === "all_language");

  const none = (reason: string): CommercialScore => ({
    score: null,
    basis: null,
    confidence: null,
    disputed: false,
    ignoredAllLanguageOnly,
    reason,
  });

  const synthetic = scoped.find((e) => e.metricType === "synthetic_outcome_score" && e.syntheticScore !== null);
  if (synthetic) {
    return {
      score: round(clamp(synthetic.syntheticScore ?? 0, 0, 100), 1),
      basis: "synthetic_demo",
      confidence: synthetic.confidence,
      disputed: synthetic.confidence === "disputed",
      ignoredAllLanguageOnly,
      reason: "Synthetic demo outcome — not a real-world figure.",
    };
  }

  if (film.teluguRelease.route === "ott") {
    const band = scoped
      .filter((e) => e.metricType === "platform_outcome_band" && e.valueText && e.valueText in PLATFORM_BAND_SCORE)
      .sort((a, b) => CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence])[0];
    if (!band) return none("OTT title without credible platform evidence: platform outcome unknown.");
    return {
      score: PLATFORM_BAND_SCORE[band.valueText as PlatformOutcomeBand],
      basis: "platform_band",
      confidence: band.confidence,
      disputed: band.confidence === "disputed",
      ignoredAllLanguageOnly,
      reason: "Editorial platform-outcome band from official platform evidence.",
    };
  }

  const share = reconcileAmountClaims(scoped.filter((e) => e.metricType === "telugu_distributor_share"));
  const business = reconcileAmountClaims(scoped.filter((e) => e.metricType === "telugu_theatrical_business"));
  if (share.amount !== null && business.amount !== null && business.amount > BigInt(0)) {
    const ratio = ratioMinor(share.amount, business.amount);
    if (ratio !== null) {
      const disputed = share.disputed || business.disputed;
      return {
        score: round(recoveryRatioToScore(ratio), 1),
        basis: "recovery_ratio",
        confidence: disputed ? "low" : lowerConfidence(share.confidence, business.confidence),
        disputed,
        ignoredAllLanguageOnly,
        reason: `Telugu distributor share recovered ${round(ratio * 100, 0)}% of theatrical business${disputed ? " (claims disputed — conservative value used)" : ""}.`,
      };
    }
  }

  const verdict = scoped
    .filter((e) => e.metricType === "trade_verdict" && e.valueText && e.valueText in TRADE_VERDICT_SCORE)
    .sort((a, b) => CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence])[0];
  if (verdict && verdict.confidence !== "disputed") {
    return {
      score: TRADE_VERDICT_SCORE[verdict.valueText as TradeVerdict],
      basis: "trade_verdict",
      confidence: verdict.confidence,
      disputed: false,
      ignoredAllLanguageOnly,
      reason: "Release-time trade verdict (source-level, not audited).",
    };
  }

  return none(
    ignoredAllLanguageOnly
      ? "Only all-language collections reported for a dubbed title: Telugu commercial evidence unknown."
      : "No approved Telugu commercial evidence.",
  );
}

function lowerConfidence(a: ClaimConfidence | null, b: ClaimConfidence | null): ClaimConfidence | null {
  if (!a || !b) return a ?? b;
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}
