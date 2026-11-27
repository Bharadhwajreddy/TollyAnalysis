"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { FloatTip, TipRow, type FloatTipState } from "@/components/charts/float-tip";
import { useEnter } from "@/components/charts/use-enter";
import { niceMax, useElementWidth } from "@/components/charts/use-width";

export interface YearCol {
  year: number;
  theatrical: number;
  dubbed: number;
  ott: number;
  total: number;
  partial: boolean;
}

const PARTS = [
  { key: "theatrical", label: "Telugu films in theatres", color: "var(--k-theatrical)" },
  { key: "ott", label: "Telugu films straight to OTT", color: "var(--k-ott)" },
  { key: "dubbed", label: "Dubbed into Telugu", color: "var(--k-dubbed)" },
] as const;

export function YearLegend() {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {PARTS.map((p) => (
        <span key={p.key} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: p.color }} />
          {p.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="hatch h-2.5 w-2.5 rounded-[2px] text-field-2 ring-1 ring-field-2" />
        Year so far
      </span>
    </span>
  );
}

/**
 * Releases per year as stacked columns (theatres / OTT / dubbed add up to the total). The running year is
 * hatched and labelled "so far", so it never reads as a decline. Click a year to open its list.
 */
export function YearColumns({
  data,
  height = 300,
  selected,
  hrefFor,
  compact = false,
  notes = {},
  asOfLabel,
}: {
  data: YearCol[];
  height?: number;
  selected?: number;
  /** Link pattern for a year, with {y} for the year, e.g. "/releases?year={y}#list". */
  hrefFor?: string;
  compact?: boolean;
  notes?: Record<number, string>;
  asOfLabel?: string;
}) {
  const [wrap, width] = useElementWidth<HTMLDivElement>(640);
  const enter = useEnter<HTMLDivElement>();
  const router = useRouter();
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);

  const left = compact ? 4 : 36;
  const right = 4;
  const top = compact ? 18 : 30;
  const bottom = compact ? 18 : 24;
  const plotW = Math.max(10, width - left - right);
  const plotH = height - top - bottom;
  const max = niceMax(Math.max(...data.map((d) => d.total), 1));
  const step = plotW / data.length;
  const bw = Math.max(3, Math.min(26, step * 0.68));
  const x = (i: number) => left + step * i + step / 2;
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const every = width < 480 ? 5 : width < 820 ? 2 : 1;
  const peak = data.filter((d) => !d.partial).reduce((a, b) => (b.total > a.total ? b : a), data[0]);

  const show = (i: number | null) => {
    setHover(i);
    if (i === null || !svg.current) return setTip(null);
    const d = data[i];
    const r = svg.current.getBoundingClientRect();
    setTip({
      x: r.left + x(i),
      y: r.top + y(d.total),
      y2: r.top + top + plotH,
      content: (
        <div className="min-w-[200px]">
          <p className="mb-1.5 font-semibold text-ink">
            {d.year}
            {d.partial && <span className="font-normal text-muted"> · {asOfLabel ?? "so far"}</span>}
          </p>
          {PARTS.map((p) => (
            <TipRow key={p.key} k={<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: p.color }} />{p.label}</span>} v={d[p.key]} />
          ))}
          <div className="mt-1 border-t border-rule pt-1">
            <TipRow k="All releases" v={<span className="font-semibold">{d.total}</span>} />
          </div>
          {hrefFor && <p className="mt-1.5 text-[11px] text-muted">Click for the list of films</p>}
        </div>
      ),
    });
  };
  const open = (i: number) => hrefFor && router.push(hrefFor.replace("{y}", String(data[i].year)), { scroll: false });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      show(hover === null ? data.length - 1 : Math.max(0, Math.min(data.length - 1, hover + d)));
    } else if (e.key === "Enter" && hover !== null) open(hover);
    else if (e.key === "Escape") show(null);
  };

  return (
    <div ref={wrap} className="relative">
      <div ref={enter}>
        <svg
          ref={svg}
          width={width}
          height={height}
          role="img"
          tabIndex={0}
          aria-label={`Telugu releases per year, ${data[0].year} to ${data[data.length - 1].year}. Highest: ${peak.total} in ${peak.year}.`}
          onKeyDown={onKey}
          onBlur={() => show(null)}
          onMouseLeave={() => show(null)}
          className="block select-none overflow-visible outline-none"
        >
          {!compact &&
            ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke={t ? "var(--grid)" : "var(--ink-2)"} strokeOpacity={t ? 1 : 0.5} />
                <text x={left - 8} y={y(t) + 4} textAnchor="end" className="tabular fill-muted text-[11px]">
                  {t}
                </text>
              </g>
            ))}
          {!compact && (
            <text x={left} y={12} className="fill-muted text-[11px]">
              Films released
            </text>
          )}
          {data.map((d, i) => {
            let acc = 0;
            const sel = selected === d.year;
            const dim = hover !== null && hover !== i;
            return (
              <g key={d.year} style={{ opacity: dim ? 0.45 : 1, transition: "opacity 120ms" }}>
                {PARTS.map((p) => {
                  const v = d[p.key];
                  const y0 = y(acc);
                  acc += v;
                  const h = y0 - y(acc);
                  return h > 0 ? <rect key={p.key} className="grow-mark" style={{ ["--d" as string]: `${i * 14}ms` }} x={x(i) - bw / 2} y={y(acc)} width={bw} height={Math.max(0, h - (acc === d.total ? 0 : 0.75))} fill={d.partial ? "url(#hatch)" : p.color} stroke={d.partial ? p.color : "none"} strokeWidth={d.partial ? 1 : 0} /> : null;
                })}
                {sel && <rect x={x(i) - bw / 2 - 3} y={y(d.total) - 3} width={bw + 6} height={top + plotH - y(d.total) + 3} rx={3} fill="none" stroke="var(--accent)" strokeWidth={1.5} />}
                {(i % every === (data.length - 1) % every || sel) && (
                  <text x={x(i)} y={height - 6} textAnchor="middle" className={`tabular text-[11px] ${sel ? "fill-ink font-semibold" : "fill-muted"}`}>
                    {compact ? `'${String(d.year).slice(2)}` : d.year}
                  </text>
                )}
                {(d.year === peak.year || d.partial || notes[d.year]) && !compact && (
                  <text x={x(i)} y={y(d.total) - 6} textAnchor="middle" className="tabular fill-ink-2 text-[11px] font-medium">
                    {d.total}
                  </text>
                )}
                {notes[d.year] && !compact && width >= 640 && (
                  <text x={x(i)} y={y(d.total) - 19} textAnchor="middle" className="fill-muted text-[10.5px]">
                    {notes[d.year]}
                  </text>
                )}
                <rect
                  x={left + step * i}
                  y={top}
                  width={step}
                  height={plotH}
                  fill="transparent"
                  className={hrefFor ? "cursor-pointer" : ""}
                  onMouseEnter={() => show(i)}
                  onClick={() => open(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <FloatTip state={tip} />
    </div>
  );
}
