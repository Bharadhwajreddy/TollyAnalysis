import { describe, expect, it } from "vitest";
import { filmStatus, monthsBetween, percentileRanks, scoreFilms, scoreHeroes, v0Weights, type TollyFilmInput } from "@/lib/tolly";

const AS_OF = "2026-10-13";
const film = (key: string, year: number, rating: number, votes: number, views: number | null = 1000, extra: Partial<TollyFilmInput> = {}): TollyFilmInput => ({
  key,
  title: key,
  year,
  releaseDate: `${year}-06-01`,
  dateApproximate: false,
  telugu: true,
  imdbRating: rating,
  imdbVotes: votes,
  wikiViews: views,
  ...extra,
});

describe("Tolly Index v0", () => {
  it("shares Voice's weight pro rata among the three v0 pillars", () => {
    const w = v0Weights();
    expect(w.voice).toBe(0);
    expect(w.rating + w.reach + w.stay).toBeCloseTo(1);
    expect(w.rating).toBeCloseTo(0.5);
  });

  it("ranks within a group with shared ties", () => {
    const p = percentileRanks(new Map([["a", 1], ["b", 2], ["c", 2], ["d", 3]]));
    expect(p.get("a")).toBe(0);
    expect(p.get("b")).toBe(p.get("c"));
    expect(p.get("d")).toBe(100);
    expect(percentileRanks(new Map([["x", 5]])).get("x")).toBe(50);
  });

  it("counts whole months", () => {
    expect(monthsBetween("2024-10-13", "2026-10-13")).toBe(24);
    expect(monthsBetween("2024-10-14", "2026-10-13")).toBe(23);
  });

  it("gates films: missing data → incomplete, under 24 months → provisional", () => {
    expect(filmStatus(film("a", 2010, 7, 50), AS_OF).status).toBe("incomplete");
    expect(filmStatus(film("a", 2010, 7, 500, null), AS_OF).missing).toContain("Wikipedia page views");
    expect(filmStatus(film("a", 2010, 7, 500, 10, { dateApproximate: true }), AS_OF).status).toBe("incomplete");
    expect(filmStatus(film("a", 2025, 7, 500), AS_OF).status).toBe("provisional");
    expect(filmStatus(film("a", 2010, 7, 500), AS_OF).status).toBe("complete");
  });

  it("compares counts only within the release year, so an old film with fewer votes can win", () => {
    const rs = scoreFilms([film("old-top", 2004, 7.5, 3000, 5000), film("old-low", 2004, 7.5, 300, 500), film("new-top", 2022, 7.5, 40000, 5000), film("new-low", 2022, 7.5, 50000, 9000)], AS_OF);
    const by = Object.fromEntries(rs.map((r) => [r.key, r]));
    expect(by["old-top"].pillars.reach).toBe(100);
    expect(by["new-top"].pillars.reach).toBe(0);
    expect(by["old-top"].index!).toBeGreaterThan(by["new-top"].index!);
  });

  it("shrinks a thinly voted rating toward the year average", () => {
    const rs = scoreFilms([film("few", 2010, 9.5, 120), film("many", 2010, 6, 5000)], AS_OF);
    const few = rs.find((r) => r.key === "few")!;
    expect(few.ratingAdjusted!).toBeLessThan(9.5);
    expect(few.ratingAdjusted!).toBeGreaterThan(6);
  });

  it("qualifies a hero only with 5+ complete films and 60%+ of them complete, pulled toward the mean", () => {
    const films = [...Array.from({ length: 6 }, (_, i) => film(`h${i}`, 2010 + i, 8, 5000, 9000)), ...Array.from({ length: 6 }, (_, i) => film(`o${i}`, 2010 + i, 5, 5000, 100))];
    const rs = scoreFilms([...films, film("thin", 2012, 7, 10)], AS_OF);
    const [strong, weak, thin] = scoreHeroes(
      [
        { slug: "s", name: "S", films: films.slice(0, 6).map((f) => f.key) },
        { slug: "w", name: "W", films: films.slice(6).map((f) => f.key) },
        { slug: "t", name: "T", films: ["h0", "thin", "thin2"] },
      ],
      rs,
    );
    expect(strong.qualified && weak.qualified).toBe(true);
    expect(strong.index!).toBeGreaterThan(weak.index!);
    const strongMean = rs.filter((r) => r.key.startsWith("h")).reduce((a, r) => a + r.index!, 0) / 6;
    expect(strong.index!).toBeLessThan(strongMean);
    expect(strong.best).toHaveLength(3);
    expect(thin.qualified).toBe(false);
    expect(thin.index).toBeNull();
  });
});
