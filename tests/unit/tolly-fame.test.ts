import { describe, expect, it } from "vitest";
import { applyHeroFactors, blendedRate, fameOf, type HeroCareer, type TollyHeroResult } from "@/lib/tolly";

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

const ig = (slug: string, followers: number, date = "2026-11-01") => ({ slug, counts: [{ platform: "instagram" as const, followers, date }] });
const record = (slug: string, hits: number, judged: number, recentHits: number, recentJudged: number, leadFilms: number): HeroCareer => ({ slug, hits, judged, recentHits, recentJudged, leadFilms });

describe("fame", () => {
  it("maps followers to 0–100 on a log scale (10k = 0, 1M = 50, 100M = 100)", () => {
    expect(fameOf(10_000)).toBe(0);
    expect(fameOf(1_000_000)).toBe(50);
    expect(fameOf(100_000_000)).toBe(100);
    expect(fameOf(500)).toBe(0);
    expect(fameOf(1e10)).toBe(100);
  });
});

describe("hero factors", () => {
  it("pulls a short record toward the typical hit rate", () => {
    expect(blendedRate(2, 2, 0.5, 5)).toBe(64.3); // (2 + 2.5) / 7
    expect(blendedRate(20, 25, 0.5, 5)).toBe(75);
    expect(blendedRate(0, 0, 0.5, 5)).toBeNull();
  });

  it("with only the film score known, the index is the film score", () => {
    const heroes = [hero("a", 70, 4), hero("c", null)];
    const res = applyHeroFactors(heroes, [], [], AS_OF);
    expect(res.applied).toBe(false);
    expect(heroes[0].index).toBe(70);
    expect(heroes[0].band).toBe(4);
    expect(heroes[0].factors?.audience).toEqual({ value: 70, share: 100 });
    expect(heroes[1].index).toBeNull();
  });

  it("blends audience, success, fame, recent form and experience by their weights", () => {
    const heroes = [hero("a", 70, 4), hero("b", 60, 2)];
    const career = [record("a", 15, 20, 4, 5, 20), record("b", 5, 20, 1, 5, 40)];
    const res = applyHeroFactors(heroes, [{ slug: "a", counts: [{ platform: "instagram", followers: 9_000_000, date: "2026-11-01" }, { platform: "x", followers: 1_000_000, date: "2026-10-01" }, { platform: "youtube", followers: 5_000_000, date: "2026-11-01" }] }, ig("b", 100_000)], career, AS_OF);
    expect(res.applied).toBe(true);
    expect(res.successPrior).toBe(0.5);
    // Fame adds Instagram and X only.
    expect(heroes[0].followers).toEqual({ total: 10_000_000, asOf: "2026-10-01" });
    expect(heroes[0].factors).toEqual({
      audience: { value: 70, share: 50 },
      success: { value: 70, share: 20 }, // (15 + 2.5) / 25
      fame: { value: 75, share: 15 },
      recent: { value: 71.4, share: 10 }, // (4 + 1) / 7
      career: { value: 50, share: 5 },
    });
    expect(heroes[0].index).toBe(69.9); // 35 + 14 + 11.25 + 7.14 + 2.5
    expect(heroes[0].band).toBe(2); // 4 × 0.5
    expect(heroes[1].index).toBe(47.6); // 30 + 6 + 3.75 + 2.86 + 5
    expect(heroes[0].filmIndex).toBe(70);
  });

  it("leaves fame out for everyone until every ranked hero has a recent count", () => {
    const heroes = [hero("a", 70), hero("b", 60)];
    const res = applyHeroFactors(heroes, [ig("a", 10_000_000), { slug: "b", counts: [{ platform: "x", followers: 5_000_000, date: "2023-02-01" }] }], [record("a", 10, 10, 5, 5, 40)], AS_OF);
    expect(res).toMatchObject({ applied: false, missing: ["b"] });
    expect(heroes[0].fame).toBe(75);
    expect(heroes[0].factors?.fame).toEqual({ value: null, share: 0 });
    expect(heroes[1].fame).toBeNull();
    expect(heroes[1].index).toBe(60);
  });

  it("scores a hero with no official account without fame, sharing its weight among the rest", () => {
    const heroes = [hero("a", 70), hero("gone", 60, 2)];
    const res = applyHeroFactors(heroes, [ig("a", 1_000_000), { slug: "gone", counts: [], noAccount: true }], [record("gone", 10, 20, 2, 4, 20)], AS_OF);
    expect(res.applied).toBe(true);
    expect(heroes[1].fame).toBeNull();
    // (0.5 × 60 + 0.2 × 50 + 0.1 × 50 + 0.05 × 50) / 0.85
    expect(heroes[1].index).toBe(55.9);
    expect(heroes[1].band).toBe(1.2);
    // Audience + fame only: (0.5 × 70 + 0.15 × 50) / 0.65
    expect(heroes[0].index).toBe(65.4);
  });
});
