"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  "starScore",
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

export function RankingsView({
  data,
  metric,
  onMetricChange,
}: {
  data: DashboardData;
  metric: HeroMetricKey;
  onMetricChange?: (m: HeroMetricKey) => void;
}) {
  const [period, setPeriod] = useState<FilterWindow>("all_time");
  const [emerging, setEmerging] = useState(false);

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
        <span className="tabular text-xs text-ink-2 sm:ml-auto">{heroes.length} heroes</span>
      </div>

      <ChartCard
        title={METRICS[metric].label}
        subtitle={METRICS[metric].higherIsBetter ? undefined : "Shortest first"}
        count={`${ranked.length} heroes`}
        controls={
          <MetricPicker
            label="Ranking metric"
            value={metric}
            onChange={(m) => onMetricChange?.(m)}
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
                <button
                  type="button"
                  onClick={() => {
                    onMetricChange?.(k);
                    window.scrollTo({ top: 0 });
                  }}
                  className="text-left text-sm font-semibold text-ink hover:text-wine"
                >
                  {METRICS[k].label}
                </button>
                <span className="text-[11px] text-ink-2">{METRICS[k].higherIsBetter ? "higher is better" : "lower is better"}</span>
              </div>
              <ol className="mt-2 space-y-1">
                {rankBy(heroes, k)
                  .slice(0, 5)
                  .map((h, i) => (
                    <li key={h.slug} className="flex items-center gap-2 text-[13px]">
                      <span className="tabular w-4 text-right text-[11px] text-ink-2">{i + 1}</span>
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

export function Rankings({ data }: { data: DashboardData }) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("metric") ?? "starScore";
  const urlMetric = (requested in METRICS ? requested : "starScore") as HeroMetricKey;

  const [selection, setSelection] = useState<{ fromUrl: HeroMetricKey; value: HeroMetricKey }>(() => ({
    fromUrl: urlMetric,
    value: urlMetric,
  }));

  const metric = selection.fromUrl === urlMetric ? selection.value : urlMetric;

  return (
    <RankingsView
      data={data}
      metric={metric}
      onMetricChange={(next) => setSelection({ fromUrl: urlMetric, value: next })}
    />
  );
}
