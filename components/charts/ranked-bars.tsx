"use client";

import { useState, type ReactNode } from "react";
import { ChartTooltip, type TooltipState } from "./chart-tooltip";
import { niceMax, ticks, useElementWidth } from "./use-width";

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  display: string;
  color: string;
  selected?: boolean;
  /** Visual marker for small samples (hatched end + footnote). */
  lowSample?: boolean;
  tooltip: ReactNode;
}

interface Props {
  data: BarDatum[];
  ariaLabel: string;
  /** "auto" draws AA-style columns on wide screens and named horizontal bars on narrow ones. */
  orientation?: "auto" | "horizontal";
  domainMax?: number;
  onSelect?: (id: string) => void;
  /** Minimum px per column before switching to horizontal bars. */
  minColumnBand?: number;
}

export function RankedBars({ data, ariaLabel, orientation = "auto", domainMax, onSelect, minColumnBand = 34 }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const max = domainMax ?? niceMax(Math.max(0, ...data.map((d) => d.value)) * 1.08);
  const vertical = orientation === "auto" && width > 0 && (width - 44) / Math.max(1, data.length) >= minColumnBand;

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setTip(null)}>
      {width > 0 && data.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">No heroes have enough evidence for this metric with the current filters.</p>
      )}
      {width > 0 && data.length > 0 &&
        (vertical ? (
          <Columns data={data} width={width} max={max} ariaLabel={ariaLabel} onSelect={onSelect} setTip={setTip} />
        ) : (
          <Rows data={data} max={max} ariaLabel={ariaLabel} onSelect={onSelect} setTip={setTip} containerWidth={width} />
        ))}
      {width === 0 && <div style={{ height: 320 }} aria-hidden />}
      <ChartTooltip state={tip} containerWidth={width} />
    </div>
  );
}

type SetTip = (t: TooltipState | null) => void;

function Columns({
  data,
  width,
  max,
  ariaLabel,
  onSelect,
  setTip,
}: {
  data: BarDatum[];
  width: number;
  max: number;
  ariaLabel: string;
  onSelect?: (id: string) => void;
  setTip: SetTip;
}) {
  const left = 36;
  const right = 8;
  const top = 22;
  const plotH = 260;
  const longest = Math.max(...data.map((d) => d.label.length));
  const labelBand = Math.min(120, 18 + longest * 5.2);
  const height = top + plotH + labelBand;
  const band = (width - left - right) / data.length;
  const barW = Math.min(28, band * 0.64);
  const y = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  const tickVals = ticks(max, 4);

  return (
    <svg width={width} height={height} role="group" aria-label={ariaLabel} className="block overflow-visible">
      {tickVals.map((t) => (
        <g key={t}>
          <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} />
          <text x={left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--muted)] text-[10px]">
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = left + band * i + band / 2;
        const yTop = y(d.value);
        const h = top + plotH - yTop;
        const r = Math.min(4, h, barW / 2);
        const x0 = cx - barW / 2;
        const path =
          h <= 0
            ? ""
            : `M${x0},${top + plotH} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${top + plotH} Z`;
        const show = (e: { currentTarget: Element }) => {
          const svg = (e.currentTarget as SVGGElement).ownerSVGElement!.getBoundingClientRect();
          const box = e.currentTarget.getBoundingClientRect();
          setTip({ x: box.left - svg.left + box.width / 2, y: yTop, content: d.tooltip });
        };
        return (
          <g
            key={d.id}
            role="button"
            tabIndex={0}
            aria-pressed={d.selected ? true : undefined}
            aria-label={`${i + 1}. ${d.label}: ${d.display}`}
            className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-[var(--focus)] [&:focus-visible>rect:first-child]:stroke-2"
            onMouseEnter={show}
            onFocus={show}
            onBlur={() => setTip(null)}
            onClick={() => onSelect?.(d.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(d.id);
              }
            }}
          >
            <rect
              x={left + band * i + 1}
              y={top - 18}
              width={Math.max(0, band - 2)}
              height={plotH + 18 + labelBand - 4}
              rx={6}
              fill={d.selected ? "var(--wine-soft)" : "transparent"}
              className={d.selected ? "" : "hover:fill-[var(--surface-2)]"}
            />
            <path d={path} fill={d.color} className="chart-mark" />
            {d.lowSample && h > 8 && (
              <rect x={x0} y={yTop} width={barW} height={Math.min(10, h)} fill="url(#hatch)" className="chart-mark" />
            )}
            <text
              x={cx}
              y={yTop - 6}
              textAnchor="middle"
              className={`tabular fill-[var(--ink)] ${band < 26 ? "text-[9px]" : "text-[11px]"} ${d.selected ? "font-bold" : "font-medium"}`}
            >
              {d.display}
            </text>
            <text
              transform={`translate(${cx + 3},${top + plotH + 10}) rotate(-50)`}
              textAnchor="end"
              className={`fill-[var(--ink-2)] text-[11px] ${d.selected ? "font-bold fill-[var(--wine)]" : ""}`}
            >
              {d.label}
            </text>
          </g>
        );
      })}
      <defs>
        <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        </pattern>
      </defs>
    </svg>
  );
}

function Rows({
  data,
  max,
  ariaLabel,
  onSelect,
  setTip,
  containerWidth,
}: {
  data: BarDatum[];
  max: number;
  ariaLabel: string;
  onSelect?: (id: string) => void;
  setTip: SetTip;
  containerWidth: number;
}) {
  const nameCol = containerWidth < 360 ? 132 : containerWidth < 520 ? 158 : 176;
  return (
    <ol aria-label={ariaLabel} className="flex flex-col gap-[3px]">
      {data.map((d, i) => {
        const pct = Math.max(0, Math.min(100, (d.value / max) * 100));
        const show = (e: { currentTarget: HTMLElement }) => {
          const parent = e.currentTarget.closest("ol")!.getBoundingClientRect();
          const box = e.currentTarget.getBoundingClientRect();
          setTip({ x: containerWidth / 2, y: box.top - parent.top, content: d.tooltip });
        };
        return (
          <li key={d.id}>
            <button
              type="button"
              aria-pressed={d.selected ? true : undefined}
              aria-label={`${i + 1}. ${d.label}: ${d.display}`}
              onMouseEnter={show}
              onFocus={show}
              onBlur={() => setTip(null)}
              onClick={() => onSelect?.(d.id)}
              className={`grid w-full items-center gap-2 rounded-md px-1 py-[3px] text-left transition-colors ${
                d.selected ? "bg-wine-soft" : "hover:bg-surface-2"
              }`}
              style={{ gridTemplateColumns: `${nameCol}px 1fr auto` }}
            >
              <span className={`truncate text-[12.5px] sm:text-[13px] ${d.selected ? "font-bold text-wine" : "text-ink"}`} title={d.label}>
                <span className="tabular mr-1.5 inline-block w-5 text-right text-[11px] text-muted">{i + 1}</span>
                {d.label}
              </span>
              <span className="relative h-[18px]">
                <span
                  className="chart-mark absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{
                    width: `${pct}%`,
                    background: d.lowSample
                      ? `repeating-linear-gradient(135deg, ${d.color} 0 6px, color-mix(in srgb, ${d.color} 70%, white) 6px 8px)`
                      : d.color,
                  }}
                />
              </span>
              <span className={`tabular min-w-[3.2rem] text-right text-[12px] ${d.selected ? "font-bold" : "font-medium"} text-ink`}>
                {d.display}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
