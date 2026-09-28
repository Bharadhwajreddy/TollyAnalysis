"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChartTooltip, type TooltipState } from "./chart-tooltip";
import { layoutLabels } from "./label-layout";
import { AvatarClipDef, SvgAvatar } from "./svg-avatar";
import { useElementWidth } from "./use-width";

export interface ParetoDatum {
  id: string;
  label: string;
  photo: string | null;
  x: number;
  y: number;
  color: string;
  selected?: boolean;
  /** Lower = more important; decides which names are always shown. */
  priority: number;
  tooltip: ReactNode;
}

interface Props {
  data: ParetoDatum[];
  xLabel: string;
  yLabel: string;
  xHigherIsBetter: boolean;
  yHigherIsBetter: boolean;
  /** Natural maximum of an axis (e.g. 100 for %, 10 for ratings). */
  xMax?: number;
  yMax?: number;
  onActivate?: (id: string) => void;
  ariaLabel: string;
  height?: number;
}

/**
 * Heroes on the "best trade-off" (Pareto) line: nobody else is at least as good
 * on both axes and better on one.
 */
export function paretoFrontier<T extends { id: string; x: number; y: number }>(points: T[], xHigher: boolean, yHigher: boolean): T[] {
  const sx = xHigher ? 1 : -1;
  const sy = yHigher ? 1 : -1;
  const sorted = [...points].sort((a, b) => sx * (b.x - a.x) || sy * (b.y - a.y));
  const out: T[] = [];
  let best = -Infinity;
  for (const p of sorted) {
    if (sy * p.y > best) {
      out.push(p);
      best = sy * p.y;
    }
  }
  return out.sort((a, b) => a.x - b.x);
}

function niceDomain(values: number[], cap?: number): [number, number] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(1e-6, hi - lo);
  const step = span > 60 ? 20 : span > 25 ? 10 : span > 10 ? 5 : span > 4 ? 2 : span > 1.5 ? 0.5 : 0.2;
  let a = Math.floor((lo - span * 0.06) / step) * step;
  if (lo >= 0 && a < 0) a = 0;
  let b = Math.ceil((hi + span * 0.06) / step) * step;
  if (cap !== undefined) b = Math.min(b, cap);
  return [a, b <= a ? a + step : b];
}

function niceTicks([a, b]: [number, number]): number[] {
  const span = b - a;
  const step = span > 60 ? 20 : span > 25 ? 10 : span > 10 ? 5 : span > 4 ? 2 : span > 1.5 ? 0.5 : 0.2;
  const out: number[] = [];
  for (let t = Math.ceil(a / step) * step; t <= b + 1e-9; t += step) out.push(Math.round(t * 100) / 100);
  return out;
}

export function ParetoChart({ data, xLabel, yLabel, xHigherIsBetter, yHigherIsBetter, xMax, yMax, onActivate, ariaLabel, height: h0 }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const compact = width > 0 && width < 560;
  const height = h0 ?? (compact ? 420 : 540);
  const m = { top: 18, right: compact ? 14 : 26, bottom: 46, left: 50 };
  const plotW = Math.max(10, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;

  const layout = useMemo(() => {
    if (width === 0 || data.length === 0) return null;
    const xd = niceDomain(data.map((d) => d.x), xMax);
    const yd = niceDomain(data.map((d) => d.y), yMax);
    const sx = (v: number) => m.left + ((v - xd[0]) / (xd[1] - xd[0])) * plotW;
    const sy = (v: number) => m.top + plotH - ((v - yd[0]) / (yd[1] - yd[0])) * plotH;
    const r = compact ? 9 : data.length > 50 ? 12 : 14;
    const frontier = paretoFrontier(data, xHigherIsBetter, yHigherIsBetter);
    const onFrontier = new Set(frontier.map((f) => f.id));
    const points = data.map((d) => ({ ...d, px: sx(d.x), py: sy(d.y), frontier: onFrontier.has(d.id) }));
    const labelCap = compact ? 4 : 10;
    const labelled = points.filter((p) => p.frontier || p.priority < labelCap || p.selected || p.id === revealed);
    const labels = layoutLabels(
      labelled.map((p) => ({ id: p.id, text: p.label, ax: p.px, ay: p.py, r: r + 2 })),
      points.map((p) => ({ x: p.px, y: p.py, r: r + 2 })),
      { width, height: height - m.bottom + 4 },
      compact ? 5.9 : 6.3,
    );
    return { xd, yd, sx, sy, r, points, frontier, labels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, compact, revealed, xHigherIsBetter, yHigherIsBetter, height, xMax, yMax]);

  const betterX = xHigherIsBetter ? "right" : "left";
  const betterY = yHigherIsBetter ? "top" : "bottom";

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setTip(null)}>
      {width === 0 && <div style={{ height }} aria-hidden />}
      {layout && (
        <svg width={width} height={height} role="group" aria-label={ariaLabel} className="block">
          <defs>
            <AvatarClipDef />
          </defs>
          {niceTicks(layout.xd).map((t) => (
            <g key={`x${t}`}>
              <line x1={layout.sx(t)} x2={layout.sx(t)} y1={m.top} y2={m.top + plotH} stroke="var(--grid)" />
              <text x={layout.sx(t)} y={m.top + plotH + 16} textAnchor="middle" className="tabular fill-[var(--muted)] text-[10.5px]">
                {t}
              </text>
            </g>
          ))}
          {niceTicks(layout.yd).map((t) => (
            <g key={`y${t}`}>
              <line x1={m.left} x2={m.left + plotW} y1={layout.sy(t)} y2={layout.sy(t)} stroke="var(--grid)" />
              <text x={m.left - 7} y={layout.sy(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--muted)] text-[10.5px]">
                {t}
              </text>
            </g>
          ))}
          <line x1={m.left} x2={m.left + plotW} y1={m.top + plotH} y2={m.top + plotH} stroke="var(--axis)" />
          <line x1={m.left} x2={m.left} y1={m.top} y2={m.top + plotH} stroke="var(--axis)" />

          {/* "Better" corner hint */}
          <text
            x={betterX === "right" ? m.left + plotW - 6 : m.left + 6}
            y={betterY === "top" ? m.top + 14 : m.top + plotH - 8}
            textAnchor={betterX === "right" ? "end" : "start"}
            className="fill-[var(--good)] text-[11.5px] font-semibold"
          >
            {betterY === "top" ? (betterX === "right" ? "Better ↗" : "↖ Better") : betterX === "right" ? "Better ↘" : "↙ Better"}
          </text>

          {/* Best trade-off (Pareto) line */}
          {layout.frontier.length > 1 && (
            <polyline
              points={layout.frontier.map((f) => `${layout.sx(f.x)},${layout.sy(f.y)}`).join(" ")}
              fill="none"
              stroke="var(--wine)"
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          <text x={m.left + plotW / 2} y={height - 8} textAnchor="middle" className="fill-[var(--ink)] text-[12.5px] font-semibold">
            {xLabel}
          </text>
          <text
            transform={`translate(13,${m.top + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-[var(--ink)] text-[12.5px] font-semibold"
          >
            {yLabel}
          </text>

          {layout.labels
            .filter((l) => l.displaced)
            .map((l) => (
              <line key={`ll${l.id}`} x1={l.ax} y1={l.ay} x2={l.x - l.w / 2 + 2} y2={l.y} stroke="var(--axis)" strokeWidth={1} />
            ))}

          {[...layout.points]
            .sort((a, b) => Number(!!a.selected) - Number(!!b.selected) || Number(a.frontier) - Number(b.frontier))
            .map((p) => {
              const show = () => setTip({ x: p.px, y: p.py - layout.r - 4, content: p.tooltip });
              return (
                <g
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.label}: ${xLabel} ${p.x}, ${yLabel} ${p.y}${p.frontier ? ", on the best trade-off line" : ""}. Double-tap to open profile.`}
                  className="cursor-pointer outline-none"
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={() => setTip(null)}
                  onClick={() => {
                    setRevealed(p.id);
                    onActivate?.(p.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onActivate?.(p.id);
                    }
                  }}
                >
                  <circle cx={p.px} cy={p.py} r={Math.max(14, layout.r + 4)} fill="transparent" />
                  <SvgAvatar cx={p.px} cy={p.py} r={layout.r} photo={p.photo} name={p.label} color={p.color} selected={p.selected} />
                </g>
              );
            })}

          {layout.labels.map((l) => {
            const p = layout.points.find((x) => x.id === l.id)!;
            return (
              <text
                key={`t${l.id}`}
                x={l.x}
                y={l.y}
                dy="0.32em"
                textAnchor="middle"
                paintOrder="stroke"
                stroke="var(--surface)"
                strokeWidth={3.5}
                strokeLinejoin="round"
                className={`pointer-events-none text-[11.5px] ${p.selected ? "fill-[var(--wine)] font-bold" : p.frontier ? "fill-[var(--ink)] font-semibold" : "fill-[var(--ink-2)]"}`}
              >
                {l.text}
              </text>
            );
          })}
        </svg>
      )}
      <ChartTooltip state={tip} containerWidth={width} />
    </div>
  );
}
