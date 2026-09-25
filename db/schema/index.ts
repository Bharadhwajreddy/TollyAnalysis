import { sql } from "drizzle-orm";
import {
  boolean,
  bigint,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ───────────────────────── enums ───────────────────────── */

export const industryEnum = pgEnum("industry", ["telugu", "tamil", "malayalam", "kannada", "hindi"]);
export const personStatusEnum = pgEnum("person_status", ["active", "living_legacy", "review", "excluded"]);
export const visibilityEnum = pgEnum("default_visibility", ["public", "emerging_only", "hidden", "review"]);
export const releaseRouteEnum = pgEnum("release_route", ["theatrical", "ott", "mixed", "unknown"]);
export const featureTypeEnum = pgEnum("feature_type", ["feature", "excluded_series", "excluded_short", "excluded_anthology"]);
export const filmStatusEnum = pgEnum("film_status", ["released", "upcoming", "in_review"]);
export const releaseTypeEnum = pgEnum("release_type", ["original", "dubbed"]);
export const roleScopeEnum = pgEnum("role_scope", [
  "principal_male_lead",
  "co_principal_male_lead",
  "supporting",
  "cameo",
  "special_appearance",
  "excluded",
]);
export const eligibilityStatusEnum = pgEnum("eligibility_status", ["approved", "pending", "rejected"]);
export const socialPlatformEnum = pgEnum("social_platform", ["instagram", "x", "youtube", "facebook"]);
export const sourceTypeEnum = pgEnum("source_type", [
  "official_api",
  "licensed_dataset",
  "trade_report",
  "platform_press_release",
  "manual_editorial",
  "user_submission",
  "synthetic_demo",
]);
export const claimConfidenceEnum = pgEnum("claim_confidence", ["high", "medium", "low", "disputed"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const receptionMetricEnum = pgEnum("reception_metric", ["imdb_rating", "tmdb_rating", "synthetic_rating"]);
export const commercialMetricEnum = pgEnum("commercial_metric", [
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
  "synthetic_outcome_score",
]);
export const versionScopeEnum = pgEnum("release_version_scope", ["telugu_original", "telugu_dub", "all_language", "unknown"]);
export const legacyStatusEnum = pgEnum("legacy_status", ["none", "reappraised", "cult_favourite", "enduring_popularity", "not_reviewed"]);
export const scoringStatusEnum = pgEnum("scoring_status", ["scored", "provisional", "insufficient_evidence", "not_yet_final"]);
export const filterWindowEnum = pgEnum("filter_window", ["all_time", "last_5_years", "last_10_films"]);
export const confidenceGradeEnum = pgEnum("confidence_grade", ["high", "medium", "low", "insufficient"]);
export const correctionStatusEnum = pgEnum("correction_status", [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "needs_more_evidence",
]);
export const dataActionEnum = pgEnum("correction_data_action", [
  "update_record",
  "create_record",
  "create_source_claim",
  "no_data_change",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ───────────────────────── reference ───────────────────────── */

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  sourceName: text("source_name").notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  baseUrl: text("base_url"),
  licensingNote: text("licensing_note"),
  reliabilityTier: integer("reliability_tier").notNull().default(2),
  ...timestamps,
});

/* ───────────────────────── people ───────────────────────── */

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    canonicalName: text("canonical_name").notNull(),
    displayName: text("display_name").notNull(),
    sexOrScopeClassification: text("sex_or_scope_classification").notNull().default("male_lead_scope"),
    industry: industryEnum("industry").notNull().default("telugu"),
    personStatus: personStatusEnum("person_status").notNull().default("review"),
    defaultVisibility: visibilityEnum("default_visibility").notNull().default("review"),
    tmdbPersonId: integer("tmdb_person_id").unique(),
    wikidataId: text("wikidata_id").unique(),
    imdbNameId: text("imdb_name_id").unique(),
    bioSummary: text("bio_summary"),
    ...timestamps,
  },
  (t) => [index("people_status_idx").on(t.personStatus, t.defaultVisibility)],
);

export const personAliases = pgTable(
  "person_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    language: text("language"),
    sourceId: uuid("source_id").references(() => sources.id),
  },
  (t) => [index("person_aliases_person_idx").on(t.personId)],
);

/* ───────────────────────── films ───────────────────────── */

export const films = pgTable(
  "films",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    canonicalTitle: text("canonical_title").notNull(),
    originalTitle: text("original_title"),
    originalLanguage: text("original_language").notNull(),
    tmdbMovieId: integer("tmdb_movie_id").unique(),
    imdbTitleId: text("imdb_title_id").unique(),
    wikidataId: text("wikidata_id").unique(),
    runtimeMinutes: integer("runtime_minutes"),
    releaseRoute: releaseRouteEnum("release_route").notNull().default("unknown"),
    featureType: featureTypeEnum("feature_type").notNull().default("feature"),
    status: filmStatusEnum("status").notNull().default("in_review"),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("films_status_idx").on(t.status, t.featureType)],
);

export const filmReleases = pgTable(
  "film_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filmId: uuid("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
    languageCode: text("language_code").notNull(),
    releaseType: releaseTypeEnum("release_type").notNull(),
    countryCode: text("country_code"),
    releaseDate: date("release_date"),
    releaseRoute: releaseRouteEnum("release_route").notNull().default("unknown"),
    isEligibleTeluguRelease: boolean("is_eligible_telugu_release").notNull().default(false),
    isReRelease: boolean("is_re_release").notNull().default(false),
    sourceId: uuid("source_id").references(() => sources.id),
  },
  (t) => [
    index("film_releases_film_idx").on(t.filmId),
    index("film_releases_date_idx").on(t.releaseDate),
    index("film_releases_eligible_idx").on(t.isEligibleTeluguRelease, t.languageCode),
  ],
);

export const filmTitles = pgTable(
  "film_titles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filmId: uuid("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    languageCode: text("language_code").notNull(),
    script: text("script"),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [index("film_titles_film_idx").on(t.filmId)],
);

export const filmCredits = pgTable(
  "film_credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filmId: uuid("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    roleScope: roleScopeEnum("role_scope").notNull(),
    eligibilityStatus: eligibilityStatusEnum("eligibility_status").notNull().default("pending"),
    evidenceNote: text("evidence_note"),
    sourceId: uuid("source_id").references(() => sources.id),
    reviewerId: text("reviewer_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("film_credits_film_person_uq").on(t.filmId, t.personId),
    index("film_credits_person_idx").on(t.personId),
    index("film_credits_eligibility_idx").on(t.eligibilityStatus, t.roleScope),
  ],
);

/* ───────────────────────── social ───────────────────────── */

export const socialProfiles = pgTable(
  "social_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    platform: socialPlatformEnum("platform").notNull(),
    handle: text("handle").notNull(),
    profileUrl: text("profile_url").notNull(),
    platformUserId: text("platform_user_id"),
    isOfficial: boolean("is_official").notNull().default(false),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("social_profiles_platform_handle_uq").on(t.platform, t.handle), index("social_profiles_person_idx").on(t.personId)],
);

export const socialSnapshots = pgTable(
  "social_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    socialProfileId: uuid("social_profile_id").notNull().references(() => socialProfiles.id, { onDelete: "cascade" }),
    followersCount: bigint("followers_count", { mode: "number" }),
    subscribersCount: bigint("subscribers_count", { mode: "number" }),
    followingCount: bigint("following_count", { mode: "number" }),
    postCount: bigint("post_count", { mode: "number" }),
    verifiedState: text("verified_state"),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull(),
    sourceMethod: text("source_method").notNull(),
    rawPayloadHash: text("raw_payload_hash"),
    rawPayloadReference: text("raw_payload_reference"),
  },
  (t) => [index("social_snapshots_profile_time_idx").on(t.socialProfileId, t.snapshotAt)],
);

/* ───────────────────────── evidence ───────────────────────── */

export const sourceClaims = pgTable(
  "source_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    metricKey: text("metric_key").notNull(),
    rawValueText: text("raw_value_text"),
    numericValue: numeric("numeric_value"),
    numericLow: numeric("numeric_low"),
    numericHigh: numeric("numeric_high"),
    unit: text("unit"),
    languageScope: text("language_scope"),
    territoryScope: text("territory_scope"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    sourceUrl: text("source_url").notNull(),
    payloadHash: text("payload_hash"),
    confidence: claimConfidenceEnum("confidence").notNull().default("medium"),
    approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
    reviewerId: text("reviewer_id"),
    ...timestamps,
  },
  (t) => [
    index("source_claims_entity_idx").on(t.entityType, t.entityId, t.metricKey),
    index("source_claims_approval_idx").on(t.approvalStatus),
  ],
);

export const filmReceptionSnapshots = pgTable(
  "film_reception_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filmId: uuid("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    sourceMetric: receptionMetricEnum("source_metric").notNull(),
    /** Film-wide scope only; never a Telugu-audience-only rating. */
    scope: text("scope").notNull().default("film_wide"),
    rawValue: real("raw_value").notNull(),
    voteCount: integer("vote_count").notNull().default(0),
    approvalStatus: approvalStatusEnum("approval_status").notNull().default("approved"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("film_reception_film_idx").on(t.filmId, t.retrievedAt)],
);

export const filmCommercialEvidence = pgTable(
  "film_commercial_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filmId: uuid("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
    sourceClaimId: uuid("source_claim_id").references(() => sourceClaims.id),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    metricType: commercialMetricEnum("metric_type").notNull(),
    releaseVersionScope: versionScopeEnum("release_version_scope").notNull(),
    territory: text("territory").notNull(),
    currency: text("currency"),
    /** Integer minor units (paise/cents) — never floating point. */
    amountLowMinor: bigint("amount_low_minor", { mode: "bigint" }),
    amountHighMinor: bigint("amount_high_minor", { mode: "bigint" }),
    valueText: text("value_text"),
    syntheticScore: real("synthetic_score"),
    confidence: claimConfidenceEnum("confidence").notNull().default("medium"),
    evidenceStatus: approvalStatusEnum("evidence_status").notNull().default("pending"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    sourceUrl: text("source_url"),
    ...timestamps,
  },
  (t) => [index("film_commercial_film_idx").on(t.filmId, t.metricType)],
);

export const filmLegacyAssessments = pgTable(
  "film_legacy_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filmId: uuid("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
    legacyStatus: legacyStatusEnum("legacy_status").notNull().default("not_reviewed"),
    rationale: text("rationale").notNull(),
    approvalStatus: approvalStatusEnum("approval_status").notNull().default("pending"),
    reviewerId: text("reviewer_id"),
    ...timestamps,
  },
  (t) => [index("film_legacy_film_idx").on(t.filmId)],
);

/* ───────────────────────── methodology & snapshots ───────────────────────── */

export const methodologyVersions = pgTable(
  "methodology_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    versionName: text("version_name").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    filmScoreWeights: jsonb("film_score_weights").notNull(),
    heroScoreWeights: jsonb("hero_score_weights").notNull(),
    voteThresholdM: integer("vote_threshold_m").notNull(),
    successThreshold: real("success_threshold").notNull(),
    /** Remaining tunables (floors, ceilings, windows) as a typed MethodologyVersion. */
    parameters: jsonb("parameters").notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("methodology_single_active_uq").on(t.isActive).where(sql`${t.isActive} = true`)],
);

export const filmMetricSnapshots = pgTable(
  "film_metric_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filmId: uuid("film_id").notNull().references(() => films.id, { onDelete: "cascade" }),
    methodologyVersionId: uuid("methodology_version_id").notNull().references(() => methodologyVersions.id),
    audienceScore: real("audience_score"),
    commercialPlatformScore: real("commercial_platform_score"),
    evidenceQualityScore: real("evidence_quality_score"),
    legacyScore: real("legacy_score"),
    filmSuccessScore: real("film_success_score"),
    scoringStatus: scoringStatusEnum("scoring_status").notNull(),
    coveragePercent: real("coverage_percent").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("film_metric_snapshots_idx").on(t.methodologyVersionId, t.calculatedAt, t.filmId)],
);

export const heroMetricSnapshots = pgTable(
  "hero_metric_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    methodologyVersionId: uuid("methodology_version_id").notNull().references(() => methodologyVersions.id),
    filterWindow: filterWindowEnum("filter_window").notNull(),
    eligibleFilmCount: integer("eligible_film_count").notNull(),
    scoredFilmCount: integer("scored_film_count").notNull(),
    overallSuccessRatio: real("overall_success_ratio"),
    audienceIndex: real("audience_index"),
    consistencyIndex: real("consistency_index"),
    socialReachIndex: real("social_reach_index"),
    momentumIndex: real("momentum_index"),
    averageReleaseGapMonths: real("average_release_gap_months"),
    peakFilmsInYear: integer("peak_films_in_year"),
    filmsPerActiveYear: real("films_per_active_year"),
    heroPerformanceIndex: real("hero_performance_index"),
    evidenceCoveragePercent: real("evidence_coverage_percent").notNull(),
    confidence: confidenceGradeEnum("confidence").notNull(),
    /** Full metric results (value, coverage, status, explanation) for the API. */
    detail: jsonb("detail").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("hero_snapshots_lookup_idx").on(t.methodologyVersionId, t.filterWindow, t.calculatedAt),
    index("hero_snapshots_person_idx").on(t.personId),
    index("hero_snapshots_hpi_idx").on(t.heroPerformanceIndex),
    index("hero_snapshots_ratio_idx").on(t.overallSuccessRatio),
    index("hero_snapshots_audience_idx").on(t.audienceIndex),
  ],
);

/* ───────────────────────── editorial ───────────────────────── */

export const correctionSubmissions = pgTable(
  "correction_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionType: text("submission_type").notNull(),
    personId: uuid("person_id").references(() => people.id),
    filmId: uuid("film_id").references(() => films.id),
    heroNameText: text("hero_name_text"),
    filmNameText: text("film_name_text"),
    currentValue: text("current_value"),
    submittedClaim: text("submitted_claim").notNull(),
    proposedValue: text("proposed_value"),
    evidenceUrl: text("evidence_url").notNull(),
    explanation: text("explanation"),
    /** Private: never exposed by public routes. */
    email: text("email"),
    status: correctionStatusEnum("status").notNull().default("pending"),
    dataAction: dataActionEnum("data_action"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
  },
  (t) => [index("corrections_status_idx").on(t.status, t.submittedAt)],
);

export const changeLog = pgTable(
  "change_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    reason: text("reason").notNull(),
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("change_log_entity_idx").on(t.entityType, t.entityId), index("change_log_time_idx").on(t.createdAt)],
);
