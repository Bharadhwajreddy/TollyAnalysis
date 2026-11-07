import { describe, expect, it } from "vitest";
import { applyFame, fameOf, FAME_WEIGHT, type TollyHeroResult } from "@/lib/tolly";

const hero = (slug: string, index: number | null, band: number | null = 2): TollyHeroResult => ({
  slug,
  name: slug,
  films: 10,
  excluded: 0,
  provisional: 0,
  complete: index === null ? 0 : 10,
  judged: 10,
  qualified: index !== null,
  reason: index === null ? "no complete films (needs 5)" : null,
  index,
  band: index === null ? null : band,
  best: [],
  spread: null,
  pillars: null,
  missing: [],
});
const AS_OF = "2026-11-07";

describe("fame", () => {
  it("maps followers to 0–100 on a log scale (10k = 0, 1M = 50, 100M = 100)", () => {
    expect(fameOf(10_000)).toBe(0);
    expect(fameOf(1_000_000)).toBe(50);
    expect(fameOf(100_000_000)).toBe(100);
    expect(fameOf(500)).toBe(0);
    expect(fameOf(1e10)).toBe(100);
  });

  it("changes the ranked index only when every ranked hero has a recent count", () => {
    const heroes = [hero("a", 70), hero("b", 60), hero("c", null)];
    const res = applyFame(heroes, [{ slug: "a", counts: [{ platform: "instagram", followers: 10_000_000, date: "2026-11-01" }] }], AS_OF);
    expect(res).toEqual({ applied: false, missing: ["b"] });
    expect(heroes[0].index).toBe(70);
    expect(heroes[0].fame).toBe(75);
    expect(heroes[1].fame).toBeNull();
  });

  it("blends fame in with its weight, adds platforms, and shrinks the band", () => {
    const heroes = [hero("a", 70, 4), hero("b", 60, 2), hero("c", null)];
    const res = applyFame(
      heroes,
      [
        { slug: "a", counts: [{ platform: "instagram", followers: 9_000_000, date: "2026-11-01" }, { platform: "x", followers: 1_000_000, date: "2026-10-01" }] },
        { slug: "b", counts: [{ platform: "instagram", followers: 100_000, date: "2026-11-01" }] },
      ],
      AS_OF,
    );
    expect(res.applied).toBe(true);
    expect(heroes[0].followers).toEqual({ total: 10_000_000, asOf: "2026-10-01" });
    expect(heroes[0].filmIndex).toBe(70);
    expect(heroes[0].index).toBe(Math.round(((1 - FAME_WEIGHT) * 70 + FAME_WEIGHT * 75) * 10) / 10);
    expect(heroes[1].index).toBe(54.8); // 0.85 × 60 + 0.15 × 25
    expect(heroes[0].band).toBe(3.4);
    expect(heroes[2].index).toBeNull();
  });

  it("ignores counts older than a year", () => {
    const heroes = [hero("a", 70)];
    const res = applyFame(heroes, [{ slug: "a", counts: [{ platform: "x", followers: 5_000_000, date: "2023-02-01" }] }], AS_OF);
    expect(res.applied).toBe(false);
    expect(heroes[0].fame).toBeNull();
    expect(heroes[0].index).toBe(70);
  });

  it("scores a hero with no official account on films alone without blocking the others", () => {
    const heroes = [hero("a", 70), hero("gone", 60)];
    const res = applyFame(heroes, [{ slug: "a", counts: [{ platform: "instagram", followers: 1_000_000, date: "2026-11-01" }] }, { slug: "gone", counts: [], noAccount: true }], AS_OF);
    expect(res.applied).toBe(true);
    expect(heroes[0].index).toBe(67); // 0.85 × 70 + 0.15 × 50
    expect(heroes[1].index).toBe(60);
    expect(heroes[1].fame).toBeNull();
  });
});
