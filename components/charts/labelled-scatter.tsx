"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChartTooltip, type TooltipState } from "./chart-tooltip";
import { layoutLabels } from "./label-layout";
import { useElementWidth } from "./use-width";

export interface ScatterDatum {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number | null;
  color: string;
  selected?: boolean;
  /** Lower = more important; used to decide which labels show on small screens. */
  priority: number;
  tooltip: ReactNode;
}

interface Props {
  data: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  quadrantLabel: string;
  sizeDomain: [number, number];
  onSelect?: (id: string) => void;
  ariaLabel: string;
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};

function paddedDomain(values: number[]): [number, number] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(2, (hi - lo) * 0.08);
  return [Math.max(0, Math.floor((lo - pad) / 5) * 5), Math.min(100, Math.ceil((hi + pad) / 5) * 5)];
}

/** Ticks on multiples of 5 (or 10 for wide ranges) inside the domain. */
function roundTicks([lo, hi]: [number, number]): number[] {
  const step = hi - lo > 40 ? 10 : 5;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(t);
  return out;
}

export function LabelledScatter({ data, xLabel, yLabel, quadrantLabel, sizeDomain, onSelect, ariaLabel }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const compact = width > 0 && width < 640;
  const height = compact ? 380 : 480;
  const m = { top: 16, right: compact ? 12 : 24, bottom: 44, left: 46 };
  const plotW = Math.max(10, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;

  const layout = useMemo(() => {
    if (width === 0 || data.length === 0) return null;
    const xd = paddedDomain(data.map((d) => d.x));
    const yd = paddedDomain(data.map((d) => d.y));
    const sx = (v: number) => m.left + ((v - xd[0]) / (xd[1] - xd[0])) * plotW;
    const sy = (v: number) => m.top + plotH - ((v - yd[0]) / (yd[1] - yd[0])) * plotH;
    const [s0, s1] = sizeDomain;
    const rMin = compact ? 4 : 5;
    const rMax = compact ? 11 : 15;
    const sr = (v: number | null) =>
      v === null ? rMin : rMin + Math.sqrt(Math.max(0, (v - s0) / Math.max(1e-9, s1 - s0))) * (rMax - rMin);
    const points = data.map((d) => ({ ...d, px: sx(d.x), py: sy(d.y), r: sr(d.size) }));
    const labelCap = compact ? 8 : Infinity;
    const labelled = points.filter((p) => p.priority < labelCap || p.selected || p.id === revealed);
    const labels = layoutLabels(
      labelled.map((p) => ({ id: p.id, text: p.label, ax: p.px, ay: p.py, r: p.r })),
      points.map((p) => ({ x: p.px, y: p.py, r: p.r })),
      { width, height: height - m.bottom + 6 },
      compact ? 5.8 : 6.1,
    );
    const xm = median(data.map((d) => d.x));
    const ym = median(data.map((d) => d.y));
    return { xd, yd, sx, sy, points, labels, xm, ym };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, compact, revealed, sizeDomain[0], sizeDomain[1]]);

  const xTicks = layout ? roundTicks(layout.xd) : [];
  const yTicks = layout ? roundTicks(layout.yd) : [];

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setTip(null)}>
      {width === 0 && <div style={{ height }} aria-hidden />}
      {layout && (
        <svg width={width} height={height} role="group" aria-label={ariaLabel} className="block">
          {/* Upper-right quadrant highlight */}
          <rect
            x={layout.sx(layout.xm)}
            y={m.top}
            width={Math.max(0, m.left + plotW - layout.sx(layout.xm))}
            height={Math.max(0, layout.sy(layout.ym) - m.top)}
            fill="var(--teal-soft)"
            opacity={0.7}
          />
          <text
            x={m.left + plotW - 6}
            y={m.top + 14}
            textAnchor="end"
            paintOrder="stroke"
            stroke="var(--teal-soft)"
            strokeWidth={4}
            className="fill-[#00596a] text-[11px] font-medium"
          >
            {quadrantLabel}
          </text>
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={layout.sx(t)} x2={layout.sx(t)} y1={m.top} y2={m.top + plotH} stroke="var(--grid)" />
              <text x={layout.sx(t)} y={m.top + plotH + 16} textAnchor="middle" className="tabular fill-[var(--muted)] text-[10px]">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={m.left} x2={m.left + plotW} y1={layout.sy(t)} y2={layout.sy(t)} stroke="var(--grid)" />
              <text x={m.left - 6} y={layout.sy(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--muted)] text-[10px]">
                {Math.round(t)}
              </text>
            </g>
          ))}
          <line x1={m.left} x2={m.left + plotW} y1={m.top + plotH} y2={m.top + plotH} stroke="var(--axis)" />
          {/* Median reference lines */}
          <line x1={layout.sx(layout.xm)} x2={layout.sx(layout.xm)} y1={m.top} y2={m.top + plotH} stroke="var(--muted)" strokeDasharray="4 4" />
          <line x1={m.left} x2={m.left + plotW} y1={layout.sy(layout.ym)} y2={layout.sy(layout.ym)} stroke="var(--muted)" strokeDasharray="4 4" />
          <text x={layout.sx(layout.xm) + 4} y={m.top + plotH - 6} className="fill-[var(--muted)] text-[10px]">
            median {layout.xm.toFixed(1)}
          </text>
          <text x={m.left + 4} y={layout.sy(layout.ym) - 5} className="fill-[var(--muted)] text-[10px]">
            median {layout.ym.toFixed(1)}
          </text>
          <text x={m.left + plotW / 2} y={height - 6} textAnchor="middle" className="fill-[var(--ink-2)] text-[12px] font-medium">
            {xLabel} →
          </text>
          <text
            transform={`translate(12,${m.top + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-[var(--ink-2)] text-[12px] font-medium"
          >
            {yLabel} →
          </text>

          {/* Leader lines for displaced labels */}
          {layout.labels
            .filter((l) => l.displaced)
            .map((l) => (
              <line
                key={`ll${l.id}`}
                x1={l.ax}
                y1={l.ay}
                x2={l.x - l.w / 2 + 2}
                y2={l.y}
                stroke="var(--axis)"
                strokeWidth={1}
              />
            ))}

          {[...layout.points]
            .sort((a, b) => (a.selected ? 1 : 0) - (b.selected ? 1 : 0) || b.r - a.r)
            .map((p) => {
              const show = () => setTip({ x: p.px, y: p.py - p.r, content: p.tooltip });
              return (
                <g
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.label}: ${xLabel} ${p.x.toFixed(1)}, ${yLabel} ${p.y.toFixed(1)}`}
                  className="cursor-pointer outline-none [&:focus-visible>circle:last-child]:stroke-[var(--focus)]"
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={() => setTip(null)}
                  onClick={() => {
                    setRevealed(p.id);
                    onSelect?.(p.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(p.id);
                    }
                  }}
                >
                  <circle cx={p.px} cy={p.py} r={Math.max(12, p.r + 4)} fill="transparent" />
                  <circle
                    cx={p.px}
                    cy={p.py}
                    r={p.r}
                    fill={p.color}
                    fillOpacity={p.selected ? 1 : 0.82}
                    stroke={p.selected ? "var(--ink)" : "var(--surface)"}
                    strokeWidth={2}
                    className="chart-mark"
                  />
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
                strokeWidth={3}
                strokeLinejoin="round"
                className={`pointer-events-none text-[11px] ${p.selected ? "fill-[var(--wine)] font-bold" : "fill-[var(--ink)] font-medium"}`}
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
