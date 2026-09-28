"use client";

import { useState } from "react";
import { ChartTooltip, type TooltipState } from "./chart-tooltip";
import { niceMax, ticks, useElementWidth } from "./use-width";

export interface Series {
  key: string;
  label: string;
  color: string;
}

const M = { top: 14, right: 12, bottom: 28, left: 36 };

/** Whole-number ticks for counts (films can't be fractional). */
function countTicks(max: number): number[] {
  const step = Math.max(1, Math.ceil(max / 4));
  const out: number[] = [];
  for (let t = 0; t <= max; t += step) out.push(t);
  return out;
}

function yearTicks(years: number[], width: number) {
  const every = width < 480 ? 5 : width < 900 ? 3 : 2;
  return years.filter((y) => y % every === 0);
}

/** Stacked columns per year. 2px surface gaps between segments. */
export function StackedYearColumns({
  rows,
  series,
  ariaLabel,
  height = 260,
}: {
  rows: ({ year: number } & Record<string, number>)[];
  series: Series[];
  ariaLabel: string;
  height?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const plotW = Math.max(10, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const rawMax = Math.max(1, ...rows.map((r) => series.reduce((a, s) => a + (r[s.key] ?? 0), 0)));
  const max = rawMax <= 8 ? rawMax + 1 : niceMax(rawMax);
  const band = plotW / Math.max(1, rows.length);
  const barW = Math.min(24, band * 0.7);
  const y = (v: number) => M.top + plotH - (v / max) * plotH;

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {countTicks(max).map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} />
              <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--muted)] text-[10px]">
                {t}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = M.left + band * i + band / 2;
            let acc = 0;
            const total = series.reduce((a, s) => a + (r[s.key] ?? 0), 0);
            const visibleSegs = series.filter((s) => (r[s.key] ?? 0) > 0);
            return (
              <g
                key={r.year}
                onMouseEnter={() =>
                  setTip({
                    x: cx,
                    y: y(total),
                    content: (
                      <div>
                        <p className="font-semibold text-ink">{r.year}</p>
                        {series.map((s) => (
                          <p key={s.key} className="tabular flex justify-between gap-3 text-ink-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                              {s.label}
                            </span>
                            {r[s.key] ?? 0}
                          </p>
                        ))}
                        <p className="tabular mt-1 flex justify-between border-t border-line pt-1 font-medium text-ink">
                          <span>Total</span>
                          {total}
                        </p>
                      </div>
                    ),
                  })
                }
              >
                <rect x={M.left + band * i} y={M.top} width={band} height={plotH} fill="transparent" />
                {visibleSegs.map((s, si) => {
                  const v = r[s.key] ?? 0;
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  const isTop = si === visibleSegs.length - 1;
                  const gap = si > 0 ? 2 : 0;
                  const h = Math.max(0, y0 - y1 - gap);
                  const rr = isTop ? Math.min(4, h) : 0;
                  const x0 = cx - barW / 2;
                  const top = y1;
                  const bottom = y0 - gap;
                  const d = `M${x0},${bottom} V${top + rr} Q${x0},${top} ${x0 + rr},${top} H${x0 + barW - rr} Q${x0 + barW},${top} ${x0 + barW},${top + rr} V${bottom} Z`;
                  return <path key={s.key} d={d} fill={s.color} className="chart-mark" />;
                })}
              </g>
            );
          })}
          {yearTicks(rows.map((r) => r.year), width).map((yr) => {
            const i = rows.findIndex((r) => r.year === yr);
            return (
              <text key={yr} x={M.left + band * i + band / 2} y={height - 8} textAnchor="middle" className="tabular fill-[var(--muted)] text-[10px]">
                {yr}
              </text>
            );
          })}
        </svg>
      )}
      {width === 0 && <div style={{ height }} />}
      <ChartTooltip state={tip} containerWidth={width} />
    </div>
  );
}

/** Multi-line chart over years on one shared 0–100 axis, with a crosshair tooltip. */
export function YearLines({
  rows,
  series,
  ariaLabel,
  height = 260,
  domain = [0, 100],
}: {
  rows: ({ year: number } & Record<string, number | null>)[];
  series: Series[];
  ariaLabel: string;
  height?: number;
  domain?: [number, number];
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const plotW = Math.max(10, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const years = rows.map((r) => r.year);
  const x0 = Math.min(...years);
  const x1 = Math.max(...years);
  const x = (yr: number) => M.left + (x1 === x0 ? plotW / 2 : ((yr - x0) / (x1 - x0)) * plotW);
  const y = (v: number) => M.top + plotH - ((v - domain[0]) / (domain[1] - domain[0])) * plotH;
  const hoverRow = hover === null ? null : rows[hover];

  return (
    <div ref={ref} className="relative">
      {width > 0 && rows.length > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const px = e.clientX - box.left;
            let best = 0;
            rows.forEach((r, i) => {
              if (Math.abs(x(r.year) - px) < Math.abs(x(rows[best].year) - px)) best = i;
            });
            setHover(best);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {ticks(domain[1] - domain[0], 4).map((t0) => {
            const t = t0 + domain[0];
            return (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--muted)] text-[10px]">
                  {t}
                </text>
              </g>
            );
          })}
          <line x1={M.left} x2={width - M.right} y1={M.top + plotH} y2={M.top + plotH} stroke="var(--axis)" />
          {yearTicks(years, width).map((yr) => (
            <text key={yr} x={x(yr)} y={height - 8} textAnchor="middle" className="tabular fill-[var(--muted)] text-[10px]">
              {yr}
            </text>
          ))}
          {series.map((s) => {
            const pts = rows.filter((r) => r[s.key] !== null && r[s.key] !== undefined);
            const d = pts.map((r, i) => `${i ? "L" : "M"}${x(r.year)},${y(r[s.key] as number)}`).join(" ");
            const last = pts.at(-1);
            return (
              <g key={s.key}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="chart-mark" />
                {pts.length <= 12 &&
                  pts.map((r) => (
                    <circle key={r.year} cx={x(r.year)} cy={y(r[s.key] as number)} r={3.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                  ))}
                {last && (
                  <circle cx={x(last.year)} cy={y(last[s.key] as number)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                )}
              </g>
            );
          })}
          {hoverRow && (
            <g>
              <line x1={x(hoverRow.year)} x2={x(hoverRow.year)} y1={M.top} y2={M.top + plotH} stroke="var(--axis)" />
              {series.map((s) =>
                hoverRow[s.key] === null ? null : (
                  <circle key={s.key} cx={x(hoverRow.year)} cy={y(hoverRow[s.key] as number)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ),
              )}
            </g>
          )}
        </svg>
      )}
      {width === 0 && <div style={{ height }} />}
      <ChartTooltip
        containerWidth={width}
        state={
          hoverRow
            ? {
                x: x(hoverRow.year),
                y: M.top + 10,
                content: (
                  <div>
                    <p className="font-semibold text-ink">{hoverRow.year}</p>
                    {series.map((s) => (
                      <p key={s.key} className="tabular flex justify-between gap-3 text-ink-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-0.5 w-3" style={{ background: s.color }} />
                          {s.label}
                        </span>
                        {hoverRow[s.key] ?? "—"}
                      </p>
                    ))}
                  </div>
                ),
              }
            : null
        }
      />
    </div>
  );
}

export function SeriesLegend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
