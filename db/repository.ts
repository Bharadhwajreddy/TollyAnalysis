import { and, desc, eq, inArray, max } from "drizzle-orm";
import { runEngine, type EngineOutput, type HeroSnapshot } from "@/lib/calculations/engine";
import { METHODOLOGY, type MethodologyVersion } from "@/lib/constants/methodology";
import { INITIAL_ROSTER } from "@/lib/constants/roster";
import { DEMO_SOURCES, generateDemoDataset } from "@/lib/data/demo/generate";
import type {
  ChangeLogEntry,
  CommercialEvidence,
  Credit,
  Dataset,
  Film,
  FilterWindow,
  LegacyAssessment,
  Person,
  ReceptionEvidence,
  SocialSnapshot,
  Source,
} from "@/lib/domain/types";
import type { Db } from "./client";
import * as s from "./schema";

/* ───────────────────────── reads ───────────────────────── */

const RECEPTION_PROVIDER = { imdb_rating: "imdb", tmdb_rating: "tmdb", synthetic_rating: "synthetic_demo" } as const;
const iso = (d: Date | string | null) => (d === null ? null : typeof d === "string" ? d : d.toISOString());

export async function loadActiveMethodology(db: Db): Promise<{ rowId: string; methodology: MethodologyVersion } | null> {
  const [row] = await db.select().from(s.methodologyVersions).where(eq(s.methodologyVersions.isActive, true)).limit(1);
  if (!row) return null;
  const params = row.parameters as Partial<MethodologyVersion>;
  return {
    rowId: row.id,
    methodology: {
      ...METHODOLOGY,
      ...params,
      id: row.key,
      versionName: row.versionName,
      effectiveFrom: String(row.effectiveFrom),
      filmScoreWeights: row.filmScoreWeights as MethodologyVersion["filmScoreWeights"],
      heroScoreWeights: row.heroScoreWeights as MethodologyVersion["heroScoreWeights"],
      voteThresholdM: row.voteThresholdM,
      successThreshold: row.successThreshold,
      notes: row.notes ?? "",
    },
  };
}

/** Loads every approved/public record needed by the calculation engine. */
export async function loadDataset(db: Db, asOf = new Date().toISOString().slice(0, 10)): Promise<Dataset> {
  const [sourceRows, peopleRows, filmRows, releaseRows, creditRows, receptionRows, commercialRows, legacyRows, profileRows, snapshotRows, logRows] =
    await Promise.all([
      db.select().from(s.sources),
      db.select().from(s.people),
      db.select().from(s.films),
      db.select().from(s.filmReleases),
      db.select().from(s.filmCredits),
      db.select().from(s.filmReceptionSnapshots),
      db.select().from(s.filmCommercialEvidence),
      db.select().from(s.filmLegacyAssessments),
      db.select().from(s.socialProfiles),
      db.select().from(s.socialSnapshots),
      db.select().from(s.changeLog).orderBy(desc(s.changeLog.createdAt)).limit(300),
    ]);

  const sources: Source[] = sourceRows.map((r) => ({
    id: r.id,
    name: r.sourceName,
    type: r.sourceType,
    baseUrl: r.baseUrl,
    licensingNote: r.licensingNote,
    reliabilityTier: Math.min(3, Math.max(1, r.reliabilityTier)) as 1 | 2 | 3,
  }));

  const people: Person[] = peopleRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    displayName: r.displayName,
    industry: r.industry,
    status: r.personStatus,
    visibility: r.defaultVisibility,
    tmdbPersonId: r.tmdbPersonId,
    wikidataId: r.wikidataId,
    imdbNameId: r.imdbNameId,
  }));

  const releasesByFilm = new Map<string, (typeof releaseRows)[number][]>();
  for (const r of releaseRows) releasesByFilm.set(r.filmId, [...(releasesByFilm.get(r.filmId) ?? []), r]);

  const films: Film[] = filmRows.map((f) => {
    const telugu = (releasesByFilm.get(f.id) ?? [])
      .filter((r) => r.languageCode === "te" && r.isEligibleTeluguRelease)
      .sort((a, b) => String(a.releaseDate ?? "9999").localeCompare(String(b.releaseDate ?? "9999")))[0];
    return {
      id: f.id,
      slug: f.slug,
      title: f.canonicalTitle,
      originalLanguage: f.originalLanguage,
      releaseRoute: f.releaseRoute,
      featureType: f.featureType,
      status: f.status,
      tmdbMovieId: f.tmdbMovieId,
      imdbTitleId: f.imdbTitleId,
      isDemo: f.isDemo,
      teluguRelease: telugu
        ? {
            releaseType: telugu.releaseType,
            releaseDate: telugu.releaseDate ? String(telugu.releaseDate) : null,
            route: telugu.releaseRoute,
            isEligibleTeluguRelease: true,
            isReRelease: telugu.isReRelease,
          }
        : { releaseType: "original", releaseDate: null, route: f.releaseRoute, isEligibleTeluguRelease: false, isReRelease: false },
    };
  });

  const credits: Credit[] = creditRows.map((r) => ({
    filmId: r.filmId,
    personId: r.personId,
    roleScope: r.roleScope,
    eligibilityStatus: r.eligibilityStatus,
    evidenceNote: r.evidenceNote,
    sourceId: r.sourceId,
  }));

  const reception: ReceptionEvidence[] = receptionRows.map((r) => ({
    filmId: r.filmId,
    sourceId: r.sourceId,
    provider: RECEPTION_PROVIDER[r.sourceMetric],
    scope: "film_wide",
    rating: r.rawValue,
    voteCount: r.voteCount,
    observedAt: iso(r.observedAt)!,
    retrievedAt: iso(r.retrievedAt)!,
    approvalStatus: r.approvalStatus,
  }));

  const commercial: CommercialEvidence[] = commercialRows.map((r) => ({
    filmId: r.filmId,
    sourceId: r.sourceId,
    metricType: r.metricType,
    versionScope: r.releaseVersionScope,
    territory: r.territory,
    currency: r.currency,
    amountLowMinor: r.amountLowMinor === null ? null : r.amountLowMinor.toString(),
    amountHighMinor: r.amountHighMinor === null ? null : r.amountHighMinor.toString(),
    valueText: r.valueText,
    syntheticScore: r.syntheticScore,
    confidence: r.confidence,
    approvalStatus: r.evidenceStatus,
    observedAt: iso(r.observedAt),
    sourceUrl: r.sourceUrl,
  }));

  const legacy: LegacyAssessment[] = legacyRows.map((r) => ({
    filmId: r.filmId,
    status: r.legacyStatus,
    rationale: r.rationale,
    approvalStatus: r.approvalStatus,
  }));

  const profileById = new Map(profileRows.map((p) => [p.id, p]));
  const social: SocialSnapshot[] = snapshotRows
    .map((r) => {
      const p = profileById.get(r.socialProfileId);
      if (!p || !p.active) return null;
      return {
        personId: p.personId,
        platform: p.platform,
        profileUrl: p.profileUrl,
        isOfficial: p.isOfficial,
        followersCount: r.followersCount ?? r.subscribersCount,
        snapshotAt: iso(r.snapshotAt)!,
        sourceMethod: r.sourceMethod,
      } satisfies SocialSnapshot;
    })
    .filter((x): x is SocialSnapshot => x !== null);

  const changeLog: ChangeLogEntry[] = logRows.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    reason: r.reason,
    createdAt: iso(r.createdAt)!,
    actor: r.actorId,
  }));

  return { mode: "live", asOf, sources, people, films, credits, reception, commercial, legacy, social, syntheticSocial: [], changeLog };
}

export async function loadLatestSnapshots(
  db: Db,
  methodologyRowId: string,
): Promise<{ calculatedAt: string | null; snapshots: Record<FilterWindow, HeroSnapshot[]> }> {
  const empty = { all_time: [], last_5_years: [], last_10_films: [] } as Record<FilterWindow, HeroSnapshot[]>;
  const [{ latest }] = await db
    .select({ latest: max(s.heroMetricSnapshots.calculatedAt) })
    .from(s.heroMetricSnapshots)
    .where(eq(s.heroMetricSnapshots.methodologyVersionId, methodologyRowId));
  if (!latest) return { calculatedAt: null, snapshots: empty };
  const rows = await db
    .select({ window: s.heroMetricSnapshots.filterWindow, detail: s.heroMetricSnapshots.detail })
    .from(s.heroMetricSnapshots)
    .where(and(eq(s.heroMetricSnapshots.methodologyVersionId, methodologyRowId), eq(s.heroMetricSnapshots.calculatedAt, new Date(latest))));
  for (const r of rows) empty[r.window].push(r.detail as HeroSnapshot);
  return { calculatedAt: new Date(latest).toISOString(), snapshots: empty };
}

/* ───────────────────────── writes ───────────────────────── */

export async function writeChangeLog(
  db: Db,
  e: { entityType: string; entityId: string; action: string; reason: string; actorId?: string | null; before?: unknown; after?: unknown },
) {
  await db.insert(s.changeLog).values({
    entityType: e.entityType,
    entityId: e.entityId,
    action: e.action,
    reason: e.reason,
    actorId: e.actorId ?? null,
    beforeJson: e.before ?? null,
    afterJson: e.after ?? null,
  });
}

async function insertChunked<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}

export async function persistSnapshots(db: Db, out: EngineOutput, methodologyRowId: string) {
  const calculatedAt = new Date(out.calculatedAt);
  await insertChunked([...out.films.values()], 400, (chunk) =>
    db.insert(s.filmMetricSnapshots).values(
      chunk.map((f) => ({
        filmId: f.film.id,
        methodologyVersionId: methodologyRowId,
        audienceScore: f.success.components.audience,
        commercialPlatformScore: f.success.components.commercialPlatform,
        evidenceQualityScore: f.success.components.evidenceQuality,
        legacyScore: f.success.components.legacy,
        filmSuccessScore: f.success.score,
        scoringStatus: f.success.status,
        coveragePercent: f.success.coveragePercent,
        calculatedAt,
      })),
    ),
  );
  const heroRows = (Object.keys(out.snapshots) as FilterWindow[]).flatMap((w) => out.snapshots[w]);
  await insertChunked(heroRows, 200, (chunk) =>
    db.insert(s.heroMetricSnapshots).values(
      chunk.map((h) => ({
        personId: h.personId,
        methodologyVersionId: methodologyRowId,
        filterWindow: h.window,
        eligibleFilmCount: h.eligibleFilmCount,
        scoredFilmCount: h.scoredFilmCount,
        overallSuccessRatio: h.metrics.overallSuccessRatio.value,
        audienceIndex: h.metrics.audienceIndex.value,
        consistencyIndex: h.metrics.consistency.value,
        socialReachIndex: h.metrics.socialReach.value,
        momentumIndex: h.metrics.momentum.value,
        averageReleaseGapMonths: h.metrics.releaseGap.value,
        peakFilmsInYear: h.metrics.peakFilms.value,
        filmsPerActiveYear: h.metrics.filmsPerYear.value,
        heroPerformanceIndex: h.metrics.hpi.value,
        evidenceCoveragePercent: h.evidenceCoveragePercent,
        confidence: h.confidence,
        detail: h,
        calculatedAt,
      })),
    ),
  );
}

/** Recalculate every hero from the database and persist a new snapshot set. */
export async function recalculate(db: Db, actorId: string | null, reason = "Manual recalculation") {
  const active = await loadActiveMethodology(db);
  if (!active) throw new Error("No active methodology version. Run the seed first.");
  const dataset = await loadDataset(db);
  const out = runEngine(dataset, active.methodology, new Date().toISOString());
  await persistSnapshots(db, out, active.rowId);
  const heroes = out.snapshots.all_time.length;
  await writeChangeLog(db, {
    entityType: "hero_metric_snapshots",
    entityId: active.methodology.id,
    action: "recalculated",
    reason: `${reason}: ${heroes} heroes, ${out.films.size} films.`,
    actorId,
  });
  return { calculatedAt: out.calculatedAt, heroes, films: out.films.size, methodology: active.methodology.id };
}

/**
 * Seeds reference data, the active methodology and the curated roster.
 * With `demo: true` it also loads the synthetic demo filmography (flagged is_demo)
 * so live mode can be exercised end-to-end without real data.
 */
export async function seed(db: Db, opts: { demo: boolean }) {
  const sourceIdByKey = new Map<string, string>();
  for (const src of DEMO_SOURCES) {
    const key = src.id.replace(/^src-/, "");
    const [row] = await db
      .insert(s.sources)
      .values({ key, sourceName: src.name, sourceType: src.type, baseUrl: src.baseUrl, licensingNote: src.licensingNote, reliabilityTier: src.reliabilityTier })
      .onConflictDoUpdate({ target: s.sources.key, set: { sourceName: src.name, licensingNote: src.licensingNote } })
      .returning({ id: s.sources.id });
    sourceIdByKey.set(src.id, row.id);
  }

  const existing = await db.select().from(s.methodologyVersions).where(eq(s.methodologyVersions.key, METHODOLOGY.id));
  if (existing.length === 0) {
    await db.update(s.methodologyVersions).set({ isActive: false }).where(eq(s.methodologyVersions.isActive, true));
    await db.insert(s.methodologyVersions).values({
      key: METHODOLOGY.id,
      versionName: METHODOLOGY.versionName,
      effectiveFrom: METHODOLOGY.effectiveFrom,
      filmScoreWeights: METHODOLOGY.filmScoreWeights,
      heroScoreWeights: METHODOLOGY.heroScoreWeights,
      voteThresholdM: METHODOLOGY.voteThresholdM,
      successThreshold: METHODOLOGY.successThreshold,
      parameters: METHODOLOGY,
      notes: METHODOLOGY.notes,
      isActive: true,
    });
    await writeChangeLog(db, { entityType: "methodology_version", entityId: METHODOLOGY.id, action: "activated", reason: METHODOLOGY.notes, actorId: "seed" });
  }

  const personIdBySlug = new Map<string, string>();
  for (const c of INITIAL_ROSTER) {
    const [row] = await db
      .insert(s.people)
      .values({
        slug: c.slug,
        canonicalName: c.name,
        displayName: c.name,
        industry: c.industry,
        personStatus: c.status,
        defaultVisibility: c.demoFilmCount && c.demoFilmCount < 3 ? "emerging_only" : "public",
      })
      .onConflictDoUpdate({ target: s.people.slug, set: { displayName: c.name } })
      .returning({ id: s.people.id });
    personIdBySlug.set(c.slug, row.id);
  }
  await writeChangeLog(db, {
    entityType: "people",
    entityId: "roster",
    action: "seeded",
    reason: `Curated roster of ${INITIAL_ROSTER.length} candidates seeded (Panja Vaisshnav Tej excluded by editorial decision).`,
    actorId: "seed",
  });

  if (!opts.demo) return { people: INITIAL_ROSTER.length, films: 0 };

  const demo = generateDemoDataset();
  const already = await db.select({ id: s.films.id }).from(s.films).where(eq(s.films.isDemo, true)).limit(1);
  if (already.length) return { people: INITIAL_ROSTER.length, films: 0, note: "demo films already present" };

  const filmIdByDemo = new Map<string, string>();
  const personId = (demoId: string) => personIdBySlug.get(demoId.replace(/^p-/, ""))!;
  await insertChunked(demo.films, 200, async (chunk) => {
    const rows = await db
      .insert(s.films)
      .values(
        chunk.map((f) => ({
          slug: f.slug,
          canonicalTitle: f.title,
          originalLanguage: f.originalLanguage,
          releaseRoute: f.releaseRoute,
          featureType: f.featureType,
          status: f.status,
          isDemo: true,
        })),
      )
      .returning({ id: s.films.id, slug: s.films.slug });
    for (const r of rows) filmIdByDemo.set(`f-${r.slug}`, r.id);
  });
  const fid = (demoId: string) => filmIdByDemo.get(demoId)!;
  const src = (demoId: string | null) => (demoId ? (sourceIdByKey.get(demoId) ?? null) : null);

  await insertChunked(demo.films, 300, (chunk) =>
    db.insert(s.filmReleases).values(
      chunk.map((f) => ({
        filmId: fid(f.id),
        languageCode: "te",
        releaseType: f.teluguRelease.releaseType,
        releaseDate: f.teluguRelease.releaseDate,
        releaseRoute: f.teluguRelease.route,
        isEligibleTeluguRelease: f.teluguRelease.isEligibleTeluguRelease,
        isReRelease: f.teluguRelease.isReRelease,
        sourceId: src("src-demo"),
      })),
    ),
  );
  await insertChunked(demo.credits, 300, (chunk) =>
    db.insert(s.filmCredits).values(
      chunk.map((c) => ({
        filmId: fid(c.filmId),
        personId: personId(c.personId),
        roleScope: c.roleScope,
        eligibilityStatus: c.eligibilityStatus,
        evidenceNote: c.evidenceNote,
        sourceId: src(c.sourceId),
      })),
    ),
  );
  await insertChunked(demo.reception, 300, (chunk) =>
    db.insert(s.filmReceptionSnapshots).values(
      chunk.map((r) => ({
        filmId: fid(r.filmId),
        sourceId: src(r.sourceId)!,
        sourceMetric: "synthetic_rating" as const,
        rawValue: r.rating,
        voteCount: r.voteCount,
        approvalStatus: r.approvalStatus,
        observedAt: new Date(r.observedAt),
        retrievedAt: new Date(r.retrievedAt),
      })),
    ),
  );
  await insertChunked(demo.commercial, 300, (chunk) =>
    db.insert(s.filmCommercialEvidence).values(
      chunk.map((c) => ({
        filmId: fid(c.filmId),
        sourceId: src(c.sourceId)!,
        metricType: c.metricType,
        releaseVersionScope: c.versionScope,
        territory: c.territory,
        currency: c.currency,
        amountLowMinor: c.amountLowMinor === null ? null : BigInt(c.amountLowMinor),
        amountHighMinor: c.amountHighMinor === null ? null : BigInt(c.amountHighMinor),
        valueText: c.valueText,
        syntheticScore: c.syntheticScore,
        confidence: c.confidence,
        evidenceStatus: c.approvalStatus,
        observedAt: c.observedAt ? new Date(c.observedAt) : null,
        sourceUrl: c.sourceUrl,
      })),
    ),
  );
  await insertChunked(demo.legacy, 300, (chunk) =>
    db.insert(s.filmLegacyAssessments).values(
      chunk.map((l) => ({ filmId: fid(l.filmId), legacyStatus: l.status, rationale: l.rationale, approvalStatus: l.approvalStatus })),
    ),
  );
  await writeChangeLog(db, {
    entityType: "films",
    entityId: "demo",
    action: "seeded_demo",
    reason: `Loaded ${demo.films.length} fictional demo titles (is_demo = true) for end-to-end testing.`,
    actorId: "seed",
  });
  return { people: INITIAL_ROSTER.length, films: demo.films.length };
}

/** Removes all demo-flagged films (and their evidence via cascade). */
export async function purgeDemoFilms(db: Db) {
  const ids = (await db.select({ id: s.films.id }).from(s.films).where(eq(s.films.isDemo, true))).map((r) => r.id);
  if (ids.length) {
    await db.delete(s.filmMetricSnapshots).where(inArray(s.filmMetricSnapshots.filmId, ids));
    await db.delete(s.films).where(inArray(s.films.id, ids));
  }
  return ids.length;
}
