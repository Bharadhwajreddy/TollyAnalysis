import { z } from "zod";
import { safeUrl } from "./corrections";

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/, "Use lowercase letters, digits and hyphens");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Positive amount in major units, e.g. 12500000.50")
  .optional();

export const personInput = z.object({
  slug,
  displayName: z.string().trim().min(2).max(120),
  canonicalName: z.string().trim().min(2).max(120).optional(),
  industry: z.enum(["telugu", "tamil", "malayalam", "kannada", "hindi"]),
  personStatus: z.enum(["active", "living_legacy", "review", "excluded"]).default("review"),
  defaultVisibility: z.enum(["public", "emerging_only", "hidden", "review"]).default("review"),
  tmdbPersonId: z.number().int().positive().optional(),
  wikidataId: z.string().regex(/^Q\d+$/).optional(),
  imdbNameId: z.string().regex(/^nm\d{6,10}$/).optional(),
  reason: z.string().trim().min(3).max(500),
});

export const filmInput = z.object({
  slug,
  title: z.string().trim().min(1).max(200),
  originalTitle: z.string().trim().max(200).optional(),
  originalLanguage: z.string().regex(/^[a-z]{2}$/),
  releaseRoute: z.enum(["theatrical", "ott", "mixed", "unknown"]),
  featureType: z.enum(["feature", "excluded_series", "excluded_short", "excluded_anthology"]).default("feature"),
  status: z.enum(["released", "upcoming", "in_review"]).default("in_review"),
  tmdbMovieId: z.number().int().positive().optional(),
  imdbTitleId: z.string().regex(/^tt\d{6,10}$/).optional(),
  teluguRelease: z
    .object({
      releaseType: z.enum(["original", "dubbed"]),
      releaseDate: isoDate.optional(),
      route: z.enum(["theatrical", "ott", "mixed", "unknown"]),
      isReRelease: z.boolean().default(false),
    })
    .optional(),
  reason: z.string().trim().min(3).max(500),
});

export const creditInput = z.object({
  filmSlug: slug,
  personSlug: slug,
  roleScope: z.enum(["principal_male_lead", "co_principal_male_lead", "supporting", "cameo", "special_appearance", "excluded"]),
  eligibilityStatus: z.enum(["approved", "pending", "rejected"]),
  evidenceNote: z.string().trim().min(3).max(1000),
  sourceKey: z.string().min(1).max(60).default("editorial"),
  reason: z.string().trim().min(3).max(500),
});

/** A single evidence claim. Commercial claims go to film_commercial_evidence; ratings to reception snapshots. */
export const sourceClaimInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("commercial"),
    filmSlug: slug,
    sourceKey: z.string().min(1).max(60),
    metricType: z.enum([
      "telugu_net",
      "telugu_gross",
      "telugu_distributor_share",
      "telugu_theatrical_business",
      "worldwide_all_language",
      "platform_views",
      "platform_hours",
      "platform_top10",
      "trade_verdict",
      "platform_outcome_band",
    ]),
    versionScope: z.enum(["telugu_original", "telugu_dub", "all_language", "unknown"]),
    territory: z.string().trim().min(2).max(80),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    amountLow: money,
    amountHigh: money,
    valueText: z.string().trim().max(200).optional(),
    confidence: z.enum(["high", "medium", "low", "disputed"]),
    approvalStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
    sourceUrl: safeUrl,
    observedAt: isoDate.optional(),
  }),
  z.object({
    kind: z.literal("reception"),
    filmSlug: slug,
    sourceKey: z.string().min(1).max(60),
    provider: z.enum(["imdb", "tmdb"]),
    rating: z.number().min(0).max(10),
    voteCount: z.number().int().min(0),
    sourceUrl: safeUrl,
    observedAt: isoDate,
    approvalStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
  }),
]);

export const socialSnapshotInput = z.object({
  personSlug: slug,
  platform: z.enum(["instagram", "x", "youtube", "facebook"]),
  handle: z.string().trim().min(1).max(100),
  profileUrl: safeUrl,
  isOfficial: z.boolean(),
  /** Omit to fetch via the platform adapter (feature flag + credentials required). */
  followersCount: z.number().int().min(0).optional(),
  snapshotAt: z.string().datetime().optional(),
});

export const tmdbImportInput = z.object({
  personSlug: slug,
  tmdbPersonId: z.number().int().positive().optional(),
});
