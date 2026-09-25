import type { HeroMetricKey, HeroSnapshot } from "@/lib/calculations/engine";
import type { MetricStatus } from "@/lib/calculations/result";
import type { ConfidenceGrade, FilterWindow, Industry } from "@/lib/domain/types";

/** Compact, serialisable metric for client components. */
export interface MetricView {
  v: number | null;
  n: number;
  d: number;
  p: number;
  s: MetricStatus;
  e: string;
}

export interface HeroView {
  slug: string;
  name: string;
  industry: Industry;
  isEmerging: boolean;
  careerFilms: number;
  eligible: number;
  scored: number;
  coLead: number;
  dubbed: number;
  ott: number;
  firstYear: number | null;
  lastYear: number | null;
  confidence: ConfidenceGrade;
  coverage: number;
  audienceCoverage: number;
  commercialCoverage: number;
  socialSnapshotAt: string | null;
  m: Record<HeroMetricKey, MetricView>;
}

export interface DataMeta {
  mode: "demo" | "live";
  asOf: string;
  calculatedAt: string | null;
  methodologyId: string;
  methodologyName: string;
}

export interface DashboardData extends DataMeta {
  windows: Record<FilterWindow, HeroView[]>;
}

export function toHeroView(s: HeroSnapshot): HeroView {
  const m = Object.fromEntries(
    Object.entries(s.metrics).map(([k, r]) => [
      k,
      { v: r.value, n: r.coverage.numerator, d: r.coverage.denominator, p: r.coverage.percent, s: r.status, e: r.explanation },
    ]),
  ) as Record<HeroMetricKey, MetricView>;
  return {
    slug: s.slug,
    name: s.name,
    industry: s.industry,
    isEmerging: s.isEmerging,
    careerFilms: s.careerFilmCount,
    eligible: s.eligibleFilmCount,
    scored: s.scoredFilmCount,
    coLead: s.coLeadFilmCount,
    dubbed: s.dubbedFilmCount,
    ott: s.ottFilmCount,
    firstYear: s.firstYear,
    lastYear: s.lastYear,
    confidence: s.confidence,
    coverage: s.evidenceCoveragePercent,
    audienceCoverage: s.audienceCoveragePercent,
    commercialCoverage: s.commercialCoveragePercent,
    socialSnapshotAt: s.socialSnapshotAt,
    m,
  };
}
