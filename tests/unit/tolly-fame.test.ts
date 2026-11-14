import { describe, expect, it } from "vitest";
import { applyHeroFactors, blendedRate, fameOf, HERO_FACTORS, HERO_WEIGHTS, percentileRanks, type HeroCareer, type TollyHeroResult } from "@/lib/tolly";

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
/** A career with only the lead-film count known; everything else is "no data". */
const bare = (slug: string, leadFilms: number, extra: Partial<HeroCareer> = {}): HeroCareer => ({
  slug, judged: 0, hits: 0, recentJudged: 0, recentHits: 0, leadFilms, blockbusters: null, bigFilms: null, totalGross: null, topGross: null, avgGross: null, grossFilms: 0, yearsActive: null, peakFilms: null, releaseGap: null, ...extra,
});

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
  it("uses fifteen numbers whose weights add up to 100", () => {
    expect(HERO_FACTORS).toHaveLength(15);
    expect(Object.values(HERO_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
    expect(HERO_WEIGHTS.audience).toBe(37);
  });

  it("pulls a short record toward the typical hit rate", () => {
    expect(blendedRate(2, 2, 0.5, 5)).toBe(64.3); // (2 + 2.5) / 7
    expect(blendedRate(20, 25, 0.5, 5)).toBe(75);
    expect(blendedRate(0, 0, 0.5, 5)).toBeNull();
  });

  it("ranks percentiles with ties sharing the average rank, and can rank low values first", () => {
    const v = new Map([["a", 1], ["b", 1], ["c", 3]]);
    expect([...percentileRanks(v).values()]).toEqual([25, 25, 100]);
    const w = new Map([["a", 1], ["b", 2], ["c", 3]]);
    expect([...percentileRanks(w, true).values()]).toEqual([100, 50, 0]);
    expect([...percentileRanks(new Map([["a", 7]])).values()]).toEqual([50]);
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

  it("blends audience, fame and percentile factors by weight, leaving out what has no data", () => {
    const heroes = [hero("a", 70, 4), hero("b", 60, 2)];
    const res = applyHeroFactors(heroes, [{ slug: "a", counts: [{ platform: "instagram", followers: 9_000_000, date: "2026-11-01" }, { platform: "x", followers: 1_000_000, date: "2026-10-01" }, { platform: "youtube", followers: 5_000_000, date: "2026-11-01" }] }, ig("b", 100_000)], [bare("a", 20), bare("b", 40)], AS_OF);
    expect(res.applied).toBe(true);
    // Fame adds Instagram and X only.
    expect(heroes[0].followers).toEqual({ total: 10_000_000, asOf: "2026-10-01" });
    expect(heroes[0].factors?.films).toEqual({ value: 0, share: 6 });
    expect(heroes[1].factors?.films).toEqual({ value: 100, share: 6 });
    expect(heroes[0].factors?.hits.value).toBeNull();
    // Audience 37 + fame 10 + films 3 = 50 of the weight. (37 × 70 + 10 × 75 + 3 × 0) ÷ 50
    expect(heroes[0].index).toBe(66.8);
    expect(heroes[0].band).toBe(3); // 4 × 37 ÷ 50
    expect(heroes[1].index).toBe(55.4); // (37 × 60 + 10 × 25 + 3 × 100) ÷ 50
    expect(heroes[0].filmIndex).toBe(70);
  });

  it("uses box-office counts and money only for heroes with enough reported grosses", () => {
    const heroes = [hero("a", 60), hero("b", 60), hero("c", 60)];
    const money = { blockbusters: 2, bigFilms: 3, totalGross: 900, topGross: 400, avgGross: 300 };
    const career = [
      bare("a", 10, { judged: 10, hits: 6, ...money, grossFilms: 3 }),
      bare("b", 10, { judged: 10, hits: 4, ...money, totalGross: 100, topGross: 80, avgGross: 50, grossFilms: 4 }),
      bare("c", 10, { judged: 10, hits: 2, ...money, totalGross: 5000, topGross: 4000, avgGross: 2500, grossFilms: 2 }), // too few grosses
    ];
    applyHeroFactors(heroes, [ig("a", 1e6), ig("b", 1e6), ig("c", 1e6)], career, AS_OF);
    expect(heroes[0].factors?.hits.value).toBe(100);
    expect(heroes[2].factors?.hits.value).toBe(0);
    expect(heroes[0].factors?.totalGross.value).toBe(100);
    expect(heroes[1].factors?.totalGross.value).toBe(0);
    expect(heroes[2].factors?.totalGross.value).toBeNull(); // his ₹5,000 cr is ignored: only 2 reported grosses
    expect(heroes[2].factors?.totalGross.share).toBe(0);
  });

  it("ranks consistency and release pace so that smaller is better", () => {
    const heroes = [hero("a", 60), hero("b", 60)];
    heroes[0].spread = 2;
    heroes[1].spread = 9;
    applyHeroFactors(heroes, [], [bare("a", 10, { releaseGap: 3 }), bare("b", 10, { releaseGap: 9 })], AS_OF);
    expect(heroes[0].factors?.consistency.value).toBe(100);
    expect(heroes[1].factors?.consistency.value).toBe(0);
    expect(heroes[0].factors?.gap.value).toBe(100);
    expect(heroes[1].factors?.gap.value).toBe(0);
  });

  it("leaves fame out for everyone until every ranked hero has a recent count", () => {
    const heroes = [hero("a", 70), hero("b", 60)];
    const res = applyHeroFactors(heroes, [ig("a", 10_000_000), { slug: "b", counts: [{ platform: "x", followers: 5_000_000, date: "2023-02-01" }] }], [bare("a", 10), bare("b", 10)], AS_OF);
    expect(res).toMatchObject({ applied: false, missing: ["b"] });
    expect(heroes[0].fame).toBe(75);
    expect(heroes[0].factors?.fame).toEqual({ value: null, share: 0 });
    expect(heroes[1].fame).toBeNull();
  });

  it("scores a hero with no official account without fame, sharing its weight among the rest", () => {
    const heroes = [hero("a", 70), hero("gone", 60, 2)];
    const res = applyHeroFactors(heroes, [ig("a", 1_000_000), { slug: "gone", counts: [], noAccount: true }], [bare("a", 10), bare("gone", 10)], AS_OF);
    expect(res.applied).toBe(true);
    expect(heroes[1].fame).toBeNull();
    expect(heroes[1].factors?.fame).toEqual({ value: null, share: 0 });
    // Audience 37 + films 3 = 40 of the weight; ties give films a percentile of 50.
    expect(heroes[1].index).toBe(59.3); // (37 × 60 + 3 × 50) ÷ 40 = 59.25, rounded half up
    expect(heroes[1].band).toBe(1.9); // 2 × 37 ÷ 40
  });
});
