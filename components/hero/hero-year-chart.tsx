"use client";

import { SeriesLegend, StackedYearColumns, type Series } from "@/components/charts/year-charts";

const SERIES: Series[] = [
  { key: "hit", label: "Hits", color: "#a3284f" },
  { key: "miss", label: "Not hits", color: "#b9aca2" },
  { key: "unknown", label: "Not enough data / too recent", color: "#e3dbd0" },
];

export function HeroYearChart({ rows, name }: { rows: { year: number; hit: number; miss: number; unknown: number }[]; name: string }) {
  if (!rows.length) return <p className="text-sm text-muted">No dated films.</p>;
  return (
    <div>
      <StackedYearColumns rows={rows} series={SERIES} ariaLabel={`${name}: films per year, split into hits and others`} height={240} />
      <div className="mt-2">
        <SeriesLegend series={SERIES} />
      </div>
    </div>
  );
}
