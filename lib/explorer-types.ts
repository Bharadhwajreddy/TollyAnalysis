/** Client-safe shapes and column definitions for the Index explorer, the Heroes ledger and Compare. */
import type { FilmDot, Outcome } from "@/lib/ledger-types";

export type PillarKey = "audience" | "boxoffice" | "recent" | "fame" | "career";
export type Win = "all_time" | "last_5_years" | "last_10_films";

/** The parts of the Tolly Index, in reading order. Values are 0–100; the recipe is not published. */
export const PILLARS: { key: PillarKey; label: string; short: string; hint: string }[] = [
  { key: "audience", label: "Audience", short: "Aud.", hint: "How audiences rate, share and still look up his films (0–100)" },
  { key: "boxoffice", label: "Box office", short: "B.O.", hint: "How often and how big his films hit (0–100)" },
  { key: "recent", label: "Form", short: "Form", hint: "How his latest films are doing (0–100)" },
  { key: "fame", label: "Fame", short: "Fame", hint: "Official follower reach on a log scale (0–100)" },
  { key: "career", label: "Career", short: "Car.", hint: "How long, busy and steady his career is (0–100)" },
];

/** Numbers per time window, from the career engine (the measures the old Rankings and Star Score pages had). */
export const WINDOWED_KEYS = [
  "starScore",
  "overallSuccessRatio",
  "hits",
  "blockbusters",
  "bigFilms",
  "totalGross",
  "topGross",
  "avgGross",
  "recentSuccessRatio",
  "films",
  "yearsActive",
  "filmsPerYear",
  "peakFilms",
  "releaseGap",
  "consistency",
  "momentum",
  "filmSuccess",
  "audienceIndex",
  "audienceSuccessRatio",
  "socialReach",
  "xFollowers",
  "igFollowers",
] as const;
export type WindowedKey = (typeof WINDOWED_KEYS)[number];

export interface FilmRef {
  slug: string;
  title: string;
  year: number;
  o: Outcome;
}

export interface ExplorerHero {
  slug: string;
  name: string;
  img: string | null;
  rank: number | null;
  index: number | null;
  band: number | null;
  pillars: Record<PillarKey, number | null>;
  industry: string;
  family: string;
  debut: number | null;
  films: number;
  judged: number;
  hits: number;
  blockbusters: number;
  hitRate: number | null;
  gross: number | null;
  grossFilms: number;
  topGross: number | null;
  bigFilms: number;
  followers: number | null;
  yearsActive: number | null;
  releaseGap: number | null;
  peakFilms: number | null;
  recentHits: number | null;
  recentJudged: number | null;
  best: FilmRef | null;
  biggest: FilmRef | null;
  /** Why he has no index (plain words), or null when ranked. */
  reason: string | null;
  /** Fully scored films out of those with a known result (the ranking gate). */
  complete: number;
  completeOf: number;
  w: Record<Win, Record<WindowedKey, number | null>>;
  dots?: FilmDot[];
}

export const WINDOWS: { value: Win; label: string }[] = [
  { value: "all_time", label: "All time" },
  { value: "last_5_years", label: "Last 5 years" },
  { value: "last_10_films", label: "Last 10 films" },
];

export type Fmt = "score" | "pct" | "int" | "inr" | "dec" | "months" | "years" | "millions";

/** A windowed measure as a table column. */
export interface WindowedCol {
  key: WindowedKey;
  label: string;
  unit?: string;
  fmt: Fmt;
  asc?: boolean;
  hint: string;
}

/** The box-office numbers (what the Star Score page used to show), per window. */
export const BOXOFFICE_COLS: WindowedCol[] = [
  { key: "starScore", label: "Box office score", unit: "0–100", fmt: "score", hint: "One number out of 100 from his hits, grosses, recent results, reach and film count in this period" },
  { key: "overallSuccessRatio", label: "Success", unit: "%", fmt: "pct", hint: "Hits out of every 100 films with a known result" },
  { key: "blockbusters", label: "Block­busters", fmt: "int", hint: "Films that earned at least 3× their budget, or were reported as blockbusters" },
  { key: "bigFilms", label: "₹100-cr films", fmt: "int", hint: "Films that grossed ₹100 crore or more worldwide" },
  { key: "totalGross", label: "Total gross", unit: "₹ cr", fmt: "inr", hint: "Reported worldwide gross of all his films added together" },
  { key: "topGross", label: "Biggest film", unit: "₹ cr", fmt: "inr", hint: "Reported worldwide gross of his biggest film" },
  { key: "avgGross", label: "Per film", unit: "₹ cr", fmt: "inr", hint: "Average reported gross of his films that have one" },
  { key: "recentSuccessRatio", label: "Recent success", unit: "%", fmt: "pct", hint: "Hits among his latest five films with a known result" },
];

/** Career, audience and reach measures, per window. */
export const CAREER_COLS: WindowedCol[] = [
  { key: "films", label: "Films", fmt: "int", hint: "Films as lead hero in this period" },
  { key: "filmsPerYear", label: "Per year", fmt: "dec", hint: "Films divided by the years between his first and latest release" },
  { key: "peakFilms", label: "Most in a year", fmt: "int", hint: "His most releases in one calendar year" },
  { key: "releaseGap", label: "Gap", unit: "months", fmt: "months", asc: true, hint: "Typical months between one release and the next (shorter first)" },
  { key: "consistency", label: "Consistency", unit: "0–100", fmt: "score", hint: "How steady his results are from film to film" },
  { key: "momentum", label: "Recent form", unit: "0–100", fmt: "score", hint: "Latest five films against his usual level; 50 = usual" },
  { key: "filmSuccess", label: "Film score", unit: "0–100", fmt: "score", hint: "Average of his film scores" },
  { key: "audienceIndex", label: "Audience score", unit: "0–100", fmt: "score", hint: "Audience response turned into a score out of 100" },
  { key: "audienceSuccessRatio", label: "Audience approved", unit: "%", fmt: "pct", hint: "Share of his films that audiences rated well" },
  { key: "socialReach", label: "Social reach", unit: "0–100", fmt: "score", hint: "Official X and Instagram followers on a log scale" },
];

const IN = new Intl.NumberFormat("en-IN");
/** Cell formatting: units live in the column header, so cells are bare numbers. */
export function fmtCell(v: number | null | undefined, f: Fmt): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  switch (f) {
    case "score":
      return v.toFixed(1);
    case "pct":
      return String(Math.round(v));
    case "int":
      return IN.format(Math.round(v));
    case "inr":
      return IN.format(v < 10 ? Math.round(v * 10) / 10 : Math.round(v));
    case "dec":
    case "months":
    case "millions":
      return v.toFixed(1);
    case "years":
      return String(Math.round(v));
  }
}

/** Measures a scatter axis can show (all time). `log` for money that spans orders of magnitude. */
export interface AxisDef {
  key: string;
  label: string;
  unit: string;
  log?: boolean;
  asc?: boolean;
  cap?: number;
  get: (h: ExplorerHero) => number | null;
  fmt: (v: number) => string;
}

const inrFmt = (v: number) => `₹${IN.format(v < 10 ? Math.round(v * 10) / 10 : Math.round(v))} cr`;
export const AXES: AxisDef[] = [
  { key: "index", label: "Tolly Index", unit: "0–100", cap: 100, get: (h) => h.index, fmt: (v) => v.toFixed(1) },
  ...PILLARS.map((p) => ({ key: p.key, label: p.label, unit: "0–100", cap: 100, get: (h: ExplorerHero) => h.pillars[p.key], fmt: (v: number) => v.toFixed(1) })),
  { key: "hitRate", label: "Hit rate", unit: "%", cap: 100, get: (h) => h.hitRate, fmt: (v) => `${Math.round(v)}%` },
  { key: "hits", label: "Hits", unit: "films", get: (h) => h.hits, fmt: (v) => String(Math.round(v)) },
  { key: "films", label: "Films", unit: "since 2000", get: (h) => h.films, fmt: (v) => String(Math.round(v)) },
  { key: "gross", label: "Reported gross", unit: "₹ cr, log", log: true, get: (h) => h.gross, fmt: inrFmt },
  { key: "topGross", label: "Biggest film", unit: "₹ cr, log", log: true, get: (h) => h.topGross, fmt: inrFmt },
  { key: "perFilm", label: "Gross per film", unit: "₹ cr, log", log: true, get: (h) => (h.gross && h.grossFilms ? h.gross / h.grossFilms : null), fmt: inrFmt },
  { key: "followers", label: "Followers", unit: "millions, log", log: true, get: (h) => (h.followers ? h.followers / 1e6 : null), fmt: (v) => `${v >= 10 ? Math.round(v) : v.toFixed(1)}M` },
];
