import { and, eq } from "drizzle-orm";
import { writeChangeLog } from "@/db/repository";
import * as s from "@/db/schema";
import { adminJsonRoute } from "@/lib/admin/route";
import { NotFoundError } from "@/db/admin";
import { mapCandidateFilms, payloadHash, tmdb } from "@/lib/providers/tmdb";
import { tmdbImportInput } from "@/lib/validation/admin";

/**
 * Imports a person's TMDb movie credits (2000+) as candidate films. Every credit is
 * created as `pending` — lead status is decided by an editor, never by cast order.
 */
export const POST = adminJsonRoute(tmdbImportInput, async (db, input, actor) => {
  const [person] = await db.select().from(s.people).where(eq(s.people.slug, input.personSlug));
  if (!person) throw new NotFoundError(`Person "${input.personSlug}" not found`);
  const tmdbId = input.tmdbPersonId ?? person.tmdbPersonId;
  if (!tmdbId) throw new NotFoundError("No TMDb person id. Pass tmdbPersonId or set it on the person first.");
  const [src] = await db.select().from(s.sources).where(eq(s.sources.key, "tmdb"));
  if (!src) throw new NotFoundError('Source "tmdb" missing — run the seed');

  const credits = await tmdb.personMovieCredits(tmdbId);
  const candidates = mapCandidateFilms(credits.cast);
  let created = 0;
  for (const c of candidates) {
    const slug = `tmdb-${c.tmdbMovieId}`;
    const [film] = await db
      .insert(s.films)
      .values({
        slug,
        canonicalTitle: c.title,
        originalTitle: c.originalTitle,
        originalLanguage: c.originalLanguage,
        tmdbMovieId: c.tmdbMovieId,
        releaseRoute: "unknown",
        status: "in_review",
      })
      .onConflictDoUpdate({ target: s.films.tmdbMovieId, set: { canonicalTitle: c.title, updatedAt: new Date() } })
      .returning({ id: s.films.id });
    if (c.originalLanguage === "te") {
      const existing = await db.select({ id: s.filmReleases.id }).from(s.filmReleases).where(and(eq(s.filmReleases.filmId, film.id), eq(s.filmReleases.languageCode, "te")));
      if (!existing.length)
        await db.insert(s.filmReleases).values({
          filmId: film.id,
          languageCode: "te",
          releaseType: "original",
          releaseDate: c.releaseDate,
          releaseRoute: "unknown",
          // Needs editorial confirmation of feature-length and release route.
          isEligibleTeluguRelease: false,
          sourceId: src.id,
        });
    }
    const inserted = await db
      .insert(s.filmCredits)
      .values({
        filmId: film.id,
        personId: person.id,
        roleScope: "excluded",
        eligibilityStatus: "pending",
        evidenceNote: `TMDb cast order ${c.castOrder ?? "?"}${c.character ? `, as ${c.character}` : ""}. Awaiting lead-role review.`,
        sourceId: src.id,
      })
      .onConflictDoNothing()
      .returning({ id: s.filmCredits.id });
    if (inserted.length) created++;
    if (c.tmdbRating !== null && c.tmdbVotes)
      await db.insert(s.filmReceptionSnapshots).values({
        filmId: film.id,
        sourceId: src.id,
        sourceMetric: "tmdb_rating",
        rawValue: c.tmdbRating,
        voteCount: c.tmdbVotes,
        approvalStatus: "approved",
        observedAt: new Date(),
      });
  }
  await writeChangeLog(db, {
    entityType: "people",
    entityId: person.id,
    action: "tmdb_import",
    reason: `Imported ${candidates.length} TMDb credits (${created} new, all pending review). Payload ${(await payloadHash(credits)).slice(0, 12)}.`,
    actorId: actor,
  });
  return { candidates: candidates.length, newPendingCredits: created };
});
