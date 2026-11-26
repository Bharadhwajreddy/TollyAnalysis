import { describe, expect, it } from "vitest";
import { compareDirectors, directorSlug, getDirectors, MIN_JUDGED, slugify, type Director } from "@/lib/directors";

const d = (name: string, hitRate: number | null, judged: number, hits: number, totalGross: number) => ({ name, hitRate, judged, hits, totalGross }) as Director;

describe("director ranking", () => {
  it("orders by hit rate, then films with a result, then hits, then box office", () => {
    const list = [d("A", 0.8, 5, 4, 900), d("B", 1, 4, 4, 100), d("C", 1, 9, 9, 50), d("D", 1, 4, 4, 300), d("E", 0.8, 10, 8, 10)];
    expect(list.sort(compareDirectors).map((x) => x.name)).toEqual(["C", "D", "B", "E", "A"]);
  });

  it("merges spellings of one name and makes stable slugs", () => {
    expect(directorSlug("Sreenu Vaitla")).toBe(directorSlug("Srinu Vaitla"));
    expect(slugify("S. S. Rajamouli")).toBe("s-s-rajamouli");
    expect(slugify("Sujith & Sandeep")).toBe("sujith-and-sandeep");
  });
});

describe("directors from the real data", async () => {
  const all = await getDirectors();
  const ranked = all.filter((x) => x.ranked);

  it("ranks only directors with enough films with a known result, in ranking order", () => {
    expect(ranked.length).toBeGreaterThan(30);
    expect(ranked.every((x) => x.judged >= MIN_JUDGED)).toBe(true);
    expect(ranked.map((x) => x.rank)).toEqual(ranked.map((_, i) => i + 1));
    for (let i = 1; i < ranked.length; i++) expect(compareDirectors(ranked[i - 1], ranked[i])).toBeLessThanOrEqual(0);
  });

  it("counts only Telugu films from 2000 on, each film once", () => {
    for (const x of all) {
      expect(x.films.every((f) => f.year >= 2000)).toBe(true);
      const keys = x.films.map((f) => `${f.title.toLowerCase()}|${f.year}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    const rajamouli = all.find((x) => x.slug === "s-s-rajamouli")!;
    expect(rajamouli.films.filter((f) => f.title === "RRR")).toHaveLength(1);
    expect(rajamouli.films.find((f) => f.title === "RRR")!.heroes.map((h) => h.slug).sort()).toEqual(["jr-ntr", "ram-charan"]);
  });
});
