import type { HeroMetricKey } from "@/lib/calculations/engine";

export interface MetricMeta {
  key: HeroMetricKey;
  /** Plain-language name shown on charts. */
  label: string;
  /** Short name for buttons and table headers. */
  short: string;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
  /** Fixed axis maximum; undefined = derive from data. */
  domainMax?: number;
  /** One plain sentence: what the number means. */
  definition: string;
  /**
   * Minimum films with data before a hero is ranked on this metric, so that
   * 3-for-3 newcomers don't top a percentage chart.
   */
  minSample?: number;
}

export const MIN_SAMPLE_NOTE = (n: number) => `Only heroes with at least ${n} films with enough data are ranked.`;

export const METRICS: Record<HeroMetricKey, MetricMeta> = {
  overallSuccessRatio: {
    key: "overallSuccessRatio",
    label: "Success ratio",
    short: "Success ratio",
    unit: "%",
    decimals: 0,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Out of every 100 films with enough data, how many were hits.",
    minSample: 5,
  },
  hits: {
    key: "hits",
    label: "Hit films",
    short: "Hits",
    unit: "",
    decimals: 0,
    higherIsBetter: true,
    definition: "How many of the hero's films were hits.",
  },
  films: {
    key: "films",
    label: "Films as lead hero",
    short: "Films",
    unit: "",
    decimals: 0,
    higherIsBetter: true,
    definition: "Number of feature films released in Telugu with this hero as a lead.",
  },
  avgRating: {
    key: "avgRating",
    label: "Average audience rating",
    short: "Audience rating",
    unit: "/10",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 10,
    definition: "Simple average of the audience ratings (out of 10) of the hero's films.",
    minSample: 5,
  },
  recentSuccessRatio: {
    key: "recentSuccessRatio",
    label: "Recent success ratio (last 5 films)",
    short: "Recent success",
    unit: "%",
    decimals: 0,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Share of hits among the hero's latest five films with enough data.",
    minSample: 3,
  },
  peakFilms: {
    key: "peakFilms",
    label: "Most films in one year",
    short: "Most in a year",
    unit: "",
    decimals: 0,
    higherIsBetter: true,
    definition: "The highest number of the hero's films released in any single calendar year.",
  },
  releaseGap: {
    key: "releaseGap",
    label: "Average gap between films",
    short: "Gap between films",
    unit: " mo",
    decimals: 1,
    higherIsBetter: false,
    definition: "Typical number of months between one release and the next. Shorter means more frequent releases.",
  },
  filmsPerYear: {
    key: "filmsPerYear",
    label: "Films per year",
    short: "Films per year",
    unit: "",
    decimals: 1,
    higherIsBetter: true,
    definition: "Films divided by the number of years between the first and latest release.",
  },
  yearsActive: {
    key: "yearsActive",
    label: "Years active",
    short: "Years active",
    unit: " yrs",
    decimals: 0,
    higherIsBetter: true,
    definition: "Years from the first to the latest counted release (from 2000).",
  },
  hpi: {
    key: "hpi",
    label: "Overall score",
    short: "Overall score",
    unit: "/100",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition:
      "One combined score out of 100: film results 35%, audience ratings 25%, consistency 15%, social media reach 15%, recent form 10%.",
  },
  filmSuccess: {
    key: "filmSuccess",
    label: "Average film score",
    short: "Film score",
    unit: "/100",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Average of the hero's film scores (each film scored out of 100 from audience rating and box office / OTT result).",
  },
  audienceSuccessRatio: {
    key: "audienceSuccessRatio",
    label: "Audience-approved ratio",
    short: "Audience approved",
    unit: "%",
    decimals: 0,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Share of films that audiences rated well (adjusted rating of about 6.6/10 or more).",
  },
  audienceIndex: {
    key: "audienceIndex",
    label: "Audience score",
    short: "Audience score",
    unit: "/100",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Audience ratings turned into a score out of 100, giving more weight to films with many votes.",
  },
  consistency: {
    key: "consistency",
    label: "Consistency",
    short: "Consistency",
    unit: "/100",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "How steady the results are from film to film. 100 = every film does about equally well.",
  },
  socialReach: {
    key: "socialReach",
    label: "Social media reach",
    short: "Social reach",
    unit: "/100",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Followers on official social media profiles, turned into a score out of 100. Not a fan count.",
  },
  momentum: {
    key: "momentum",
    label: "Recent form",
    short: "Recent form",
    unit: "/100",
    decimals: 1,
    higherIsBetter: true,
    domainMax: 100,
    definition: "Latest five films compared with the hero's usual level. 50 = usual, above 50 = doing better lately.",
  },
};

/** Metrics offered on the main leaderboard, simplest first. */
export const LEADERBOARD_METRICS: HeroMetricKey[] = [
  "overallSuccessRatio",
  "hits",
  "films",
  "avgRating",
  "recentSuccessRatio",
  "peakFilms",
  "releaseGap",
  "hpi",
];

/** Metrics that can be put on a Pareto chart axis. */
export const AXIS_METRICS: HeroMetricKey[] = [
  "films",
  "hits",
  "overallSuccessRatio",
  "avgRating",
  "recentSuccessRatio",
  "peakFilms",
  "filmsPerYear",
  "releaseGap",
  "yearsActive",
  "hpi",
  "consistency",
  "socialReach",
];

export function formatMetric(key: HeroMetricKey, value: number | null | undefined, withUnit = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const m = METRICS[key];
  const n = value.toLocaleString("en-IN", { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals });
  return withUnit ? `${n}${m.unit}` : n;
}

/** Axis label with unit in words, e.g. "Success ratio (%)". */
export function axisLabel(key: HeroMetricKey): string {
  const m = METRICS[key];
  const unit = m.unit.trim();
  const unitText = unit === "%" ? "%" : unit === "/10" ? "out of 10" : unit === "/100" ? "out of 100" : unit === "mo" ? "months" : unit === "yrs" ? "years" : "";
  return unitText ? `${m.label} (${unitText})` : m.label;
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
