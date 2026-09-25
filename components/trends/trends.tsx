"use client";

import { useState } from "react";
import { SeriesLegend, StackedYearColumns, YearLines, type Series } from "@/components/charts/year-charts";
import { ChartCard } from "@/components/ui/chart-card";

type YearRow = {
  year: number;
  releases: number;
  original: number;
  dubbed: number;
  ott: number;
  avgFilmSuccess: number | null;
  avgAudience: number | null;
};

const MIX: Series[] = [
  { key: "original", label: "Original Telugu (theatrical)", color: "#a3284f" },
  { key: "dubbed", label: "Telugu-dubbed (theatrical)", color: "#00879e" },
  { key: "ott", label: "Direct-to-OTT feature", color: "#b98200" },
];
const QUALITY: Series[] = [
  { key: "avgFilmSuccess", label: "Average Film Success Score", color: "#a3284f" },
  { key: "avgAudience", label: "Average audience score", color: "#00879e" },
];

export function Trends({
  years,
  heroYearly,
  heroes,
}: {
  years: YearRow[];
  heroYearly: Record<string, { year: number; avg: number | null; releases: number }[]>;
  heroes: { slug: string; name: string }[];
}) {
  const [hero, setHero] = useState(heroes[0]?.slug ?? "");
  const hy = heroYearly[hero] ?? [];
  const heroName = heroes.find((h) => h.slug === hero)?.name ?? "";

  return (
    <div className="mt-5 space-y-4">
      <ChartCard
        title="Eligible lead releases per year"
        subtitle="Unique titles across the roster (a co-lead title counts once here)"
        legend={<SeriesLegend series={MIX} />}
        footer="Web series, shorts, anthology segments and re-release screenings are excluded. OTT features are part of the same filmography."
      >
        <StackedYearColumns rows={years.map((y) => ({ year: y.year, original: y.original, dubbed: y.dubbed, ott: y.ott }))} series={MIX} ariaLabel="Releases per year by release type" />
      </ChartCard>

      <ChartCard
        title="Average film outcomes by release year"
        subtitle="Both on the same 0–100 scale · Higher is better"
        legend={<SeriesLegend series={QUALITY} />}
        footer="Only scored and provisional films contribute. Recent releases (not yet final) are excluded until their run is reconciled."
      >
        <YearLines rows={years} series={QUALITY} ariaLabel="Average Film Success and audience score by year" />
      </ChartCard>

      <ChartCard
        title={`Career trajectory: ${heroName}`}
        subtitle="Average Film Success Score per calendar year"
        controls={
          <label className="flex items-center gap-2 text-[13px] text-ink-2">
            Hero
            <select value={hero} onChange={(e) => setHero(e.target.value)} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink">
              {heroes.map((h) => (
                <option key={h.slug} value={h.slug}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        }
        footer="Years with releases but no scored film show a gap rather than zero."
      >
        {hy.length ? (
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <YearLines
              rows={hy.map((r) => ({ year: r.year, avg: r.avg }))}
              series={[{ key: "avg", label: "Average Film Success Score", color: "#a3284f" }]}
              ariaLabel={`${heroName} average Film Success Score by year`}
            />
            <div>
              <p className="eyebrow mb-1">Eligible releases per year</p>
              <StackedYearColumns
                rows={hy.map((r) => ({ year: r.year, releases: r.releases }))}
                series={[{ key: "releases", label: "Releases", color: "#7d6d65" }]}
                ariaLabel={`${heroName} releases per year`}
                height={220}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No eligible releases.</p>
        )}
      </ChartCard>
    </div>
  );
}
