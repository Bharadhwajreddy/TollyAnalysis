CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."claim_confidence" AS ENUM('high', 'medium', 'low', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."commercial_metric" AS ENUM('telugu_net', 'telugu_gross', 'telugu_distributor_share', 'telugu_theatrical_business', 'worldwide_all_language', 'platform_views', 'platform_hours', 'platform_top10', 'trade_verdict', 'platform_outcome_band', 'synthetic_outcome_score');--> statement-breakpoint
CREATE TYPE "public"."confidence_grade" AS ENUM('high', 'medium', 'low', 'insufficient');--> statement-breakpoint
CREATE TYPE "public"."correction_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'needs_more_evidence');--> statement-breakpoint
CREATE TYPE "public"."correction_data_action" AS ENUM('update_record', 'create_record', 'create_source_claim', 'no_data_change');--> statement-breakpoint
CREATE TYPE "public"."eligibility_status" AS ENUM('approved', 'pending', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."feature_type" AS ENUM('feature', 'excluded_series', 'excluded_short', 'excluded_anthology');--> statement-breakpoint
CREATE TYPE "public"."film_status" AS ENUM('released', 'upcoming', 'in_review');--> statement-breakpoint
CREATE TYPE "public"."filter_window" AS ENUM('all_time', 'last_5_years', 'last_10_films');--> statement-breakpoint
CREATE TYPE "public"."industry" AS ENUM('telugu', 'tamil', 'malayalam', 'kannada', 'hindi');--> statement-breakpoint
CREATE TYPE "public"."legacy_status" AS ENUM('none', 'reappraised', 'cult_favourite', 'enduring_popularity', 'not_reviewed');--> statement-breakpoint
CREATE TYPE "public"."person_status" AS ENUM('active', 'living_legacy', 'review', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."reception_metric" AS ENUM('imdb_rating', 'tmdb_rating', 'synthetic_rating');--> statement-breakpoint
CREATE TYPE "public"."release_route" AS ENUM('theatrical', 'ott', 'mixed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."release_type" AS ENUM('original', 'dubbed');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('principal_male_lead', 'co_principal_male_lead', 'supporting', 'cameo', 'special_appearance', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."scoring_status" AS ENUM('scored', 'provisional', 'insufficient_evidence', 'not_yet_final');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('instagram', 'x', 'youtube', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('official_api', 'licensed_dataset', 'trade_report', 'platform_press_release', 'manual_editorial', 'user_submission', 'synthetic_demo');--> statement-breakpoint
CREATE TYPE "public"."release_version_scope" AS ENUM('telugu_original', 'telugu_dub', 'all_language', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."default_visibility" AS ENUM('public', 'emerging_only', 'hidden', 'review');--> statement-breakpoint
CREATE TABLE "change_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"reason" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correction_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_type" text NOT NULL,
	"person_id" uuid,
	"film_id" uuid,
	"hero_name_text" text,
	"film_name_text" text,
	"current_value" text,
	"submitted_claim" text NOT NULL,
	"proposed_value" text,
	"evidence_url" text NOT NULL,
	"explanation" text,
	"email" text,
	"status" "correction_status" DEFAULT 'pending' NOT NULL,
	"data_action" "correction_data_action",
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text
);
--> statement-breakpoint
CREATE TABLE "film_commercial_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"source_claim_id" uuid,
	"source_id" uuid NOT NULL,
	"metric_type" "commercial_metric" NOT NULL,
	"release_version_scope" "release_version_scope" NOT NULL,
	"territory" text NOT NULL,
	"currency" text,
	"amount_low_minor" bigint,
	"amount_high_minor" bigint,
	"value_text" text,
	"synthetic_score" real,
	"confidence" "claim_confidence" DEFAULT 'medium' NOT NULL,
	"evidence_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"observed_at" timestamp with time zone,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role_scope" "role_scope" NOT NULL,
	"eligibility_status" "eligibility_status" DEFAULT 'pending' NOT NULL,
	"evidence_note" text,
	"source_id" uuid,
	"reviewer_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_legacy_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"legacy_status" "legacy_status" DEFAULT 'not_reviewed' NOT NULL,
	"rationale" text NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"methodology_version_id" uuid NOT NULL,
	"audience_score" real,
	"commercial_platform_score" real,
	"evidence_quality_score" real,
	"legacy_score" real,
	"film_success_score" real,
	"scoring_status" "scoring_status" NOT NULL,
	"coverage_percent" real NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_reception_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_metric" "reception_metric" NOT NULL,
	"scope" text DEFAULT 'film_wide' NOT NULL,
	"raw_value" real NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"approval_status" "approval_status" DEFAULT 'approved' NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	"release_type" "release_type" NOT NULL,
	"country_code" text,
	"release_date" date,
	"release_route" "release_route" DEFAULT 'unknown' NOT NULL,
	"is_eligible_telugu_release" boolean DEFAULT false NOT NULL,
	"is_re_release" boolean DEFAULT false NOT NULL,
	"source_id" uuid
);
--> statement-breakpoint
CREATE TABLE "film_titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"film_id" uuid NOT NULL,
	"title" text NOT NULL,
	"language_code" text NOT NULL,
	"script" text,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "films" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"canonical_title" text NOT NULL,
	"original_title" text,
	"original_language" text NOT NULL,
	"tmdb_movie_id" integer,
	"imdb_title_id" text,
	"wikidata_id" text,
	"runtime_minutes" integer,
	"release_route" "release_route" DEFAULT 'unknown' NOT NULL,
	"feature_type" "feature_type" DEFAULT 'feature' NOT NULL,
	"status" "film_status" DEFAULT 'in_review' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "films_slug_unique" UNIQUE("slug"),
	CONSTRAINT "films_tmdb_movie_id_unique" UNIQUE("tmdb_movie_id"),
	CONSTRAINT "films_imdb_title_id_unique" UNIQUE("imdb_title_id"),
	CONSTRAINT "films_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "hero_metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"methodology_version_id" uuid NOT NULL,
	"filter_window" "filter_window" NOT NULL,
	"eligible_film_count" integer NOT NULL,
	"scored_film_count" integer NOT NULL,
	"overall_success_ratio" real,
	"audience_index" real,
	"consistency_index" real,
	"social_reach_index" real,
	"momentum_index" real,
	"average_release_gap_months" real,
	"peak_films_in_year" integer,
	"films_per_active_year" real,
	"hero_performance_index" real,
	"evidence_coverage_percent" real NOT NULL,
	"confidence" "confidence_grade" NOT NULL,
	"detail" jsonb NOT NULL,
	"calculated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "methodology_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"version_name" text NOT NULL,
	"effective_from" date NOT NULL,
	"film_score_weights" jsonb NOT NULL,
	"hero_score_weights" jsonb NOT NULL,
	"vote_threshold_m" integer NOT NULL,
	"success_threshold" real NOT NULL,
	"parameters" jsonb NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "methodology_versions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"canonical_name" text NOT NULL,
	"display_name" text NOT NULL,
	"sex_or_scope_classification" text DEFAULT 'male_lead_scope' NOT NULL,
	"industry" "industry" DEFAULT 'telugu' NOT NULL,
	"person_status" "person_status" DEFAULT 'review' NOT NULL,
	"default_visibility" "default_visibility" DEFAULT 'review' NOT NULL,
	"tmdb_person_id" integer,
	"wikidata_id" text,
	"imdb_name_id" text,
	"bio_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_slug_unique" UNIQUE("slug"),
	CONSTRAINT "people_tmdb_person_id_unique" UNIQUE("tmdb_person_id"),
	CONSTRAINT "people_wikidata_id_unique" UNIQUE("wikidata_id"),
	CONSTRAINT "people_imdb_name_id_unique" UNIQUE("imdb_name_id")
);
--> statement-breakpoint
CREATE TABLE "person_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"language" text,
	"source_id" uuid
);
--> statement-breakpoint
CREATE TABLE "social_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"handle" text NOT NULL,
	"profile_url" text NOT NULL,
	"platform_user_id" text,
	"is_official" boolean DEFAULT false NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"social_profile_id" uuid NOT NULL,
	"followers_count" bigint,
	"subscribers_count" bigint,
	"following_count" bigint,
	"post_count" bigint,
	"verified_state" text,
	"snapshot_at" timestamp with time zone NOT NULL,
	"source_method" text NOT NULL,
	"raw_payload_hash" text,
	"raw_payload_reference" text
);
--> statement-breakpoint
CREATE TABLE "source_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"metric_key" text NOT NULL,
	"raw_value_text" text,
	"numeric_value" numeric,
	"numeric_low" numeric,
	"numeric_high" numeric,
	"unit" text,
	"language_scope" text,
	"territory_scope" text,
	"observed_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_url" text NOT NULL,
	"payload_hash" text,
	"confidence" "claim_confidence" DEFAULT 'medium' NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"source_name" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"base_url" text,
	"licensing_note" text,
	"reliability_tier" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "correction_submissions" ADD CONSTRAINT "correction_submissions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_submissions" ADD CONSTRAINT "correction_submissions_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_commercial_evidence" ADD CONSTRAINT "film_commercial_evidence_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_commercial_evidence" ADD CONSTRAINT "film_commercial_evidence_source_claim_id_source_claims_id_fk" FOREIGN KEY ("source_claim_id") REFERENCES "public"."source_claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_commercial_evidence" ADD CONSTRAINT "film_commercial_evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_credits" ADD CONSTRAINT "film_credits_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_credits" ADD CONSTRAINT "film_credits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_credits" ADD CONSTRAINT "film_credits_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_legacy_assessments" ADD CONSTRAINT "film_legacy_assessments_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_metric_snapshots" ADD CONSTRAINT "film_metric_snapshots_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_metric_snapshots" ADD CONSTRAINT "film_metric_snapshots_methodology_version_id_methodology_versions_id_fk" FOREIGN KEY ("methodology_version_id") REFERENCES "public"."methodology_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_reception_snapshots" ADD CONSTRAINT "film_reception_snapshots_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_reception_snapshots" ADD CONSTRAINT "film_reception_snapshots_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_releases" ADD CONSTRAINT "film_releases_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_releases" ADD CONSTRAINT "film_releases_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_titles" ADD CONSTRAINT "film_titles_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_metric_snapshots" ADD CONSTRAINT "hero_metric_snapshots_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_metric_snapshots" ADD CONSTRAINT "hero_metric_snapshots_methodology_version_id_methodology_versions_id_fk" FOREIGN KEY ("methodology_version_id") REFERENCES "public"."methodology_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_aliases" ADD CONSTRAINT "person_aliases_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_aliases" ADD CONSTRAINT "person_aliases_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_profiles" ADD CONSTRAINT "social_profiles_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_snapshots" ADD CONSTRAINT "social_snapshots_social_profile_id_social_profiles_id_fk" FOREIGN KEY ("social_profile_id") REFERENCES "public"."social_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_claims" ADD CONSTRAINT "source_claims_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "change_log_entity_idx" ON "change_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "change_log_time_idx" ON "change_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "corrections_status_idx" ON "correction_submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "film_commercial_film_idx" ON "film_commercial_evidence" USING btree ("film_id","metric_type");--> statement-breakpoint
CREATE UNIQUE INDEX "film_credits_film_person_uq" ON "film_credits" USING btree ("film_id","person_id");--> statement-breakpoint
CREATE INDEX "film_credits_person_idx" ON "film_credits" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "film_credits_eligibility_idx" ON "film_credits" USING btree ("eligibility_status","role_scope");--> statement-breakpoint
CREATE INDEX "film_legacy_film_idx" ON "film_legacy_assessments" USING btree ("film_id");--> statement-breakpoint
CREATE INDEX "film_metric_snapshots_idx" ON "film_metric_snapshots" USING btree ("methodology_version_id","calculated_at","film_id");--> statement-breakpoint
CREATE INDEX "film_reception_film_idx" ON "film_reception_snapshots" USING btree ("film_id","retrieved_at");--> statement-breakpoint
CREATE INDEX "film_releases_film_idx" ON "film_releases" USING btree ("film_id");--> statement-breakpoint
CREATE INDEX "film_releases_date_idx" ON "film_releases" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "film_releases_eligible_idx" ON "film_releases" USING btree ("is_eligible_telugu_release","language_code");--> statement-breakpoint
CREATE INDEX "film_titles_film_idx" ON "film_titles" USING btree ("film_id");--> statement-breakpoint
CREATE INDEX "films_status_idx" ON "films" USING btree ("status","feature_type");--> statement-breakpoint
CREATE INDEX "hero_snapshots_lookup_idx" ON "hero_metric_snapshots" USING btree ("methodology_version_id","filter_window","calculated_at");--> statement-breakpoint
CREATE INDEX "hero_snapshots_person_idx" ON "hero_metric_snapshots" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "hero_snapshots_hpi_idx" ON "hero_metric_snapshots" USING btree ("hero_performance_index");--> statement-breakpoint
CREATE INDEX "hero_snapshots_ratio_idx" ON "hero_metric_snapshots" USING btree ("overall_success_ratio");--> statement-breakpoint
CREATE INDEX "hero_snapshots_audience_idx" ON "hero_metric_snapshots" USING btree ("audience_index");--> statement-breakpoint
CREATE UNIQUE INDEX "methodology_single_active_uq" ON "methodology_versions" USING btree ("is_active") WHERE "methodology_versions"."is_active" = true;--> statement-breakpoint
CREATE INDEX "people_status_idx" ON "people" USING btree ("person_status","default_visibility");--> statement-breakpoint
CREATE INDEX "person_aliases_person_idx" ON "person_aliases" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_profiles_platform_handle_uq" ON "social_profiles" USING btree ("platform","handle");--> statement-breakpoint
CREATE INDEX "social_profiles_person_idx" ON "social_profiles" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "social_snapshots_profile_time_idx" ON "social_snapshots" USING btree ("social_profile_id","snapshot_at");--> statement-breakpoint
CREATE INDEX "source_claims_entity_idx" ON "source_claims" USING btree ("entity_type","entity_id","metric_key");--> statement-breakpoint
CREATE INDEX "source_claims_approval_idx" ON "source_claims" USING btree ("approval_status");