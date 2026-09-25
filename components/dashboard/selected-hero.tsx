"use client";

import Link from "next/link";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { formatMetric, INDUSTRY_LABEL, METRICS } from "@/lib/constants/metrics";
import type { HeroView } from "@/lib/view-models";
import { ConfidenceBadge, Pill } from "@/components/ui/badges";

const SUMMARY_METRICS: HeroMetricKey[] = [
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

function medianOf(heroes: HeroView[], key: HeroMetricKey): number | null {
  const v = heroes.map((h) => h.m[key].v).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function SelectedHero({
  hero,
  cohort,
  rank,
  inCompare,
  onToggleCompare,
  compareFull,
}: {
  hero: HeroView | null;
  cohort: HeroView[];
  rank: number | null;
  inCompare: boolean;
  onToggleCompare: () => void;
  compareFull: boolean;
}) {
  if (!hero) {
    return <p className="text-sm text-muted">Select a hero from any chart, bar or table row to see a summary.</p>;
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full font-serif text-lg font-bold text-white"
            style={{ background: INDUSTRY_COLOR[hero.industry] }}
          >
            {hero.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <p className="font-serif text-2xl font-semibold leading-tight text-ink">{hero.name}</p>
            <p className="text-[13px] text-ink-2">
              {INDUSTRY_LABEL[hero.industry]} · {hero.firstYear ?? "—"}–{hero.lastYear ?? "—"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ConfidenceBadge grade={hero.confidence} />
          {hero.isEmerging && <Pill tone="teal">Emerging (&lt;3 lead films)</Pill>}
          {rank && <Pill tone="wine">#{rank} by HPI</Pill>}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <dt className="text-muted">Lead films (window)</dt>
          <dd className="tabular text-right font-medium">{hero.eligible}</dd>
          <dt className="text-muted">Career lead films</dt>
          <dd className="tabular text-right font-medium">{hero.careerFilms}</dd>
          <dt className="text-muted">Scored</dt>
          <dd className="tabular text-right font-medium">{hero.scored}</dd>
          <dt className="text-muted">Co-lead titles</dt>
          <dd className="tabular text-right font-medium">{hero.coLead}</dd>
          <dt className="text-muted">Telugu-dubbed titles</dt>
          <dd className="tabular text-right font-medium">{hero.dubbed}</dd>
          <dt className="text-muted">Direct-to-OTT titles</dt>
          <dd className="tabular text-right font-medium">{hero.ott}</dd>
          <dt className="text-muted">Evidence coverage</dt>
          <dd className="tabular text-right font-medium">{hero.coverage}%</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleCompare}
            disabled={!inCompare && compareFull}
            className={`rounded-md px-3 py-2 text-[13px] font-semibold ${
              inCompare ? "border border-wine text-wine" : "bg-wine text-white hover:bg-wine-hover disabled:opacity-50"
            }`}
          >
            {inCompare ? "Remove from compare" : "Add to compare"}
          </button>
          <Link
            href={`/annexure/heroes/${hero.slug}`}
            className="rounded-md border border-line px-3 py-2 text-[13px] font-semibold text-ink hover:border-ink-2"
          >
            Filmography &amp; evidence →
          </Link>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-2">Versus roster median (current filters)</p>
        <ul className="space-y-2.5">
          {SUMMARY_METRICS.map((key) => {
            const meta = METRICS[key];
            const mv = hero.m[key];
            const med = medianOf(cohort, key);
            const max = meta.domainMax ?? Math.max(1, ...cohort.map((h) => h.m[key].v ?? 0)) * 1.1;
            const pct = mv.v === null ? 0 : Math.min(100, (mv.v / max) * 100);
            const medPct = med === null ? null : Math.min(100, (med / max) * 100);
            const better = mv.v !== null && med !== null && (meta.higherIsBetter ? mv.v >= med : mv.v <= med);
            return (
              <li key={key} className="grid grid-cols-[132px_1fr_64px] items-center gap-3 sm:grid-cols-[180px_1fr_72px]">
                <span className="truncate text-[13px] text-ink-2" title={meta.definition}>
                  {meta.label}
                </span>
                <span className="relative h-3 rounded-full bg-surface-2 ring-1 ring-line">
                  <span
                    className="chart-mark absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${pct}%`, background: INDUSTRY_COLOR[hero.industry] }}
                  />
                  {medPct !== null && (
                    <span
                      className="absolute -top-1 h-5 w-0.5 bg-ink"
                      style={{ left: `calc(${medPct}% - 1px)` }}
                      title={`Median ${formatMetric(key, med)}`}
                    />
                  )}
                </span>
                <span className="tabular text-right text-[13px] font-semibold text-ink">
                  {formatMetric(key, mv.v)}
                  {mv.v !== null && med !== null && (
                    <span className={`ml-1 text-[10px] ${better ? "text-good" : "text-bad"}`} aria-label={better ? "better than median" : "below median"}>
                      {better ? "▲" : "▼"}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Black tick = roster median. ▲/▼ = better/worse than median (for release gap, lower is better). Film titles, per-film
          evidence and sources are in the Annexure.
        </p>
      </div>
    </div>
  );
}
