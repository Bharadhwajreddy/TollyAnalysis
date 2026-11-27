/** Shared (client-safe) types and helpers for the film ledger. */

/** How a film did at the box office, on one ramp. "recent" = too new to judge; "ott" = straight to streaming. */
export type Outcome = "blockbuster" | "hit" | "average" | "flop" | "disaster" | "unknown" | "recent" | "ott";

export interface FilmAtom {
  id: string;
  slug: string;
  title: string;
  /** Exact release date (null when only the year is known). */
  date: string | null;
  year: number;
  outcome: Outcome;
  /** Fine reported verdict (super_hit, below_average…) or the coarse label. */
  verdict: string | null;
  gross: number | null;
  budget: number | null;
  /** Film score (0–100) when complete. */
  score: number | null;
  heroes: { slug: string; name: string }[];
  director: { slug: string | null; name: string } | null;
  language: string;
  dubbed: boolean;
  route: string;
}

/** A film as sent to client charts (short keys keep the payload small). */
export interface FilmDot {
  s: string;
  t: string;
  dt: string | null;
  y: number;
  o: Outcome;
  g: number | null;
  v: string | null;
  sc: number | null;
  d: string | null;
  ds: string | null;
  h: string[];
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  blockbuster: "Blockbuster",
  hit: "Hit",
  average: "Average",
  flop: "Flop",
  disaster: "Disaster",
  unknown: "Result not reported",
  recent: "Too recent to judge",
  ott: "Direct to OTT",
};

export const VERDICT_LABEL: Record<string, string> = {
  blockbuster: "Blockbuster",
  super_hit: "Super hit",
  hit: "Hit",
  above_average: "Above average",
  average: "Average",
  below_average: "Below average",
  flop: "Flop",
  disaster: "Disaster",
};

export const OUTCOME_VAR: Record<Outcome, string> = {
  blockbuster: "var(--v-blockbuster)",
  hit: "var(--v-hit)",
  average: "var(--v-average)",
  flop: "var(--v-flop)",
  disaster: "var(--v-disaster)",
  unknown: "var(--v-unknown)",
  recent: "var(--v-unknown)",
  ott: "var(--v-unknown)",
};

/** Legend order, best to worst. */
export const OUTCOME_ORDER: Outcome[] = ["blockbuster", "hit", "average", "flop", "disaster", "unknown"];

export const filmHref = (slug: string) => `/film/${slug}`;
export const heroHref = (slug: string) => `/hero/${slug}`;
export const directorHref = (slug: string) => `/director/${slug}`;
