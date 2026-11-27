import type { LedgerMetric } from "@/components/charts/ledger";

/** The metrics a hero Ledger can sort by (the Tolly Index and the numbers behind it). */
export const HERO_METRICS: LedgerMetric[] = [
  { key: "index", label: "Tolly Index", domain: [30, 80], fmt: "score", hint: "One score out of 100: audience, box office, form, fame and career" },
  { key: "audience", label: "Audience", domain: [20, 90], fmt: "score", hint: "How audiences rate, share and still look up his films (0–100)" },
  { key: "hitRate", label: "Hit rate", domain: [0, 100], fmt: "pct", hint: "Share of his films with a known result that were hits or better" },
  { key: "gross", label: "Box office", domain: [0, 6000], fmt: "inr", hint: "Total reported worldwide gross of his films" },
  { key: "films", label: "Films", domain: [0, 60], fmt: "int", hint: "Films as lead since 2000" },
  { key: "fame", label: "Fame", domain: [0, 100], fmt: "score", hint: "Official follower reach, 0–100 (log scale)" },
];

export const DIRECTOR_METRICS: LedgerMetric[] = [
  { key: "hitRate", label: "Hit rate", domain: [0, 100], fmt: "pct", hint: "Hits among films with a known result (ranked from 4 such films)" },
  { key: "hits", label: "Hits", domain: [0, 20], fmt: "int" },
  { key: "films", label: "Films", domain: [0, 40], fmt: "int" },
  { key: "gross", label: "Box office", domain: [0, 6000], fmt: "inr", hint: "Total reported worldwide gross" },
];
