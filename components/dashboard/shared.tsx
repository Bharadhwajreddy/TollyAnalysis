"use client";

import type { HeroMetricKey } from "@/lib/calculations/engine";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { formatMetric, INDUSTRY_LABEL, METRICS } from "@/lib/constants/metrics";
import type { Group } from "@/lib/constants/groups";
import type { Industry } from "@/lib/domain/types";
import type { HeroView } from "@/lib/view-models";
import { HeroAvatar } from "@/components/hero/hero-avatar";

export { competitionRanks, rankable, rankBy } from "@/lib/ranking";

export function MetricTooltip({ hero, metric, color }: { hero: HeroView; metric: HeroMetricKey; color?: string }) {
  const mv = hero.m[metric];
  const meta = METRICS[metric];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <HeroAvatar name={hero.name} photo={hero.photo} industry={hero.industry} color={color} size={34} />
        <span>
          <span className="block font-semibold text-ink">{hero.name}</span>
          <span className="text-muted">{hero.eligible} films since 2000{hero.debutYear ? ` · debut ${hero.debutYear}` : ""}</span>
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ink-2">{meta.label}</span>
        <span className="tabular text-sm font-semibold text-ink">{formatMetric(metric, mv.v)}</span>
      </div>
      <p className="leading-snug text-muted">{meta.definition}</p>
      <p className="leading-snug text-ink-2">{mv.e}</p>
      <p className="font-medium text-wine">Double-tap to open {hero.name}&apos;s page</p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-1.5">
        <span className="text-muted">
          Based on {mv.n} of {mv.d}{mv.s === "low_sample" && <span className="ml-1 font-medium text-warn">· small sample</span>}
        </span>
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
      <li className="text-muted">Ring colour = hero&apos;s home industry (other-language heroes count only through films released in Telugu)</li>
    </ul>
  );
}

/** Clickable colour legend (tap a group to hide/show it), like the maker legend on benchmark sites. */
export function GroupLegend({ groups, hidden, onToggle, note }: { groups: Group[]; hidden: Set<string>; onToggle: (key: string) => void; note: string }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-2" aria-label="Colour legend">
      {groups.map((g) => {
        const off = hidden.has(g.key);
        return (
          <li key={g.key}>
            <button
              type="button"
              aria-pressed={!off}
              onClick={() => onToggle(g.key)}
              className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-surface-2"
              title={`${off ? "Show" : "Hide"} ${g.label}`}
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: off ? "transparent" : g.color, boxShadow: `inset 0 0 0 1.5px ${g.color}` }} />
              <span className={off ? "line-through opacity-60" : ""}>{g.label}</span>
            </button>
          </li>
        );
      })}
      <li className="text-muted">{note}</li>
    </ul>
  );
}
