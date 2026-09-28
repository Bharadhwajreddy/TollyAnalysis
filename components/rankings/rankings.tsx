"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { formatMetric, METRICS, WINDOW_LABEL } from "@/lib/constants/metrics";
import type { FilterWindow } from "@/lib/domain/types";
import type { DashboardData } from "@/lib/view-models";
import { RankedBars } from "@/components/charts/ranked-bars";
import { ChartCard } from "@/components/ui/chart-card";
import { MetricPicker } from "@/components/ui/metric-picker";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { IndustryLegend, MetricTooltip, rankBy } from "@/components/dashboard/shared";

const ALL_METRICS: HeroMetricKey[] = [
  "hpi",
  "filmSuccess",
  "overallSuccessRatio",
  "audienceSuccessRatio",
  "audienceIndex",
  "consistency",
  "socialReach",
  "momentum",
  "releaseGap",
  "peakFilms",
  "filmsPerYear",
];

export function Rankings({ data, initialMetric }: { data: DashboardData; initialMetric: HeroMetricKey }) {
  const [period, setPeriod] = useState<FilterWindow>("all_time");
  const [emerging, setEmerging] = useState(false);
  const [metric, setMetric] = useState<HeroMetricKey>(initialMetric);

  const heroes = useMemo(() => data.windows[period].filter((h) => emerging || !h.isEmerging), [data, period, emerging]);
  const ranked = rankBy(heroes, metric);
  const industries = [...new Set(heroes.map((h) => h.industry))];

  return (
    <div className="mt-5 space-y-4">
      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
        <Segmented
          label="Period"
          value={period}
          onChange={setPeriod}
          options={(Object.keys(WINDOW_LABEL) as FilterWindow[]).map((w) => ({ value: w, label: WINDOW_LABEL[w] }))}
        />
        <Toggle checked={emerging} onChange={setEmerging} label="Include emerging heroes" />
        <span className="tabular text-xs text-muted sm:ml-auto">{heroes.length} heroes</span>
      </div>

      <ChartCard
        title={`Full ranking: ${METRICS[metric].label}`}
        subtitle={`${WINDOW_LABEL[period]} · ${METRICS[metric].higherIsBetter ? "Higher is better" : "Lower is better — ranked from shortest gap"}`}
        count={`${ranked.length} ranked · ${heroes.length - ranked.length} without enough evidence`}
        controls={
          <MetricPicker
            label="Ranking metric"
            value={metric}
            onChange={setMetric}
            options={ALL_METRICS.map((k) => ({ value: k, label: METRICS[k].short === "HPI" ? "Performance Index" : METRICS[k].short }))}
          />
        }
        legend={<IndustryLegend present={industries} />}
        footer={METRICS[metric].definition}
      >
        <RankedBars
          orientation="horizontal"
          data={ranked.map((h) => ({
            id: h.slug,
            label: h.name,
            value: h.m[metric].v as number,
            display: formatMetric(metric, h.m[metric].v, metric === "releaseGap"),
            color: INDUSTRY_COLOR[h.industry],
            photo: h.photo,
            industry: h.industry,
            lowSample: h.m[metric].s === "low_sample",
            tooltip: <MetricTooltip hero={h} metric={metric} />,
          }))}
          ariaLabel={`${METRICS[metric].label} full ranking`}
          domainMax={METRICS[metric].domainMax}
        />
      </ChartCard>

      <section aria-labelledby="leaders-title">
        <h2 id="leaders-title" className="mb-3 mt-8 text-lg font-semibold text-ink">
          Top 5 by every metric
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ALL_METRICS.map((k) => (
            <div key={k} className="card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <button type="button" onClick={() => { setMetric(k); window.scrollTo({ top: 0 }); }} className="text-left text-sm font-semibold text-ink hover:text-wine">
                  {METRICS[k].label}
                </button>
                <span className="text-[11px] text-muted">{METRICS[k].higherIsBetter ? "higher is better" : "lower is better"}</span>
              </div>
              <ol className="mt-2 space-y-1">
                {rankBy(heroes, k)
                  .slice(0, 5)
                  .map((h, i) => (
                    <li key={h.slug} className="flex items-center gap-2 text-[13px]">
                      <span className="tabular w-4 text-right text-[11px] text-muted">{i + 1}</span>
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: INDUSTRY_COLOR[h.industry] }} />
                      <Link href={`/annexure/heroes/${h.slug}`} className="truncate text-ink hover:text-wine">
                        {h.name}
                      </Link>
                      <span className="tabular ml-auto font-medium">{formatMetric(k, h.m[k].v)}</span>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
