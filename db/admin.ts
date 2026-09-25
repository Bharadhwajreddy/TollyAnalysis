import { and, eq } from "drizzle-orm";
import { majorToMinor } from "@/lib/calculations/money";
import type { z } from "zod";
import type { creditInput, filmInput, personInput, socialSnapshotInput, sourceClaimInput } from "@/lib/validation/admin";
import type { Db } from "./client";
import { writeChangeLog } from "./repository";
import * as s from "./schema";

export class NotFoundError extends Error {}

async function idBySlug(db: Db, table: typeof s.people | typeof s.films, slug: string, what: string) {
  const [row] = await db.select({ id: table.id }).from(table).where(eq(table.slug, slug));
  if (!row) throw new NotFoundError(`${what} "${slug}" not found`);
  return row.id;
}

async function sourceIdByKey(db: Db, key: string) {
  const [row] = await db.select({ id: s.sources.id }).from(s.sources).where(eq(s.sources.key, key));
  if (!row) throw new NotFoundError(`Source "${key}" not found`);
  return row.id;
}

export async function upsertPerson(db: Db, input: z.output<typeof personInput>, actor: string) {
  const [before] = await db.select().from(s.people).where(eq(s.people.slug, input.slug));
  const values = {
    slug: input.slug,
    canonicalName: input.canonicalName ?? input.displayName,
    displayName: input.displayName,
    industry: input.industry,
    personStatus: input.personStatus,
    defaultVisibility: input.defaultVisibility,
    tmdbPersonId: input.tmdbPersonId ?? null,
    wikidataId: input.wikidataId ?? null,
    imdbNameId: input.imdbNameId ?? null,
    updatedAt: new Date(),
  };
  const [row] = await db.insert(s.people).values(values).onConflictDoUpdate({ target: s.people.slug, set: values }).returning();
  await writeChangeLog(db, { entityType: "people", entityId: row.id, action: before ? "updated" : "created", reason: input.reason, actorId: actor, before, after: row });
  return row;
}

export async function upsertFilm(db: Db, input: z.output<typeof filmInput>, actor: string) {
  const [before] = await db.select().from(s.films).where(eq(s.films.slug, input.slug));
  const values = {
    slug: input.slug,
    canonicalTitle: input.title,
    originalTitle: input.originalTitle ?? null,
    originalLanguage: input.originalLanguage,
    releaseRoute: input.releaseRoute,
    featureType: input.featureType,
    status: input.status,
    tmdbMovieId: input.tmdbMovieId ?? null,
    imdbTitleId: input.imdbTitleId ?? null,
    updatedAt: new Date(),
  };
  const [row] = await db.insert(s.films).values(values).onConflictDoUpdate({ target: s.films.slug, set: values }).returning();
  if (input.teluguRelease) {
    await db.delete(s.filmReleases).where(and(eq(s.filmReleases.filmId, row.id), eq(s.filmReleases.languageCode, "te")));
    await db.insert(s.filmReleases).values({
      filmId: row.id,
      languageCode: "te",
      releaseType: input.teluguRelease.releaseType,
      releaseDate: input.teluguRelease.releaseDate ?? null,
      releaseRoute: input.teluguRelease.route,
      isEligibleTeluguRelease: input.featureType === "feature",
      isReRelease: input.teluguRelease.isReRelease,
    });
  }
  await writeChangeLog(db, { entityType: "films", entityId: row.id, action: before ? "updated" : "created", reason: input.reason, actorId: actor, before, after: { ...row, teluguRelease: input.teluguRelease } });
  return row;
}

export async function upsertCredit(db: Db, input: z.output<typeof creditInput>, actor: string) {
  const filmId = await idBySlug(db, s.films, input.filmSlug, "Film");
  const personId = await idBySlug(db, s.people, input.personSlug, "Person");
  const sourceId = await sourceIdByKey(db, input.sourceKey);
  const [before] = await db.select().from(s.filmCredits).where(and(eq(s.filmCredits.filmId, filmId), eq(s.filmCredits.personId, personId)));
  const values = {
    filmId,
    personId,
    roleScope: input.roleScope,
    eligibilityStatus: input.eligibilityStatus,
    evidenceNote: input.evidenceNote,
    sourceId,
    reviewerId: actor,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(s.filmCredits)
    .values(values)
    .onConflictDoUpdate({ target: [s.filmCredits.filmId, s.filmCredits.personId], set: values })
    .returning();
  await writeChangeLog(db, { entityType: "film_credits", entityId: row.id, action: before ? "updated" : "created", reason: input.reason, actorId: actor, before, after: row });
  return row;
}

export async function addSourceClaim(db: Db, input: z.output<typeof sourceClaimInput>, actor: string) {
  const filmId = await idBySlug(db, s.films, input.filmSlug, "Film");
  const sourceId = await sourceIdByKey(db, input.sourceKey);
  if (input.kind === "reception") {
    const [row] = await db
      .insert(s.filmReceptionSnapshots)
      .values({
        filmId,
        sourceId,
        sourceMetric: input.provider === "imdb" ? "imdb_rating" : "tmdb_rating",
        rawValue: input.rating,
        voteCount: input.voteCount,
        approvalStatus: input.approvalStatus,
        observedAt: new Date(input.observedAt),
      })
      .returning();
    await writeChangeLog(db, { entityType: "film_reception_snapshots", entityId: row.id, action: "created", reason: `Manual ${input.provider} rating from ${input.sourceUrl}`, actorId: actor, after: row });
    return row;
  }
  const low = input.amountLow ? majorToMinor(input.amountLow) : null;
  const high = input.amountHigh ? majorToMinor(input.amountHigh) : null;
  const [claim] = await db
    .insert(s.sourceClaims)
    .values({
      sourceId,
      entityType: "film",
      entityId: filmId,
      metricKey: input.metricType,
      rawValueText: input.valueText ?? null,
      numericLow: input.amountLow ?? null,
      numericHigh: input.amountHigh ?? null,
      unit: input.currency ?? null,
      languageScope: input.versionScope,
      territoryScope: input.territory,
      observedAt: input.observedAt ? new Date(input.observedAt) : null,
      sourceUrl: input.sourceUrl,
      confidence: input.confidence,
      approvalStatus: input.approvalStatus,
      reviewerId: actor,
    })
    .returning();
  const [evidence] = await db
    .insert(s.filmCommercialEvidence)
    .values({
      filmId,
      sourceClaimId: claim.id,
      sourceId,
      metricType: input.metricType,
      releaseVersionScope: input.versionScope,
      territory: input.territory,
      currency: input.currency ?? null,
      amountLowMinor: low,
      amountHighMinor: high,
      valueText: input.valueText ?? null,
      confidence: input.confidence,
      evidenceStatus: input.approvalStatus,
      observedAt: input.observedAt ? new Date(input.observedAt) : null,
      sourceUrl: input.sourceUrl,
    })
    .returning({ id: s.filmCommercialEvidence.id });
  await writeChangeLog(db, {
    entityType: "source_claims",
    entityId: claim.id,
    action: "created",
    reason: `${input.metricType} (${input.versionScope}, ${input.territory}) from ${input.sourceUrl}`,
    actorId: actor,
    after: { claim, evidenceId: evidence.id },
  });
  return { claimId: claim.id, evidenceId: evidence.id };
}

export async function addSocialSnapshot(
  db: Db,
  input: z.output<typeof socialSnapshotInput> & { followersCount: number; platformUserId?: string | null; sourceMethod: string; rawPayloadHash?: string | null },
  actor: string,
) {
  const personId = await idBySlug(db, s.people, input.personSlug, "Person");
  const [profile] = await db
    .insert(s.socialProfiles)
    .values({
      personId,
      platform: input.platform,
      handle: input.handle,
      profileUrl: input.profileUrl,
      platformUserId: input.platformUserId ?? null,
      isOfficial: input.isOfficial,
      verificationStatus: input.isOfficial ? "official_confirmed" : "unverified",
    })
    .onConflictDoUpdate({
      target: [s.socialProfiles.platform, s.socialProfiles.handle],
      set: { profileUrl: input.profileUrl, isOfficial: input.isOfficial, updatedAt: new Date() },
    })
    .returning();
  const [snap] = await db
    .insert(s.socialSnapshots)
    .values({
      socialProfileId: profile.id,
      followersCount: input.followersCount,
      snapshotAt: input.snapshotAt ? new Date(input.snapshotAt) : new Date(),
      sourceMethod: input.sourceMethod,
      rawPayloadHash: input.rawPayloadHash ?? null,
    })
    .returning();
  await writeChangeLog(db, {
    entityType: "social_snapshots",
    entityId: snap.id,
    action: "created",
    reason: `${input.platform} snapshot for ${input.personSlug} via ${input.sourceMethod}`,
    actorId: actor,
  });
  return snap;
}
