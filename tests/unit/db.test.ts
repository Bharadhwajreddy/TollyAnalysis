import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { loadActiveMethodology, loadDataset, loadLatestSnapshots, purgeDemoFilms, recalculate, seed } from "@/db/repository";
import * as schema from "@/db/schema";
import { runEngine } from "@/lib/calculations";
import { METHODOLOGY } from "@/lib/constants/methodology";
import { DEMO_AS_OF, generateDemoDataset } from "@/lib/data/demo/generate";

let db: Db;

beforeAll(async () => {
  const pg = new PGlite();
  const dir = join(process.cwd(), "db/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await pg.exec(stmt);
    }
  }
  db = drizzle(pg, { schema }) as unknown as Db;
}, 60_000);

describe("database round trip (PGlite)", () => {
  it("applies migrations and seeds the roster, methodology and demo films", async () => {
    const res = await seed(db, { demo: true });
    expect(res.people).toBe(40);
    expect(res.films).toBeGreaterThan(500);
    const active = await loadActiveMethodology(db);
    expect(active?.methodology.id).toBe(METHODOLOGY.id);
    expect(active?.methodology.heroScoreWeights).toEqual(METHODOLOGY.heroScoreWeights);
  }, 60_000);

  it("seeding twice is idempotent", async () => {
    const res = await seed(db, { demo: true });
    expect(res.films).toBe(0);
    const people = await db.select().from(schema.people);
    expect(people).toHaveLength(40);
    expect(people.map((p) => p.displayName)).not.toContain("Panja Vaisshnav Tej");
  }, 60_000);

  it("loads a dataset that produces the same film-level results as the in-memory demo", async () => {
    const fromDb = runEngine(await loadDataset(db, DEMO_AS_OF), METHODOLOGY);
    const inMem = runEngine(generateDemoDataset(), METHODOLOGY);
    const pick = (o: typeof fromDb, slug: string) => o.snapshots.all_time.find((s) => s.slug === slug)!;
    for (const slug of ["nani", "suriya", "chiranjeevi", "mouli-tanuj-prasanth"]) {
      const a = pick(fromDb, slug);
      const b = pick(inMem, slug);
      expect(a.eligibleFilmCount).toBe(b.eligibleFilmCount);
      expect(a.metrics.filmSuccess.value).toBe(b.metrics.filmSuccess.value);
      expect(a.metrics.audienceIndex.value).toBe(b.metrics.audienceIndex.value);
      expect(a.metrics.peakFilms.value).toBe(b.metrics.peakFilms.value);
      // Live mode has no synthetic social index, so social reach is unavailable (never zero).
      expect(a.metrics.socialReach.value).toBeNull();
    }
  }, 60_000);

  it("recalculates, persists snapshots and reads the latest set back", async () => {
    const r = await recalculate(db, "test");
    expect(r.heroes).toBe(40);
    const active = await loadActiveMethodology(db);
    const latest = await loadLatestSnapshots(db, active!.rowId);
    expect(latest.snapshots.all_time).toHaveLength(40);
    expect(latest.snapshots.last_10_films).toHaveLength(40);
    expect(latest.snapshots.all_time[0].metrics.hpi.methodVersion).toBe(METHODOLOGY.id);
    const log = await db.select().from(schema.changeLog);
    expect(log.some((l) => l.action === "recalculated")).toBe(true);
  }, 60_000);

  it("stores money as bigint minor units", async () => {
    const [film] = await db.select().from(schema.films).limit(1);
    const [src] = await db.select().from(schema.sources).limit(1);
    await db.insert(schema.filmCommercialEvidence).values({
      filmId: film.id,
      sourceId: src.id,
      metricType: "telugu_distributor_share",
      releaseVersionScope: "telugu_original",
      territory: "AP/TS",
      currency: "INR",
      amountLowMinor: BigInt("123456789012345"),
    });
    const [row] = await db.select().from(schema.filmCommercialEvidence).where((await import("drizzle-orm")).eq(schema.filmCommercialEvidence.currency, "INR"));
    expect(row.amountLowMinor).toBe(BigInt("123456789012345"));
  });

  it("purges demo films", async () => {
    expect(await purgeDemoFilms(db)).toBeGreaterThan(500);
    expect(await db.select().from(schema.films)).toHaveLength(0);
  }, 60_000);
});
