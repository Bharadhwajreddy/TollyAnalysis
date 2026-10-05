import { describe, expect, it } from "vitest";
import type { HeroMetricKey, HeroSnapshot } from "@/lib/calculations/engine";
import { coverage, type MetricResult } from "@/lib/calculations/result";
import { applyStarScore, STAR_PARTS } from "@/lib/calculations/star";

const mr = (value: number | null, n = 10, d = 10): MetricResult => ({ value, coverage: coverage(n, d), status: value === null ? "insufficient" : "ok", methodVersion: "t", explanation: "" });

function snap(id: string, v: Partial<Record<HeroMetricKey, MetricResult>>): HeroSnapshot {
  const empty = mr(null, 0, 0);
  const metrics = new Proxy({} as Record<HeroMetricKey, MetricResult>, { get: (t, k: string) => (k in t ? t[k as HeroMetricKey] : (v[k as HeroMetricKey] ?? empty)), set: (t, k: string, val) => ((t[k as HeroMetricKey] = val), true) });
  return { personId: id, slug: id, name: id, metrics } as unknown as HeroSnapshot;
}

describe("Star Score", () => {
  it("weights add up to 100 without the fans' part", () => {
    expect(STAR_PARTS.filter((p) => p.key !== "fans").reduce((a, p) => a + p.weight, 0)).toBe(100);
  });

  it("ranks a stronger record higher and never counts missing data as zero", () => {
    const strong = snap("a", { overallSuccessRatio: mr(80, 20, 20), hits: mr(16), blockbusters: mr(5), totalGross: mr(2000, 10, 20), topGross: mr(500, 10, 20), avgGross: mr(200, 10, 20), recentSuccessRatio: mr(80, 5, 5), films: mr(25), socialReach: mr(80) });
    const weak = snap("b", { overallSuccessRatio: mr(20, 20, 20), hits: mr(4), blockbusters: mr(0), totalGross: mr(100, 10, 20), topGross: mr(40, 10, 20), avgGross: mr(10, 10, 20), recentSuccessRatio: mr(20, 5, 5), films: mr(20), socialReach: mr(40) });
    // No reported grosses and no followers: those parts are skipped, not zero.
    const sparse = snap("c", { overallSuccessRatio: mr(80, 20, 20), hits: mr(16), blockbusters: mr(5), recentSuccessRatio: mr(80, 5, 5), films: mr(25) });
    applyStarScore([strong, weak, sparse], "t");
    const v = (s: HeroSnapshot) => s.metrics.starScore.value!;
    expect(v(strong)).toBeGreaterThan(v(weak));
    expect(v(sparse)).toBeGreaterThan(v(weak));
    const parts = sparse.starParts!;
    expect(parts.find((p) => p.key === "totalGross")!.score).toBeNull();
    expect(parts.filter((p) => p.score !== null).reduce((a, p) => a + p.effectiveWeight, 0)).toBeCloseTo(100, 0);
  });

  it("ignores box-office money when too few films report a gross", () => {
    const a = snap("a", { overallSuccessRatio: mr(50, 10, 10), totalGross: mr(10, 1, 59), topGross: mr(10, 1, 59), avgGross: mr(10, 1, 59), films: mr(59) });
    const b = snap("b", { overallSuccessRatio: mr(50, 10, 10), totalGross: mr(500, 10, 20), topGross: mr(100, 10, 20), avgGross: mr(50, 10, 20), films: mr(20) });
    applyStarScore([a, b], "t");
    expect(a.starParts!.find((p) => p.key === "totalGross")!.score).toBeNull();
    expect(b.starParts!.find((p) => p.key === "totalGross")!.score).not.toBeNull();
  });

  it("withholds the score when less than half the weight has data", () => {
    const thin = snap("a", { films: mr(3), socialReach: mr(50) });
    applyStarScore([thin], "t");
    expect(thin.metrics.starScore.value).toBeNull();
    expect(thin.metrics.starScore.status).toBe("insufficient");
  });

  it("blends small samples toward the typical hero", () => {
    const lucky = snap("a", { overallSuccessRatio: mr(100, 2, 2), films: mr(2), hits: mr(2) });
    const steady = snap("b", { overallSuccessRatio: mr(50, 40, 40), films: mr(40), hits: mr(20) });
    applyStarScore([lucky, steady], "t");
    const s = lucky.starParts!.find((p) => p.key === "successRatio")!.score!;
    expect(s).toBeLessThan(80);
    expect(s).toBeGreaterThan(50);
  });

  it("adds fans' votes only when there are any", () => {
    const a = snap("a", { overallSuccessRatio: mr(50, 10, 10), films: mr(10), hits: mr(5) });
    applyStarScore([a], "t");
    expect(a.starParts!.some((p) => p.key === "fans")).toBe(false);
    applyStarScore([a], "t", new Map([["a", 30]]));
    expect(a.starParts!.some((p) => p.key === "fans")).toBe(true);
  });
});
