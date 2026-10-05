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

  it("reads results beyond the box-office section (Kithakithalu is a hit for Allari Naresh)", () => {
    const naresh = ds.people.find((p) => p.slug === "allari-naresh")!;
    const rows = out.heroFilms.get(naresh.id)!.map((r) => out.films.get(r.filmId)!);
    const kitha = rows.find((f) => f.film.title === "Kithakithalu")!;
    expect(kitha.commercial.label).toBe("hit");
    // Supporting roles in other stars' films are not counted as his lead films.
    expect(rows.some((f) => f.film.title === "Maharshi")).toBe(false);
    expect(rows.some((f) => f.film.title === "Naa Saami Ranga")).toBe(false);
  });

  it("most counted films have a result, each with its source", () => {
    const counted = [...new Set([...out.heroFilms.values()].flat().map((r) => r.filmId))].map((id) => out.films.get(id)!);
    const judged = counted.filter((f) => f.commercial.label !== null);
    expect(judged.length / counted.length).toBeGreaterThan(0.65);
    for (const f of judged.filter((x) => x.commercial.basis === "trade_verdict")) expect(f.film.details?.verdictSource).toBeTruthy();
  });

  it("uses X follower counts, not YouTube subscribers, for X", () => {
    const mahesh = ds.social.find((s) => s.personId === "p-mahesh-babu" && s.platform === "x")!;
    expect(mahesh.followersCount).toBeGreaterThan(10_000_000);
  });

  it("gives every hero a Star Score or a stated reason", () => {
    for (const s of out.snapshots.all_time) {
      const st = s.metrics.starScore;
      if (st.value === null) expect(st.explanation).toMatch(/Not enough data/);
      else expect(st.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("every hero with films has a sensible film count", () => {
    for (const s of out.snapshots.all_time) {
      expect(s.eligibleFilmCount).toBeGreaterThan(0);
      expect(s.eligibleFilmCount).toBeLessThan(80);
    }
  });
});
