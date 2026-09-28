-- Row Level Security for Supabase.
-- Apply AFTER `npm run db:migrate`, e.g. in the Supabase SQL editor.
--
-- The Next.js server connects with the database owner role (DATABASE_URL) and is the
-- only writer; it enforces admin auth itself. These policies protect data if the
-- public anon/authenticated keys are ever used directly against the database:
--   * public (anon) can read only approved / public records;
--   * nobody except the service role / owner can write;
--   * correction submissions (including emails) are never readable publicly.

do $$
declare t text;
begin
  foreach t in array array[
    'sources','people','person_aliases','films','film_releases','film_titles','film_credits',
    'social_profiles','social_snapshots','source_claims','film_reception_snapshots',
    'film_commercial_evidence','film_legacy_assessments','methodology_versions',
    'film_metric_snapshots','hero_metric_snapshots','correction_submissions','change_log','user_rankings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Public read policies (approved/public data only).
create policy public_read_sources on public.sources for select using (true);
create policy public_read_people on public.people for select using (default_visibility in ('public','emerging_only') and person_status <> 'excluded');
create policy public_read_aliases on public.person_aliases for select using (true);
create policy public_read_films on public.films for select using (status = 'released');
create policy public_read_releases on public.film_releases for select using (true);
create policy public_read_titles on public.film_titles for select using (true);
create policy public_read_credits on public.film_credits for select using (eligibility_status = 'approved');
create policy public_read_profiles on public.social_profiles for select using (is_official and active);
create policy public_read_social on public.social_snapshots for select using (true);
create policy public_read_claims on public.source_claims for select using (approval_status = 'approved');
create policy public_read_reception on public.film_reception_snapshots for select using (approval_status = 'approved');
create policy public_read_commercial on public.film_commercial_evidence for select using (evidence_status = 'approved');
create policy public_read_legacy on public.film_legacy_assessments for select using (approval_status = 'approved');
create policy public_read_methodology on public.methodology_versions for select using (true);
create policy public_read_film_metrics on public.film_metric_snapshots for select using (true);
create policy public_read_hero_metrics on public.hero_metric_snapshots for select using (true);
create policy public_read_change_log on public.change_log for select using (true);
-- correction_submissions and user_rankings: no public policy at all → private by default
-- (the app aggregates fan votes server-side).

-- Optional (Supabase only — needs the auth schema): allow signed-in Supabase admins (listed in app_admins) to read the queue directly.
create table if not exists public.app_admins (user_id uuid primary key, created_at timestamptz not null default now());
alter table public.app_admins enable row level security;
create policy admins_read_corrections on public.correction_submissions for select
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));
