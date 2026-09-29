import { describe, expect, it } from "vitest";
import { runEngine } from "@/lib/calculations";
import { METHODOLOGY } from "@/lib/constants/methodology";
import { EDITORIALLY_EXCLUDED_NAMES, INITIAL_ROSTER } from "@/lib/constants/roster";
import { buildRealDataset } from "@/lib/data/real/load";

describe("real dataset (Wikipedia + Wikidata snapshot)", () => {
  const ds = buildRealDataset();
  const out = runEngine(ds, METHODOLOGY);

  it("contains only Telugu heroes and no editorially excluded names", () => {
    expect(ds.people.length).toBeGreaterThan(50);
    expect(ds.people.every((p) => p.industry === "telugu")).toBe(true);
    for (const n of EDITORIALLY_EXCLUDED_NAMES) expect(ds.people.map((p) => p.displayName)).not.toContain(n);
    expect(INITIAL_ROSTER.every((r) => r.industry === "telugu")).toBe(true);
  });

  it("counts only films released from 2000 onwards", () => {
    for (const rows of out.heroFilms.values())
      for (const r of rows) expect(out.films.get(r.filmId)!.film.teluguRelease.releaseDate! >= "2000-01-01").toBe(true);
  });

  it("never marks synthetic values in real mode", () => {
    expect(ds.films.every((f) => !f.isDemo)).toBe(true);
    expect(ds.reception).toHaveLength(0);
    expect(ds.commercial.every((c) => c.syntheticScore === null)).toBe(true);
  });

  it("well-known films resolve to sensible verdicts and grosses", () => {
    const byTitle = (t: string) => [...out.films.values()].find((f) => f.film.title === t)!;
    expect(byTitle("Baahubali 2: The Conclusion").commercial.label).toBe("blockbuster");
    expect(byTitle("Baahubali 2: The Conclusion").commercial.grossCrore).toBeGreaterThan(1500);
    expect(byTitle("Adipurush").commercial.label).toBe("flop");
  });

  it("every hero with films has a sensible film count", () => {
    for (const s of out.snapshots.all_time) {
      expect(s.eligibleFilmCount).toBeGreaterThan(0);
      expect(s.eligibleFilmCount).toBeLessThan(80);
    }
  });
});
