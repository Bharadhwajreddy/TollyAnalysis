"use client";

import type { HeroMetricKey } from "@/lib/calculations/engine";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { formatMetric, INDUSTRY_LABEL, METRICS } from "@/lib/constants/metrics";
import type { Industry } from "@/lib/domain/types";
import type { HeroView } from "@/lib/view-models";
import { ConfidenceBadge } from "@/components/ui/badges";

/** Heroes with a value for `key`, best first (ascending for lower-is-better metrics). */
export function rankBy(heroes: HeroView[], key: HeroMetricKey): HeroView[] {
  const dir = METRICS[key].higherIsBetter ? -1 : 1;
  return heroes
    .filter((h) => h.m[key].v !== null)
    .sort((a, b) => dir * ((a.m[key].v as number) - (b.m[key].v as number)) || a.name.localeCompare(b.name));
}

export function MetricTooltip({ hero, metric }: { hero: HeroView; metric: HeroMetricKey }) {
  const mv = hero.m[metric];
  const meta = METRICS[metric];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: INDUSTRY_COLOR[hero.industry] }} aria-hidden />
        <span className="font-semibold text-ink">{hero.name}</span>
        <span className="text-muted">· {INDUSTRY_LABEL[hero.industry]}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ink-2">{meta.label}</span>
        <span className="tabular text-sm font-semibold text-ink">{formatMetric(metric, mv.v)}</span>
      </div>
      <p className="leading-snug text-muted">{meta.definition}</p>
      <p className="leading-snug text-ink-2">{mv.e}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-1.5">
        <span className="text-muted">
          Evidence: {mv.n} of {mv.d} ({mv.p}%){mv.s === "low_sample" && <span className="ml-1 font-medium text-warn">· small sample</span>}
        </span>
        <ConfidenceBadge grade={hero.confidence} compact />
      </div>
    </div>
  );
}

export function IndustryLegend({
  present,
  hidden,
  onToggle,
}: {
  present: Industry[];
  hidden?: Set<Industry>;
  onToggle?: (i: Industry) => void;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2" aria-label="Colour legend: industry of primary work">
      {present.map((i) => {
        const off = hidden?.has(i);
        const content = (
          <>
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: off ? "transparent" : INDUSTRY_COLOR[i], boxShadow: `inset 0 0 0 1.5px ${INDUSTRY_COLOR[i]}` }}
            />
            <span className={off ? "line-through opacity-60" : ""}>{INDUSTRY_LABEL[i]}</span>
          </>
        );
        return (
          <li key={i}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => onToggle(i)}
                className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-surface-2"
                title={`${off ? "Show" : "Hide"} ${INDUSTRY_LABEL[i]} actors`}
              >
                {content}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5">{content}</span>
            )}
          </li>
        );
      })}
      <li className="text-muted">Colour = industry of primary work (dubbed titles count only via their Telugu release)</li>
    </ul>
  );
}
