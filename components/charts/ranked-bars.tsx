"use client";

 
import { useState, type ReactNode } from "react";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import type { Industry } from "@/lib/domain/types";
import { ChartTooltip, type TooltipState } from "./chart-tooltip";
import { AvatarClipDef, SvgAvatar } from "./svg-avatar";
import { niceMax, ticks, useElementWidth } from "./use-width";

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  display: string;
  color: string;
  photo: string | null;
  industry: Industry;
  selected?: boolean;
  /** Visual marker for small samples (hatched end). */
  lowSample?: boolean;
  /** Competition rank label, e.g. "#1" or "#1 tie". */
  rank?: string;
  tooltip: ReactNode;
}

interface Props {
  data: BarDatum[];
  ariaLabel: string;
  /** "auto" draws columns with photos on wide screens and named rows on narrow ones. */
  orientation?: "auto" | "horizontal";
  domainMax?: number;
  onActivate?: (id: string) => void;
  minColumnBand?: number;
}

export function RankedBars({ data, ariaLabel, orientation = "auto", domainMax, onActivate, minColumnBand = 44 }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const max = domainMax ?? niceMax(Math.max(0, ...data.map((d) => d.value)) * 1.08);
  const vertical = orientation === "auto" && width > 0 && (width - 44) / Math.max(1, data.length) >= minColumnBand;

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setTip(null)}>
      {width > 0 && data.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">No heroes have enough data for this with the current filters.</p>
      )}
      {width > 0 &&
        data.length > 0 &&
        (vertical ? (
          <Columns data={data} width={width} max={max} ariaLabel={ariaLabel} onActivate={onActivate} setTip={setTip} />
        ) : (
          <Rows data={data} max={max} ariaLabel={ariaLabel} onActivate={onActivate} setTip={setTip} containerWidth={width} />
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
  onActivate,
  setTip,
}: {
  data: BarDatum[];
  width: number;
  max: number;
  ariaLabel: string;
  onActivate?: (id: string) => void;
  setTip: SetTip;
}) {
  const left = 36;
  const right = 8;
  const top = 22;
  const plotH = 250;
  const band = (width - left - right) / data.length;
  const r = Math.max(11, Math.min(18, band * 0.3));
  // Names sit under the photo on up to two lines, then the rank.
  const wrap = band >= 64;
  const longest = Math.max(...data.map((d) => d.label.length));
  const labelBand = wrap ? r * 2 + 16 + 46 : r * 2 + 16 + Math.min(110, 12 + longest * 5.4);
  const height = top + plotH + labelBand;
  const barW = Math.min(30, band * 0.62);
  const y = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  const tickVals = ticks(max, 4);

  return (
    <svg width={width} height={height} role="group" aria-label={ariaLabel} className="block overflow-visible">
      <defs>
        <AvatarClipDef />
        <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        </pattern>
      </defs>
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
        const rr = Math.min(4, h, barW / 2);
        const x0 = cx - barW / 2;
        const path =
          h <= 0
            ? ""
            : `M${x0},${top + plotH} V${yTop + rr} Q${x0},${yTop} ${x0 + rr},${yTop} H${x0 + barW - rr} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + rr} V${top + plotH} Z`;
        const avatarY = top + plotH + 8 + r;
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
            aria-label={`${i + 1}. ${d.label}: ${d.display}. Double-tap to open profile.`}
            className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-[var(--focus)] [&:focus-visible>rect:first-child]:stroke-2"
            onMouseEnter={show}
            onFocus={show}
            onBlur={() => setTip(null)}
            onClick={() => onActivate?.(d.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.(d.id);
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
            {d.lowSample && h > 8 && <rect x={x0} y={yTop} width={barW} height={Math.min(10, h)} fill="url(#hatch)" />}
            <text
              x={cx}
              y={yTop - 6}
              textAnchor="middle"
              className={`tabular fill-[var(--ink)] ${band < 30 ? "text-[9.5px]" : "text-[11.5px]"} ${d.selected ? "font-bold" : "font-semibold"}`}
            >
              {d.display}
            </text>
            <SvgAvatar cx={cx} cy={avatarY} r={r} photo={d.photo} name={d.label} color={d.color} selected={d.selected} />
            {wrap ? (
              <text x={cx} y={avatarY + r + 15} textAnchor="middle" className={`text-[11.5px] ${d.selected ? "fill-[var(--wine)] font-bold" : "fill-[var(--ink-2)]"}`}>
                {splitName(d.label).map((line, li) => (
                  <tspan key={li} x={cx} dy={li === 0 ? 0 : 14}>
                    {line}
                  </tspan>
                ))}
                {d.rank && (
                  <tspan x={cx} dy={splitName(d.label).length === 1 ? 30 : 16} className="fill-[var(--muted)] text-[10.5px]">
                    {d.rank}
                  </tspan>
                )}
              </text>
            ) : (
              <text
                transform={`translate(${cx + 3},${avatarY + r + 10}) rotate(-45)`}
                textAnchor="end"
                className={`text-[11.5px] ${d.selected ? "fill-[var(--wine)] font-bold" : "fill-[var(--ink-2)]"}`}
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Rows({
  data,
  max,
  ariaLabel,
  onActivate,
  setTip,
  containerWidth,
}: {
  data: BarDatum[];
  max: number;
  ariaLabel: string;
  onActivate?: (id: string) => void;
  setTip: SetTip;
  containerWidth: number;
}) {
  const nameCol = containerWidth < 360 ? 150 : containerWidth < 520 ? 162 : 196;
  return (
    <ol aria-label={ariaLabel} className="flex flex-col gap-1">
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
              aria-label={`${i + 1}. ${d.label}: ${d.display}. Double-tap to open profile.`}
              onMouseEnter={show}
              onFocus={show}
              onBlur={() => setTip(null)}
              onClick={() => onActivate?.(d.id)}
              className={`grid w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors ${
                d.selected ? "bg-wine-soft" : "hover:bg-surface-2"
              }`}
              style={{ gridTemplateColumns: `${nameCol}px 1fr auto` }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="tabular w-6 shrink-0 text-right text-[11px] text-muted" title={d.rank}>
                  {d.rank ? d.rank.replace(" tie", "=") : `#${i + 1}`}
                </span>
                <HeroAvatar name={d.label} photo={d.photo} industry={d.industry} size={containerWidth < 520 ? 26 : 28} />
                <span className={`line-clamp-2 text-[13px] leading-tight ${d.selected ? "font-bold text-wine" : "text-ink"}`} title={d.label}>
                  {d.label}
                </span>
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
              <span className={`tabular min-w-[3.4rem] text-right text-[12.5px] ${d.selected ? "font-bold" : "font-semibold"} text-ink`}>
                {d.display}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** "Allari Naresh" → ["Allari", "Naresh"]; long names keep at most two lines. */
function splitName(name: string): string[] {
  const parts = name.split(" ");
  if (parts.length === 1) return [name];
  const half = Math.ceil(parts.length / 2);
  return [parts.slice(0, half).join(" "), parts.slice(half).join(" ")];
}
