import type { HeroMetricKey } from "@/lib/calculations/engine";

export interface MetricMeta {
  key: HeroMetricKey;
  label: string;
  short: string;
  unit: "" | "%" | " mo" | "/yr" | " films";
  decimals: number;
  higherIsBetter: boolean;
  /** Axis maximum for index-style metrics; undefined = derive from data. */
  domainMax?: number;
  definition: string;
}

export const METRICS: Record<HeroMetricKey, MetricMeta> = {
  hpi: {
    key: "hpi",
    label: "Hero Performance Index",
    short: "HPI",
    unit: "",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition:
      "Transparent benchmark: 35% Film Success, 25% Audience Reception, 15% Consistency, 15% Verified Social Reach, 10% Recent Momentum. Configurable, not objective fact.",
  },
  filmSuccess: {
    key: "filmSuccess",
    label: "Film Success Index",
    short: "Film success",
    unit: "",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Coverage-weighted mean Film Success Score across scored lead films.",
  },
  overallSuccessRatio: {
    key: "overallSuccessRatio",
    label: "Overall Success Ratio",
    short: "Success ratio",
    unit: "%",
    decimals: 0,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Share of scored lead films with a Film Success Score of 60 or more. Films without enough evidence are excluded from the denominator.",
  },
  audienceSuccessRatio: {
    key: "audienceSuccessRatio",
    label: "Audience Success Ratio",
    short: "Audience ratio",
    unit: "%",
    decimals: 0,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Share of films with audience evidence whose adjusted audience score is 60 or more.",
  },
  audienceIndex: {
    key: "audienceIndex",
    label: "Audience Reception Index",
    short: "Audience",
    unit: "",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition:
      "Vote-confidence-weighted average of Bayesian-adjusted, film-wide audience ratings. Not raw IMDb score; not Telugu-audience-only.",
  },
  consistency: {
    key: "consistency",
    label: "Consistency Index",
    short: "Consistency",
    unit: "",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "100 minus normalised spread of Film Success Scores. Needs 3+ scored films.",
  },
  socialReach: {
    key: "socialReach",
    label: "Verified Social Reach Index",
    short: "Social reach",
    unit: "",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Official-profile public reach only, log-scaled, with snapshot date. Not a fan count.",
  },
  momentum: {
    key: "momentum",
    label: "Recent Career Momentum",
    short: "Momentum",
    unit: "",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Latest five scored titles (recency-weighted) versus career baseline. 50 = on baseline.",
  },
  releaseGap: {
    key: "releaseGap",
    label: "Average Release Gap",
    short: "Release gap",
    unit: " mo",
    decimals: 1,
    higherIsBetter: false,
    definition: "Median months between consecutive eligible release dates. Lower means more frequent releases.",
  },
  peakFilms: {
    key: "peakFilms",
    label: "Peak Films in One Year",
    short: "Peak films/yr",
    unit: " films",
    decimals: 0,
    higherIsBetter: true,
    definition: "Highest number of eligible lead releases in any single calendar year.",
  },
  filmsPerYear: {
    key: "filmsPerYear",
    label: "Films per Active Year",
    short: "Films/active yr",
    unit: "/yr",
    decimals: 2,
    higherIsBetter: true,
    definition: "Eligible lead films ÷ inclusive years between first and last eligible release (minimum 1).",
  },
};

export const LEADERBOARD_METRICS: HeroMetricKey[] = [
  "hpi",
  "overallSuccessRatio",
  "audienceIndex",
  "consistency",
  "socialReach",
  "momentum",
  "releaseGap",
  "peakFilms",
  "filmsPerYear",
];

export const CADENCE_METRICS: HeroMetricKey[] = ["releaseGap", "peakFilms", "filmsPerYear"];
export const BUBBLE_METRICS: HeroMetricKey[] = ["overallSuccessRatio", "socialReach", "momentum"];

export function formatMetric(key: HeroMetricKey, value: number | null | undefined, withUnit = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const m = METRICS[key];
  const n = value.toLocaleString("en-IN", { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals });
  return withUnit ? `${n}${m.unit}` : n;
}

export const INDUSTRY_LABEL: Record<string, string> = {
  telugu: "Telugu",
  tamil: "Tamil",
  malayalam: "Malayalam",
  kannada: "Kannada",
  hindi: "Hindi",
};

export const WINDOW_LABEL = {
  all_time: "All time",
  last_5_years: "Last 5 years",
  last_10_films: "Last 10 films",
} as const;
