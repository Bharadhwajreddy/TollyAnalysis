import "server-only";
import { connection } from "next/server";
import { runEngine, type EngineOutput, type HeroSnapshot } from "@/lib/calculations/engine";
import { creditIneligibility } from "@/lib/calculations/eligibility";
import { METHODOLOGY, type MethodologyVersion } from "@/lib/constants/methodology";
import { INITIAL_ROSTER } from "@/lib/constants/roster";
import { generateDemoDataset } from "@/lib/data/demo/generate";
import type { Dataset, FilterWindow, Person } from "@/lib/domain/types";
import { DATA_MODE } from "@/lib/env";
import { toHeroView, type DashboardData, type DataMeta } from "@/lib/view-models";

/**
 * Single entry point for reading benchmark data.
 * - demo: synthetic dataset, computed in-process by the calculation engine.
 * - live: dataset + active methodology loaded from Postgres; hero metrics come from
 *   the latest persisted `hero_metric_snapshots` written by the recalculation job.
 */

interface Loaded {
  dataset: Dataset;
  methodology: MethodologyVersion;
  engine: EngineOutput;
  /** Persisted snapshots (live) or engine snapshots (demo). */
  snapshots: Record<FilterWindow, HeroSnapshot[]>;
  calculatedAt: string | null;
}

// Kept on globalThis so route handlers and pages (separate module instances) share one cache.
const cache = globalThis as unknown as { __taDemo?: Loaded; __taLive?: { at: number; value: Loaded } | null };
const LIVE_TTL_MS = 60_000;

export async function load(): Promise<Loaded> {
  if (DATA_MODE === "live") {
    // Live data must be read per request, never frozen into the static build.
    await connection();
    const hit = cache.__taLive;
    if (hit && Date.now() - hit.at < LIVE_TTL_MS) return hit.value;
    const { loadLive } = await import("./live");
    const value = await loadLive();
    cache.__taLive = { at: Date.now(), value };
    return value;
  }
  if (!cache.__taDemo) {
    const dataset = DATA_MODE === "real" ? (await import("@/lib/data/real/load")).buildRealDataset() : generateDemoDataset();
    const engine = runEngine(dataset, METHODOLOGY, `${dataset.asOf}T06:00:00Z`);
    cache.__taDemo = { dataset, methodology: METHODOLOGY, engine, snapshots: engine.snapshots, calculatedAt: engine.calculatedAt };
  }
  return cache.__taDemo;
}

export function invalidateCache() {
  cache.__taLive = null;
}

export async function getMeta(): Promise<DataMeta> {
  const l = await load();
  return {
    mode: l.dataset.mode,
    asOf: l.dataset.asOf,
    calculatedAt: l.calculatedAt,
    methodologyId: l.methodology.id,
    methodologyName: l.methodology.versionName,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const l = await load();
  const meta = await getMeta();
  const people = new Map(l.dataset.people.map((p) => [p.slug, p]));
  const roster = new Map(INITIAL_ROSTER.map((r) => [r.slug, r]));
  const personInfo = (slug: string) => ({
    family: people.get(slug)?.family ?? roster.get(slug)?.family ?? "other",
    debutYear: people.get(slug)?.debutYear ?? null,
  });
  const windows = Object.fromEntries(
    (Object.keys(l.snapshots) as FilterWindow[]).map((w) => [
      w,
      l.snapshots[w]
        .filter((s) => DATA_MODE !== "live" || s.confidence !== "insufficient")
        .map((s) => toHeroView(s, personInfo(s.slug))),
    ]),
  ) as DashboardData["windows"];
  return { ...meta, windows };
}

export async function getHeroSnapshots(window: FilterWindow, includeEmerging: boolean) {
  const l = await load();
  return l.snapshots[window].filter((s) => includeEmerging || !s.isEmerging);
}

export async function getPerson(slug: string): Promise<Person | null> {
  const l = await load();
  return l.dataset.people.find((p) => p.slug === slug) ?? null;
}

export interface FilmEvidenceRow {
  filmId: string;
  title: string;
  releaseDate: string | null;
  year: number | null;
  originalLanguage: string;
  teluguReleaseType: "original" | "dubbed";
  route: string;
  roleScope: string;
  coLeads: string[];
  audience: { rating: number; votes: number; adjusted: number; score: number; provider: string } | null;
  commercial: {
    score: number | null;
    basis: string | null;
    confidence: string | null;
    disputed: boolean;
    reason: string;
    label: string | null;
    grossCrore: number | null;
    budgetCrore: number | null;
    multiple: number | null;
  };
  details: import("@/lib/domain/types").FilmDetails | null;
  filmSuccessScore: number | null;
  indicativeScore: number | null;
  scoringStatus: string;
  coveragePercent: number;
  legacyStatus: string | null;
  sources: { id: string; name: string; url: string | null }[];
  isDemo: boolean;
}

export async function getHeroFilms(slug: string): Promise<FilmEvidenceRow[]> {
  const l = await load();
  const person = l.dataset.people.find((p) => p.slug === slug);
  if (!person) return [];
  const rows = l.engine.heroFilms.get(person.id) ?? [];
  const names = new Map(l.dataset.people.map((p) => [p.id, p.displayName]));
  const sources = new Map(l.dataset.sources.map((s) => [s.id, s]));
  return rows.map((r) => {
    const fm = l.engine.films.get(r.filmId)!;
    const f = fm.film;
    return {
      filmId: f.id,
      title: f.title,
      releaseDate: f.teluguRelease.releaseDate,
      year: f.teluguRelease.releaseDate ? Number(f.teluguRelease.releaseDate.slice(0, 4)) : null,
      originalLanguage: f.originalLanguage,
      teluguReleaseType: f.teluguRelease.releaseType,
      route: f.teluguRelease.route,
      roleScope: r.roleScope,
      coLeads: r.coLeadIds.map((id) => names.get(id) ?? id),
      audience: fm.audience
        ? {
            rating: fm.audience.rawRating,
            votes: fm.audience.voteCount,
            adjusted: fm.audience.adjustedRating,
            score: fm.audience.score,
            provider: fm.audience.provider,
          }
        : null,
      commercial: {
        score: fm.commercial.score,
        basis: fm.commercial.basis,
        confidence: fm.commercial.confidence,
        disputed: fm.commercial.disputed,
        reason: fm.commercial.reason,
        label: fm.commercial.label,
        grossCrore: fm.commercial.grossCrore,
        budgetCrore: fm.commercial.budgetCrore,
        multiple: fm.commercial.multiple,
      },
      details: f.details ?? null,
      filmSuccessScore: fm.success.score,
      indicativeScore: fm.success.indicativeScore,
      scoringStatus: fm.success.status,
      coveragePercent: fm.success.coveragePercent,
      legacyStatus: fm.legacyStatus,
      sources: fm.sourceIds.map((id) => ({ id, name: sources.get(id)?.name ?? id, url: sources.get(id)?.baseUrl ?? null })),
      isDemo: f.isDemo,
    };
  });
}

/** Registry: every person with eligible and excluded credit counts. */
export async function getRegistry() {
  const l = await load();
  const filmById = new Map(l.dataset.films.map((f) => [f.id, f]));
  return l.dataset.people.map((p) => {
    const credits = l.dataset.credits.filter((c) => c.personId === p.id);
    const excluded = credits
      .map((c) => ({ c, reason: creditIneligibility(c, filmById.get(c.filmId)!) }))
      .filter((x) => x.reason !== null)
      .map((x) => ({ title: filmById.get(x.c.filmId)!.title, roleScope: x.c.roleScope, reason: x.reason as string, note: x.c.evidenceNote }));
    const eligible = l.engine.heroFilms.get(p.id)?.length ?? 0;
    return {
      slug: p.slug,
      name: p.displayName,
      industry: p.industry,
      status: p.status,
      visibility: p.visibility,
      eligibleLeadFilms: eligible,
      tier: eligible >= l.methodology.minEligibleFilmsForDefaultRoster ? "default" : eligible > 0 ? "emerging" : "unverified",
      excluded,
    };
  });
}

export async function getSources() {
  const l = await load();
  const usage = new Map<string, number>();
  for (const r of l.dataset.reception) usage.set(r.sourceId, (usage.get(r.sourceId) ?? 0) + 1);
  for (const c of l.dataset.commercial) usage.set(c.sourceId, (usage.get(c.sourceId) ?? 0) + 1);
  return l.dataset.sources.map((s) => ({ ...s, claimCount: usage.get(s.id) ?? 0 }));
}

export async function getChangeLog() {
  const l = await load();
  const { listChangeLog } = await import("./corrections");
  const extra = await listChangeLog();
  return [...extra, ...l.dataset.changeLog].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMethodology() {
  return (await load()).methodology;
}

/** Coverage / missing data summary across all eligible films. */
export async function getCoverage() {
  const l = await load();
  const eligibleFilmIds = new Set([...l.engine.heroFilms.values()].flat().map((r) => r.filmId));
  const films = [...eligibleFilmIds].map((id) => l.engine.films.get(id)!);
  const count = (pred: (f: (typeof films)[number]) => boolean) => films.filter(pred).length;
  const statuses = ["scored", "provisional", "insufficient_evidence", "not_yet_final"] as const;
  return {
    totalFilms: films.length,
    byStatus: Object.fromEntries(statuses.map((s) => [s, count((f) => f.success.status === s)])) as Record<(typeof statuses)[number], number>,
    withAudience: count((f) => f.audience !== null),
    withCommercial: count((f) => f.commercial.score !== null),
    dubbed: count((f) => f.film.teluguRelease.releaseType === "dubbed"),
    dubbedAllLanguageOnly: count((f) => f.commercial.ignoredAllLanguageOnly),
    ott: count((f) => f.film.teluguRelease.route === "ott"),
    ottUnknownPlatform: count((f) => f.film.teluguRelease.route === "ott" && f.commercial.score === null),
    disputed: count((f) => f.commercial.disputed),
    legacyReviewed: count((f) => f.legacyStatus !== null),
  };
}

/** Year-level aggregates for the Trends view (no film titles). */
export async function getTrends() {
  const l = await load();
  const byYear = new Map<number, { releases: number; scores: number[]; audience: number[]; ott: number; dubbed: number; original: number }>();
  const seen = new Set<string>();
  for (const rows of l.engine.heroFilms.values())
    for (const r of rows) {
      if (seen.has(r.filmId)) continue;
      seen.add(r.filmId);
      const fm = l.engine.films.get(r.filmId)!;
      const y = Number(fm.film.teluguRelease.releaseDate!.slice(0, 4));
      const e = byYear.get(y) ?? { releases: 0, scores: [], audience: [], ott: 0, dubbed: 0, original: 0 };
      e.releases++;
      if (fm.success.score !== null) e.scores.push(fm.success.score);
      if (fm.audience) e.audience.push(fm.audience.score);
      // Exclusive buckets: direct-to-OTT first, then dubbed theatrical, then original theatrical.
      if (fm.film.teluguRelease.route === "ott") e.ott++;
      else if (fm.film.teluguRelease.releaseType === "dubbed") e.dubbed++;
      else e.original++;
      byYear.set(y, e);
    }
  const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
  const years = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, e]) => ({
      year,
      releases: e.releases,
      original: e.original,
      dubbed: e.dubbed,
      ott: e.ott,
      avgFilmSuccess: avg(e.scores),
      avgAudience: avg(e.audience),
    }));

  // Per-hero yearly Film Success averages (for the hero trend lines).
  const heroYearly: Record<string, { year: number; avg: number | null; releases: number }[]> = {};
  for (const p of l.dataset.people) {
    const rows = l.engine.heroFilms.get(p.id);
    if (!rows?.length) continue;
    const m = new Map<number, number[]>();
    const c = new Map<number, number>();
    for (const r of rows) {
      const fm = l.engine.films.get(r.filmId)!;
      const y = Number(fm.film.teluguRelease.releaseDate!.slice(0, 4));
      c.set(y, (c.get(y) ?? 0) + 1);
      if (fm.success.score !== null) m.set(y, [...(m.get(y) ?? []), fm.success.score]);
    }
    heroYearly[p.slug] = [...c.keys()].sort().map((y) => ({ year: y, avg: avg(m.get(y) ?? []), releases: c.get(y)! }));
  }
  return { years, heroYearly };
}

/** Appearances that were found but do not count (cameos, supporting roles, other languages…). */
export async function getHeroExcluded(slug: string) {
  const l = await load();
  const person = l.dataset.people.find((p) => p.slug === slug);
  if (!person) return [];
  const films = new Map(l.dataset.films.map((f) => [f.id, f]));
  return l.dataset.credits
    .filter((c) => c.personId === person.id && c.eligibilityStatus !== "approved")
    .map((c) => {
      const f = films.get(c.filmId);
      return {
        title: f?.title ?? c.filmId,
        year: f?.teluguRelease.releaseDate ? Number(f.teluguRelease.releaseDate.slice(0, 4)) : null,
        reason: c.evidenceNote ?? c.roleScope,
        article: f?.details?.wikiArticle ?? null,
      };
    })
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}
