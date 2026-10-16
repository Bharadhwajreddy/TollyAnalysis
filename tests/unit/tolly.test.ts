import { describe, expect, it } from "vitest";
import { confidenceOf, filmStatus, round, MIN_VOTES, monthsBetween, percentileOf, scoreFilms, scoreHeroes, WEIGHTS, type TollyFilmInput } from "@/lib/tolly";
import { correlation, criticScores, receptionSection } from "@/lib/tolly/critics";

const AS_OF = "2026-10-13";
const film = (key: string, year: number, rating: number, votes: number, views: number | null = 1000, extra: Partial<TollyFilmInput> = {}): TollyFilmInput => ({
  key,
  title: key,
  year,
  releaseDate: `${year}-06-01`,
  telugu: true,
  linked: true,
  yearConfirmed: true,
  imdbRating: rating,
  imdbVotes: votes,
  editions: 3,
  wikiViews: views,
  ...extra,
});

describe("Tolly Index v1", () => {
  it("weights add up to 1 with Voice reserved at 0", () => {
    expect(WEIGHTS.rating + WEIGHTS.reach + WEIGHTS.stay + WEIGHTS.voice).toBeCloseTo(1);
    expect(WEIGHTS.voice).toBe(0);
  });

  it("rounds decimal ties like Excel's ROUND", () => {
    expect(round(0.5 * 45.8 + 0.3 * 70.1 + 0.2 * 67.6, 1)).toBe(57.5);
    expect(round(0.5 * 48.4 + 0.3 * 51.3 + 0.2 * 56.8, 1)).toBe(51);
    expect(round(57.45, 1)).toBe(57.5);
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(-2.25, 1)).toBe(-2.3);
  });

  it("ranks with mid-ranks for ties", () => {
    expect(percentileOf(2, [1, 2, 3])).toBe(50);
    expect(percentileOf(5, [1, 2, 3])).toBe(100);
    expect(percentileOf(0, [1, 2, 3])).toBe(0);
    expect(percentileOf(7, [])).toBe(50);
  });

  it("counts whole months and full confidence at 1,000 votes", () => {
    expect(monthsBetween("2024-10-13", "2026-10-13")).toBe(24);
    expect(monthsBetween("2024-10-14", "2026-10-13")).toBe(23);
    expect(confidenceOf(999)).toBeCloseTo(1);
    expect(confidenceOf(9)).toBeCloseTo(1 / 3);
  });

  it("gates every input the formula uses", () => {
    expect(filmStatus(film("a", 2010, 7, MIN_VOTES - 1), AS_OF).missing).toContain(`IMDb rating with ${MIN_VOTES}+ votes`);
    expect(filmStatus(film("a", 2010, 7, 500, null), AS_OF).missing).toContain("Wikipedia page views");
    expect(filmStatus(film("a", 2010, 7, 500, 10, { linked: false }), AS_OF).missing).toContain("IMDb title");
    expect(filmStatus(film("a", 2010, 7, 500, 10, { yearConfirmed: false }), AS_OF).missing).toContain("release year from a second source");
    expect(filmStatus(film("a", 2010, 7, 500, 10, { telugu: null }), AS_OF).missing).toContain("original language");
    expect(filmStatus(film("a", 2010, 7, 500, 10, { telugu: false }), AS_OF).status).toBe("excluded");
    expect(filmStatus(film("a", 2010, 7, 500, 0), AS_OF).status).toBe("complete");
  });

  it("needs an exact date only when the year alone cannot settle the 24-month rule", () => {
    expect(filmStatus(film("a", 2010, 7, 500, 10, { releaseDate: null }), AS_OF).status).toBe("complete");
    expect(filmStatus(film("a", 2025, 7, 500, 10, { releaseDate: null }), AS_OF).status).toBe("provisional");
    expect(filmStatus(film("a", 2026, 7, 0, 10, { releaseDate: null }), AS_OF)).toEqual({ status: "provisional", missing: ["24 months since release", "IMDb rating with 10+ votes"] });
    expect(filmStatus(film("a", 2024, 7, 500, 10, { releaseDate: null }), AS_OF).missing).toContain("exact release date");
    expect(filmStatus(film("a", 2024, 7, 500, 10, { releaseDate: "2024-01-26" }), AS_OF).status).toBe("complete");
  });

  it("compares counts only within a film's era, so an old film with fewer votes can win", () => {
    const rs = scoreFilms([film("old-top", 2004, 7.5, 3000, 5000), film("old-low", 2004, 7.5, 300, 500), film("new-top", 2022, 7.5, 40000, 5000), film("new-low", 2022, 7.5, 50000, 9000)], AS_OF);
    const by = Object.fromEntries(rs.map((r) => [r.key, r]));
    expect(by["old-top"].pillars.reach).toBeGreaterThan(by["new-top"].pillars.reach!);
    expect(by["old-top"].index!).toBeGreaterThan(by["new-top"].index!);
    expect(by["old-top"].cohort!.films).toBe(2);
  });

  it("shares a cohort with films one year either side", () => {
    const rs = scoreFilms([film("a", 2010, 7, 500), film("b", 2011, 6, 500), film("c", 2013, 6, 500)], AS_OF);
    expect(rs.map((r) => r.cohort!.films)).toEqual([2, 2, 1]);
  });

  it("shrinks a thinly voted rating toward the cohort average", () => {
    const rs = scoreFilms([film("few", 2010, 9.5, 30), film("many", 2010, 6, 5000)], AS_OF);
    const few = rs.find((r) => r.key === "few")!;
    expect(few.ratingAdjusted!).toBeLessThan(9.5);
    expect(few.ratingAdjusted!).toBeGreaterThan(6);
  });

  it("ranks a hero only with enough complete films, pulled toward the mean, with a band", () => {
    const films = [...Array.from({ length: 6 }, (_, i) => film(`h${i}`, 2010 + i, 8, 5000, 9000)), ...Array.from({ length: 6 }, (_, i) => film(`o${i}`, 2010 + i, 5, 5000, 100))];
    const rs = scoreFilms([...films, film("thin", 2012, 7, 2), film("dub", 2012, 7, 500, 10, { telugu: false })], AS_OF);
    const [strong, weak, gappy] = scoreHeroes(
      [
        { slug: "s", name: "S", films: [...films.slice(0, 6).map((f) => f.key), "dub"] },
        { slug: "w", name: "W", films: films.slice(6).map((f) => f.key) },
        { slug: "g", name: "G", films: [...films.slice(0, 5).map((f) => f.key), "h0", "thin"] },
      ],
      rs,
    );
    expect(strong.qualified && weak.qualified).toBe(true);
    expect(strong.excluded).toBe(1);
    expect(strong.judged).toBe(6);
    expect(strong.index!).toBeGreaterThan(weak.index!);
    const strongMean = rs.filter((r) => r.key.startsWith("h")).reduce((a, r) => a + r.index!, 0) / 6;
    expect(strong.index!).toBeLessThan(strongMean);
    expect(strong.band).not.toBeNull();
    expect(strong.best).toHaveLength(3);
    expect(gappy.films).toBe(6);
    expect(gappy.qualified).toBe(false);
    expect(gappy.missing.map((m) => m.title)).toEqual(["thin"]);
  });
});

describe("critics' scores", () => {
  const article = `== Plot ==\nRated 9/10 by nobody.\n== Reception ==\n=== Critical reception ===\nThe Hindu rated it 3.5 out of 5.<ref>x 4/5</ref> Sify gave 3/5.\n=== Box office ===\nIt grossed 50/5 crore.\n== Music ==\n`;

  it("reads only the critics' section and normalises to 10", () => {
    expect(receptionSection(article)).toContain("The Hindu");
    expect(criticScores(article)).toEqual([7, 6]);
  });

  it("measures agreement", () => {
    expect(correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });
});
