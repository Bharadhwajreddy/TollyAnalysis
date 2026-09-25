/**
 * Core domain model. Mirrors the Postgres schema in `db/schema` so the
 * calculation engine can run identically on demo data and on live rows.
 */

export type Industry = "telugu" | "tamil" | "malayalam" | "kannada" | "hindi";

export type PersonStatus = "active" | "living_legacy" | "review" | "excluded";
export type Visibility = "public" | "emerging_only" | "hidden" | "review";

export type RoleScope =
  | "principal_male_lead"
  | "co_principal_male_lead"
  | "supporting"
  | "cameo"
  | "special_appearance"
  | "excluded";

export type EligibilityStatus = "approved" | "pending" | "rejected";

export type ReleaseRoute = "theatrical" | "ott" | "mixed" | "unknown";
export type FeatureType =
  | "feature"
  | "excluded_series"
  | "excluded_short"
  | "excluded_anthology";
export type FilmStatus = "released" | "upcoming" | "in_review";
export type TeluguReleaseType = "original" | "dubbed";

export type ScoringStatus =
  | "scored"
  | "provisional"
  | "insufficient_evidence"
  | "not_yet_final";

export type LegacyStatus =
  | "none"
  | "reappraised"
  | "cult_favourite"
  | "enduring_popularity"
  | "not_reviewed";

export type ClaimConfidence = "high" | "medium" | "low" | "disputed";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ConfidenceGrade = "high" | "medium" | "low" | "insufficient";

export type FilterWindow = "all_time" | "last_5_years" | "last_10_films";

export type SourceType =
  | "official_api"
  | "licensed_dataset"
  | "trade_report"
  | "platform_press_release"
  | "manual_editorial"
  | "user_submission"
  | "synthetic_demo";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  baseUrl: string | null;
  licensingNote: string | null;
  reliabilityTier: 1 | 2 | 3;
}

export interface Person {
  id: string;
  slug: string;
  displayName: string;
  industry: Industry;
  status: PersonStatus;
  visibility: Visibility;
  tmdbPersonId: number | null;
  wikidataId: string | null;
  imdbNameId: string | null;
}

export interface TeluguRelease {
  releaseType: TeluguReleaseType;
  releaseDate: string | null; // ISO yyyy-mm-dd
  route: ReleaseRoute;
  isEligibleTeluguRelease: boolean;
  /** true for re-release screenings: never a new film credit */
  isReRelease: boolean;
}

export interface Film {
  id: string;
  slug: string;
  title: string;
  originalLanguage: string; // ISO 639-1
  releaseRoute: ReleaseRoute;
  featureType: FeatureType;
  status: FilmStatus;
  teluguRelease: TeluguRelease;
  tmdbMovieId: number | null;
  imdbTitleId: string | null;
  isDemo: boolean;
}

export interface Credit {
  filmId: string;
  personId: string;
  roleScope: RoleScope;
  eligibilityStatus: EligibilityStatus;
  evidenceNote: string | null;
  sourceId: string | null;
}

/** Audience reception snapshot. `scope` is always film-wide: never Telugu-audience-only. */
export interface ReceptionEvidence {
  filmId: string;
  sourceId: string;
  provider: "imdb" | "tmdb" | "synthetic_demo";
  scope: "film_wide";
  rating: number; // 0–10 scale
  voteCount: number;
  observedAt: string;
  retrievedAt: string;
  approvalStatus: ApprovalStatus;
}

export type CommercialMetricType =
  | "telugu_net"
  | "telugu_gross"
  | "telugu_distributor_share"
  | "telugu_theatrical_business"
  | "worldwide_all_language"
  | "platform_views"
  | "platform_hours"
  | "platform_top10"
  | "trade_verdict"
  | "platform_outcome_band"
  | "synthetic_outcome_score";

export type VersionScope =
  | "telugu_original"
  | "telugu_dub"
  | "all_language"
  | "unknown";

export type TradeVerdict =
  | "disaster"
  | "flop"
  | "below_average"
  | "average"
  | "above_average"
  | "hit"
  | "super_hit"
  | "blockbuster";

export type PlatformOutcomeBand = "weak" | "moderate" | "strong" | "exceptional";

export interface CommercialEvidence {
  filmId: string;
  sourceId: string;
  metricType: CommercialMetricType;
  versionScope: VersionScope;
  territory: string; // e.g. "AP/TS", "worldwide", "platform:global"
  currency: string | null;
  /** Money is stored as integer minor units (paise) in strings to avoid float drift. */
  amountLowMinor: string | null;
  amountHighMinor: string | null;
  valueText: string | null;
  /** Only used by synthetic demo evidence (0–100). Never shown as a real number. */
  syntheticScore: number | null;
  confidence: ClaimConfidence;
  approvalStatus: ApprovalStatus;
  observedAt: string | null;
  sourceUrl: string | null;
}

export interface LegacyAssessment {
  filmId: string;
  status: LegacyStatus;
  rationale: string;
  approvalStatus: ApprovalStatus;
}

export type SocialPlatform = "instagram" | "x" | "youtube" | "facebook";

export interface SocialSnapshot {
  personId: string;
  platform: SocialPlatform;
  profileUrl: string;
  isOfficial: boolean;
  followersCount: number | null;
  snapshotAt: string;
  sourceMethod: string;
}

/** Demo-only stand-in for social snapshots. Never displayed as follower counts. */
export interface SyntheticSocialIndex {
  personId: string;
  index: number;
  snapshotAt: string;
}

export interface ChangeLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  reason: string;
  createdAt: string;
  actor: string | null;
}

export interface Dataset {
  mode: "demo" | "live";
  asOf: string;
  sources: Source[];
  people: Person[];
  films: Film[];
  credits: Credit[];
  reception: ReceptionEvidence[];
  commercial: CommercialEvidence[];
  legacy: LegacyAssessment[];
  social: SocialSnapshot[];
  syntheticSocial: SyntheticSocialIndex[];
  changeLog: ChangeLogEntry[];
}
