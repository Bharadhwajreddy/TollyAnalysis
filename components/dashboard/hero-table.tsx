"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { formatMetric, METRICS } from "@/lib/constants/metrics";
import type { HeroView } from "@/lib/view-models";
import { ConfidenceBadge } from "@/components/ui/badges";

const col = createColumnHelper<HeroView>();

const metricCol = (key: HeroMetricKey, header: string) =>
  col.accessor((h) => h.m[key].v, {
    id: key,
    header,
    sortUndefined: "last",
    sortingFn: (a, b) => {
      const av = a.original.m[key].v;
      const bv = b.original.m[key].v;
      if (av === null && bv === null) return 0;
      if (av === null) return METRICS[key].higherIsBetter ? -1 : 1;
      if (bv === null) return METRICS[key].higherIsBetter ? 1 : -1;
      return av - bv;
    },
    cell: (c) => {
      const mv = c.row.original.m[key];
      return (
        <span className={mv.s === "low_sample" ? "text-ink-2" : ""} title={mv.e}>
          {formatMetric(key, mv.v)}
          {mv.s === "low_sample" && mv.v !== null && <sup className="ml-0.5 text-warn" aria-label="small sample">*</sup>}
        </span>
      );
    },
    meta: { numeric: true },
  });

export function HeroTable({
  heroes,
  selected,
  onSelect,
  compare,
  onToggleCompare,
  csvMeta,
}: {
  heroes: HeroView[];
  selected: string | null;
  onSelect: (slug: string) => void;
  compare: string[];
  onToggleCompare: (slug: string) => void;
  csvMeta: { mode: string; methodologyId: string; window: string };
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "hpi", desc: true }]);

  const rankMap = useMemo(() => {
    const r = [...heroes].filter((h) => h.m.hpi.v !== null).sort((a, b) => (b.m.hpi.v as number) - (a.m.hpi.v as number));
    return new Map(r.map((h, i) => [h.slug, i + 1]));
  }, [heroes]);

  const columns = useMemo(
    () => [
      col.display({
        id: "compare",
        header: () => <span className="sr-only">Compare</span>,
        cell: (c) => {
          const on = compare.includes(c.row.original.slug);
          const full = !on && compare.length >= 4;
          return (
            <input
              type="checkbox"
              checked={on}
              disabled={full}
              onChange={() => onToggleCompare(c.row.original.slug)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Compare ${c.row.original.name}`}
              title={full ? "Compare up to 4 heroes" : "Add to compare"}
              className="h-4 w-4 accent-[var(--wine)]"
            />
          );
        },
      }),
      col.accessor((h) => rankMap.get(h.slug) ?? null, {
        id: "rank",
        header: "Rank",
        sortUndefined: "last",
        cell: (c) => <span className="text-muted">{c.getValue() ?? "—"}</span>,
        meta: { numeric: true },
      }),
      col.accessor("name", {
        header: "Hero",
        cell: (c) => (
          <span className="flex items-center gap-2 whitespace-nowrap font-medium text-ink">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: INDUSTRY_COLOR[c.row.original.industry] }} />
            {c.getValue()}
            {c.row.original.isEmerging && <span className="rounded bg-teal-soft px-1 text-[10px] font-semibold text-[#00596a]">EMERGING</span>}
          </span>
        ),
      }),
      col.accessor("eligible", { header: "Lead films", meta: { numeric: true } }),
      metricCol("overallSuccessRatio", "Success ratio"),
      metricCol("hpi", "HPI"),
      metricCol("audienceIndex", "Audience"),
      metricCol("releaseGap", "Avg gap"),
      metricCol("peakFilms", "Peak/yr"),
      metricCol("filmsPerYear", "Films/active yr"),
      metricCol("socialReach", "Social reach"),
      col.accessor("coverage", {
        header: "Evidence",
        cell: (c) => (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="tabular">{c.getValue()}%</span>
            <ConfidenceBadge grade={c.row.original.confidence} compact />
          </span>
        ),
        meta: { numeric: true },
      }),
      metricCol("momentum", "Momentum"),
    ],
    [compare, onToggleCompare, rankMap],
  );

  // TanStack Table returns fresh functions each render; the React Compiler skips this component by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: heroes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const exportCsv = () => {
    const rows = table.getRowModel().rows.map((r) => r.original);
    const header = [
      "rank", "hero", "industry", "eligible_lead_films", "overall_success_ratio_pct", "hero_performance_index", "audience_index",
      "avg_release_gap_months", "peak_films_in_year", "films_per_active_year", "social_reach_index", "evidence_coverage_pct",
      "confidence", "recent_momentum", "window", "methodology_version", "data_mode", "disclaimer",
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const disclaimer =
      csvMeta.mode === "demo" ? "SYNTHETIC DEMO DATA - not real-world figures" : "Editorial benchmark; see methodology and source ledger";
    const lines = rows.map((h) =>
      [
        rankMap.get(h.slug) ?? "", h.name, h.industry, h.eligible, h.m.overallSuccessRatio.v, h.m.hpi.v, h.m.audienceIndex.v,
        h.m.releaseGap.v, h.m.peakFilms.v, h.m.filmsPerYear.v, h.m.socialReach.v, h.coverage, h.confidence, h.m.momentum.v,
        csvMeta.window, csvMeta.methodologyId, csvMeta.mode, disclaimer,
      ].map(esc).join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tollywood-analysis-heroes-${csvMeta.window}${csvMeta.mode === "demo" ? "-DEMO" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Tap a column to sort · tap a row to select · tick up to 4 to compare. <sup className="text-warn">*</sup> small sample.
        </p>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
          </svg>
          Export CSV ({heroes.length} rows)
        </button>
      </div>
      <div className="scroll-x -mx-4 border-y border-line sm:mx-0 sm:rounded-lg sm:border">
        <table className="w-full min-w-[980px] border-collapse text-[13px]">
          <thead className="bg-surface-2">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const numeric = (h.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={`sticky top-0 whitespace-nowrap border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-2 ${
                        numeric ? "text-right" : "text-left"
                      } ${h.column.id === "name" ? "sticky left-0 z-10 bg-surface-2" : ""}`}
                    >
                      {h.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={`inline-flex items-center gap-1 hover:text-ink ${numeric ? "flex-row-reverse" : ""}`}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span aria-hidden className="text-[9px] text-muted">{sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}</span>
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isSel = row.original.slug === selected;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.original.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelect(row.original.slug);
                  }}
                  tabIndex={0}
                  aria-selected={isSel}
                  className={`cursor-pointer border-b border-line last:border-b-0 ${isSel ? "bg-wine-soft" : "bg-surface hover:bg-surface-2"}`}
                >
                  {row.getVisibleCells().map((cell) => {
                    const numeric = (cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                    return (
                      <td
                        key={cell.id}
                        className={`tabular px-3 py-2 ${numeric ? "text-right" : ""} ${
                          cell.column.id === "name" ? `sticky left-0 z-[1] ${isSel ? "bg-wine-soft" : "bg-surface"}` : ""
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
