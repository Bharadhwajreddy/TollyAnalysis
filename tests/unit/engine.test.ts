import { describe, expect, it } from "vitest";
import { runEngine } from "@/lib/calculations";
import { METHODOLOGY as M } from "@/lib/constants/methodology";
import { EDITORIALLY_EXCLUDED_NAMES, INITIAL_ROSTER } from "@/lib/constants/roster";
import { generateDemoDataset } from "@/lib/data/demo/generate";
import { claim, dataset, film, lead, person, rating } from "./fixtures";

describe("engine eligibility rules", () => {
  const people = [person("a"), person("b"), person("c")];
  const films = [
    film("co", "2015-03-01"),
    film("solo", "2016-03-01"),
    film("third", "2017-03-01"),
    film("cameo", "2018-03-01"),
    film("series", "2019-03-01", { featureType: "excluded_series" }),
    film("rerelease", "2020-03-01", {}, { isReRelease: true }),
    film("old", "1998-03-01"),
    film("dub", "2021-03-01", { originalLanguage: "ml" }, { releaseType: "dubbed" }),
    film("ott", "2022-03-01", { releaseRoute: "ott" }, { route: "ott" }),
    film("recent", "2026-08-20"),
  ];
  const credits = [
    lead("co", "a"),
    lead("co", "b", { roleScope: "co_principal_male_lead" }),
    lead("solo", "a"),
    lead("third", "a"),
    lead("cameo", "b", { roleScope: "cameo" }),
    lead("series", "b"),
    lead("rerelease", "b"),
    lead("old", "b"),
    lead("dub", "c"),
    lead("ott", "a"),
    lead("recent", "a"),
    lead("solo", "c", { eligibilityStatus: "pending" }),
  ];
  const out = runEngine(
    dataset({
      people,
      films,
      credits,
      reception: films.map((f) => rating(f.id, 7, 5000)),
      commercial: [
        claim("dub", { metricType: "worldwide_all_language", versionScope: "all_language", amountLowMinor: "1000" }),
        ...["co", "solo", "third", "recent"].map((id) => claim(id, { valueText: "hit" })),
      ],
    }),
    M,
  );
  const snap = (id: string) => out.snapshots.all_time.find((s) => s.personId === id)!;

  it("counts a genuine co-lead film once for every verified lead", () => {
    expect(out.heroFilms.get("a")!.map((r) => r.filmId)).toContain("co");
    expect(out.heroFilms.get("b")!.map((r) => r.filmId)).toEqual(["co"]);
    expect(snap("a").coLeadFilmCount).toBe(1);
  });

  it("excludes cameos, series, re-releases, pre-2000 titles and unapproved credits", () => {
    const bFilms = out.heroFilms.get("b")!.map((r) => r.filmId);
    for (const x of ["cameo", "series", "rerelease", "old"]) expect(bFilms).not.toContain(x);
    expect(out.heroFilms.get("c")!.map((r) => r.filmId)).toEqual(["dub"]);
  });

  it("includes OTT features in the same filmography", () => {
    expect(out.heroFilms.get("a")!.map((r) => r.filmId)).toContain("ott");
    expect(snap("a").ottFilmCount).toBe(1);
  });

  it("handles one-film emerging heroes and dubbed titles", () => {
    const c = snap("c");
    expect(c.isEmerging).toBe(true);
    expect(c.careerFilmCount).toBe(1);
    expect(c.dubbedFilmCount).toBe(1);
    expect(out.films.get("dub")!.commercial.ignoredAllLanguageOnly).toBe(true);
    expect(c.metrics.consistency.value).toBeNull();
  });

  it("keeps recent unreconciled releases out of success ratios", () => {
    expect(out.films.get("recent")!.success.status).toBe("not_yet_final");
    const a = snap("a");
    expect(a.eligibleFilmCount).toBe(5);
    // co, solo, third have verdicts; recent has one too but is not final yet; ott has none.
    expect(a.metrics.overallSuccessRatio.coverage.numerator).toBe(3);
    expect(a.metrics.hits.value).toBe(3);
  });

  it("windows: last 10 films and last 5 years", () => {
    const a5 = out.snapshots.last_5_years.find((s) => s.personId === "a")!;
    expect(a5.eligibleFilmCount).toBe(2); // ott (2022) + recent (2026)
  });
});

describe("demo dataset", () => {
  const ds = generateDemoDataset();
  const out = runEngine(ds, M);

  it("excludes Panja Vaisshnav Tej from the roster and seed data", () => {
    for (const name of EDITORIALLY_EXCLUDED_NAMES) {
      expect(INITIAL_ROSTER.map((r) => r.name)).not.toContain(name);
      expect(ds.people.map((p) => p.displayName)).not.toContain(name);
    }
  });

  it("marks every demo film as fictional demo data", () => {
    expect(ds.films.every((f) => f.isDemo && f.title.startsWith("Demo"))).toBe(true);
    expect(ds.reception.every((r) => r.provider === "synthetic_demo")).toBe(true);
    expect(ds.social).toHaveLength(0);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(generateDemoDataset().films.slice(0, 20))).toBe(JSON.stringify(ds.films.slice(0, 20)));
  });

  it("has an emerging hero and a 3+ default roster", () => {
    const all = out.snapshots.all_time;
    expect(all.filter((s) => s.isEmerging).map((s) => s.slug)).toContain("mouli-tanuj-prasanth");
    expect(all.filter((s) => !s.isEmerging).length).toBeGreaterThanOrEqual(60);
    for (const name of ["Prabhas", "Nithiin", "Satyadev", "Sree Vishnu", "Sharwanand"]) expect(all.map((s) => s.name)).toContain(name);
    expect(all.every((s) => s.industry === "telugu")).toBe(true);
  });

  it("plain metrics agree with each other", () => {
    for (const s of out.snapshots.all_time) {
      expect(s.metrics.films.value).toBe(s.eligibleFilmCount);
      const hits = s.metrics.hits.value;
      const ratio = s.metrics.overallSuccessRatio.value;
      if (hits !== null && ratio !== null) expect(Math.round((hits / s.metrics.hits.coverage.numerator) * 1000) / 10).toBeCloseTo(ratio, 1);
      if (s.metrics.avgRating.value !== null) expect(s.metrics.avgRating.value).toBeLessThanOrEqual(10);
    }
  });

  it("every photo credit belongs to a roster hero and points at Wikimedia Commons", async () => {
    const { HERO_PHOTOS } = await import("@/lib/constants/photos");
    const slugs = new Set(INITIAL_ROSTER.map((r) => r.slug));
    for (const [slug, c] of Object.entries(HERO_PHOTOS)) {
      expect(slugs.has(slug)).toBe(true);
      expect(c.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(c.file).toBe(`/heroes/${slug}.jpg`);
    }
  });

  it("returns methodology version and coverage with each metric", () => {
    const s = out.snapshots.all_time[0];
    expect(s.metrics.hpi.methodVersion).toBe(M.id);
    expect(s.metrics.hpi.coverage.denominator).toBeGreaterThan(0);
  });
});
