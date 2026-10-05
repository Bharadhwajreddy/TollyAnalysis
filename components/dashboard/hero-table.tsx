"use client";

import { useMemo, useState } from "react";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { formatMetric, METRICS } from "@/lib/constants/metrics";
import type { HeroView } from "@/lib/view-models";
import { HeroAvatar } from "@/components/hero/hero-avatar";

const ALL_COLUMNS: HeroMetricKey[] = [
  "starScore",
  "films",
  "hits",
  "overallSuccessRatio",
  "blockbusters",
  "totalGross",
  "topGross",
  "bigFilms",
  "avgRating",
  "recentSuccessRatio",
  "peakFilms",
  "releaseGap",
  "xFollowers",
  "igFollowers",
];

const PAGE = 10;

type SortKey = HeroMetricKey | "name";

/** Simple sortable table. Tap a row to highlight, double-tap to open the hero's page. */
export function HeroTable({
  heroes,
  selected,
  colorOf,
  onActivate,
  csvMeta,
}: {
  heroes: HeroView[];
  selected: string | null;
  colorOf?: (h: HeroView) => string;
  onActivate: (slug: string) => void;
  csvMeta: { mode: string; methodologyId: string; window: string };
}) {
  // Only show columns that have data for at least one hero.
  const COLUMNS = ALL_COLUMNS.filter((k) => heroes.some((h) => h.m[k].v !== null));
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "starScore", desc: true });
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    return [...heroes].sort((a, b) => {
      if (sort.key === "name") return dir * a.name.localeCompare(b.name);
      const av = a.m[sort.key].v;
      const bv = b.m[sort.key].v;
      if (av === null && bv === null) return a.name.localeCompare(b.name);
      if (av === null) return 1;
      if (bv === null) return -1;
      return dir * (av - bv) || a.name.localeCompare(b.name);
    });
  }, [heroes, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, desc: !s.desc } : { key, desc: key === "name" ? false : METRICS[key as HeroMetricKey].higherIsBetter },
    );

  const exportCsv = () => {
    const header = ["hero", "industry", ...COLUMNS.map((k) => METRICS[k].label), "window", "methodology_version", "data_mode", "disclaimer"];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const disclaimer = csvMeta.mode === "demo" ? "SYNTHETIC DEMO DATA - not real-world figures" : "Editorial benchmark; see methodology";
    const lines = rows.map((h) =>
      [h.name, h.industry, ...COLUMNS.map((k) => h.m[k].v), csvMeta.window, csvMeta.methodologyId, csvMeta.mode, disclaimer].map(esc).join(","),
    );
    const blob = new Blob([[header.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tollywood-heroes-${csvMeta.window}${csvMeta.mode === "demo" ? "-DEMO" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">Tap a column to sort · tap a row to highlight · double-tap a row to open that hero&apos;s page.</p>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink-2"
        >
          Download CSV ({heroes.length})
        </button>
      </div>
      <div className="scroll-x -mx-4 border-y border-line sm:mx-0 sm:rounded-lg sm:border">
        <table className="w-full min-w-[1100px] border-collapse text-[13px]">
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className="w-10 border-b border-line px-2 py-2 text-right text-[11px] font-semibold text-ink-2">#</th>
              <Th sort={sort} toggle={toggle} k="name" numeric={false}>Hero</Th>
              {COLUMNS.map((k) => (
                <Th key={k} sort={sort} toggle={toggle} k={k}>{METRICS[k].short}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(showAll ? rows : rows.slice(0, PAGE)).map((h, i) => {
              const isSel = h.slug === selected;
              return (
                <tr
                  key={h.slug}
                  onClick={() => onActivate(h.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onActivate(h.slug);
                  }}
                  tabIndex={0}
                  aria-selected={isSel}
                  className={`cursor-pointer border-b border-line last:border-b-0 ${isSel ? "bg-wine-soft" : "bg-surface hover:bg-surface-2"}`}
                >
                  <td className="tabular px-2 py-1.5 text-right text-muted">{i + 1}</td>
                  <td className={`sticky left-0 z-[1] px-3 py-1.5 ${isSel ? "bg-wine-soft" : "bg-surface"}`}>
                    <span className="flex items-center gap-2 whitespace-nowrap font-medium text-ink">
                      <HeroAvatar name={h.name} photo={h.photo} industry={h.industry} color={colorOf?.(h)} size={28} />
                      {h.name}
                      {h.isEmerging && <span className="rounded bg-teal-soft px-1 text-[10px] font-semibold text-[#00596a]">NEW</span>}
                    </span>
                  </td>
                  {COLUMNS.map((k) => {
                    const mv = h.m[k];
                    return (
                      <td key={k} className="tabular px-3 py-1.5 text-right" title={mv.e}>
                        {formatMetric(k, mv.v)}
                        {mv.s === "low_sample" && mv.v !== null && <sup className="ml-0.5 text-warn" aria-label="small sample">*</sup>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-2">
          Showing {showAll ? rows.length : Math.min(PAGE, rows.length)} of {rows.length} heroes. CSV includes every filtered hero.
        </p>
        {rows.length > PAGE && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="rounded-md border border-line px-3 py-1.5 text-[13px] font-medium text-wine hover:border-wine">
            {showAll ? `Show top ${PAGE}` : `Show all ${rows.length} heroes`}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Row numbers follow the sorted column and are not benchmark ranks. <sup className="text-warn">*</sup> small sample: based on fewer than 3 films
        with a known result (fewer than 5 for recent success and the Star Score). “—” means not enough data, never zero.
      </p>
    </div>
  );
}

function Th({
  k,
  children,
  numeric = true,
  sort,
  toggle,
}: {
  k: SortKey;
  children: React.ReactNode;
  numeric?: boolean;
  sort: { key: SortKey; desc: boolean };
  toggle: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}
      className={`whitespace-nowrap border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-2 ${
        numeric ? "text-right" : "sticky left-0 z-10 bg-surface-2 text-left"
      }`}
    >
      <button type="button" onClick={() => toggle(k)} className={`inline-flex items-center gap-1 hover:text-ink ${numeric ? "flex-row-reverse" : ""}`}>
        {children}
        <span aria-hidden className="text-[9px] text-muted">{active ? (sort.desc ? "▼" : "▲") : "↕"}</span>
      </button>
    </th>
  );
}
