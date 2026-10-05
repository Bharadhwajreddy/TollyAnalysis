import type { HeroMetricKey, HeroSnapshot } from "./engine";
import { coverage, round, type MetricResult } from "./result";

/**
 * Star Score (0–100): one number that combines every KPI we have.
 *
 * Each part is first turned into a 0–100 score:
 *   • counts and money (hits, blockbusters, box office, films, fans' votes) → percentile rank
 *     among the heroes compared (50 = middle of the pack, 100 = best);
 *   • ratios that are already out of 100 (success ratio, recent success) → used as they are,
 *     after blending small samples toward the typical hero so 2-for-2 doesn't count as 100%;
 *   • social reach → official X + Instagram followers on a log scale (10k = 0, 100M = 100).
 * Box-office money parts count only when at least 3 films, and a quarter of the hero's films,
 * have a reported gross; otherwise they are treated as missing rather than as small.
 * The Star Score is the weighted mean of the parts a hero has. A missing part is never
 * counted as zero: its weight is shared among the parts that exist, and the score is
 * withheld when less than half of the weight has data.
 */

export type StarPartKey =
  | "successRatio"
  | "hits"
  | "blockbusters"
  | "totalGross"
  | "topGross"
  | "avgGross"
  | "recentSuccess"
  | "films"
  | "socialReach"
  | "fans";

export interface StarPartDef {
  key: StarPartKey;
  label: string;
  weight: number;
  how: string;
}

export const STAR_PARTS: StarPartDef[] = [
  { key: "successRatio", label: "Success ratio", weight: 20, how: "Hits ÷ films with a known result, blended toward the typical hero for small samples" },
  { key: "hits", label: "Hit films", weight: 15, how: "Number of hits and blockbusters, as a percentile" },
  { key: "totalGross", label: "Total box office", weight: 15, how: "Reported worldwide gross of all his films, as a percentile" },
  { key: "blockbusters", label: "Blockbusters", weight: 10, how: "Number of blockbusters, as a percentile" },
  { key: "recentSuccess", label: "Recent success", weight: 10, how: "Hits among his latest 5 judged films, blended toward the typical hero" },
  { key: "socialReach", label: "Social media reach", weight: 10, how: "Official X + Instagram followers added up, log scale (10k = 0, 100M = 100)" },
  { key: "topGross", label: "Biggest film", weight: 5, how: "His highest-grossing film, as a percentile" },
  { key: "avgGross", label: "Box office per film", weight: 5, how: "Average gross of his films with a reported gross, as a percentile" },
  { key: "films", label: "Films as lead", weight: 10, how: "Number of lead films, as a percentile" },
  { key: "fans", label: "Fans' votes", weight: 5, how: "Points from visitors' top-3 ballots on this site, as a percentile (only when the fans' ranking is on)" },
];

export interface StarPart {
  key: StarPartKey;
  label: string;
  weight: number;
  /** Weight after missing parts were shared out (sums to 100 over available parts). */
  effectiveWeight: number;
  /** 0–100 part score, or null when the hero has no data for it. */
  score: number | null;
  /** The underlying KPI value as shown elsewhere (e.g. 19 hits, 83%). */
  raw: number | null;
}

const MIN_WEIGHT_SHARE = 0.5;
/** Pseudo-films added when blending a ratio toward the typical hero. */
const PRIOR_FILMS = 5;
const PRIOR_RECENT = 2;

/** Percentile rank 0–100 with ties sharing the average rank. */
function percentiles(values: Map<string, number>): Map<string, number> {
  const entries = [...values.entries()].sort((a, b) => a[1] - b[1]);
  const out = new Map<string, number>();
  const n = entries.length;
  if (n === 1) {
    out.set(entries[0][0], 50);
    return out;
  }
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && entries[j + 1][1] === entries[i][1]) j++;
    const pct = (((i + j) / 2) / (n - 1)) * 100;
    for (let k = i; k <= j; k++) out.set(entries[k][0], round(pct, 1));
    i = j + 1;
  }
  return out;
}

const valueOf = (s: HeroSnapshot, k: HeroMetricKey) => (s.metrics[k].status === "insufficient" ? null : s.metrics[k].value);

/** Money parts need enough reported grosses; otherwise a sparsely reported career would look small. */
const MONEY: HeroMetricKey[] = ["totalGross", "topGross", "avgGross"];
const MIN_GROSS_FILMS = 3;
const MIN_GROSS_SHARE = 0.25;
const moneyCovered = (s: HeroSnapshot) => {
  const c = s.metrics.totalGross.coverage;
  return c.numerator >= MIN_GROSS_FILMS && c.numerator / Math.max(1, c.denominator) >= MIN_GROSS_SHARE;
};

/**
 * Adds `metrics.starScore` and `starParts` to every snapshot of one window.
 * `fanPoints` maps personId → fans' ranking points (omit when the feature is off).
 */
export function applyStarScore(snaps: HeroSnapshot[], methodVersion: string, fanPoints?: Map<string, number>): void {
  // Typical hero: pooled success rate across all judged films of the heroes compared.
  let hitSum = 0;
  let judgedSum = 0;
  for (const s of snaps) {
    const r = s.metrics.overallSuccessRatio;
    if (r.value === null) continue;
    hitSum += (r.value / 100) * r.coverage.numerator;
    judgedSum += r.coverage.numerator;
  }
  const prior = judgedSum ? hitSum / judgedSum : 0.5;
  const blend = (pct: number | null, n: number, k: number) => (pct === null || n === 0 ? null : round(((pct / 100) * n + prior * k) / (n + k) * 100, 1));

  const pctOf = (k: HeroMetricKey) => {
    const m = new Map<string, number>();
    for (const s of snaps) {
      const v = valueOf(s, k);
      if (v !== null && (!MONEY.includes(k) || moneyCovered(s))) m.set(s.personId, v);
    }
    return percentiles(m);
  };
  const pct: Partial<Record<StarPartKey, Map<string, number>>> = {
    hits: pctOf("hits"),
    blockbusters: pctOf("blockbusters"),
    totalGross: pctOf("totalGross"),
    topGross: pctOf("topGross"),
    avgGross: pctOf("avgGross"),
    films: pctOf("films"),
  };
  if (fanPoints && [...fanPoints.values()].some((v) => v > 0)) {
    const m = new Map<string, number>();
    for (const s of snaps) m.set(s.personId, fanPoints.get(s.personId) ?? 0);
    pct.fans = percentiles(m);
  }

  for (const s of snaps) {
    const sr = s.metrics.overallSuccessRatio;
    const rr = s.metrics.recentSuccessRatio;
    const parts: StarPart[] = STAR_PARTS.map((def) => {
      let score: number | null = null;
      let raw: number | null = null;
      switch (def.key) {
        case "successRatio":
          raw = sr.value;
          score = blend(sr.value, sr.coverage.numerator, PRIOR_FILMS);
          break;
        case "recentSuccess":
          raw = rr.value;
          score = blend(rr.value, rr.coverage.numerator, PRIOR_RECENT);
          break;
        case "socialReach":
          raw = valueOf(s, "socialReach");
          score = raw;
          break;
        case "fans":
          raw = fanPoints?.get(s.personId) ?? null;
          score = pct.fans?.get(s.personId) ?? null;
          break;
        default: {
          raw = valueOf(s, def.key as HeroMetricKey);
          score = pct[def.key]?.get(s.personId) ?? null;
        }
      }
      return { key: def.key, label: def.label, weight: def.weight, effectiveWeight: 0, score, raw };
    });
    // The fans' part only exists while the fans' ranking is switched on.
    const considered = parts.filter((p) => p.key !== "fans" || pct.fans);
    const available = considered.filter((p) => p.score !== null);
    const totalWeight = considered.reduce((a, p) => a + p.weight, 0);
    const availWeight = available.reduce((a, p) => a + p.weight, 0);
    for (const p of available) p.effectiveWeight = round((p.weight / availWeight) * 100, 1);
    const value = availWeight / totalWeight >= MIN_WEIGHT_SHARE ? round(available.reduce((a, p) => a + (p.score as number) * p.weight, 0) / availWeight, 1) : null;
    const judged = sr.coverage.numerator;
    const metric: MetricResult = {
      value,
      coverage: coverage(available.length, considered.length),
      status: value === null ? "insufficient" : judged < 5 ? "low_sample" : "ok",
      methodVersion,
      explanation:
        value === null
          ? `Not enough data: only ${Math.round((availWeight / totalWeight) * 100)}% of the score's weight has data.`
          : `Weighted blend of ${available.length} of ${considered.length} KPIs (${Math.round((availWeight / totalWeight) * 100)}% of the weight has data).`,
    };
    s.metrics.starScore = metric;
    s.starParts = considered;
  }
}
