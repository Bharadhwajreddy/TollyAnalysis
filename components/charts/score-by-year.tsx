"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { FloatTip, TipRow, type FloatTipState } from "@/components/charts/float-tip";
import { useEnter } from "@/components/charts/use-enter";
import { useElementWidth } from "@/components/charts/use-width";

export interface YearScore {
  year: number;
  avg: number;
  n: number;
}

/**
 * Average film score per release year as a line on an axis fitted to the data (scores sit far from zero, so
 * the axis does not start at 0). The selected year is marked; click a year to open it.
 */
export function ScoreByYear({ data, selected, hrefFor, height = 240 }: { data: YearScore[]; selected?: number; hrefFor?: string; height?: number }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>(640);
  const enter = useEnter<HTMLDivElement>();
  const router = useRouter();
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);

  const left = 36;
  const right = 12;
  const top = 26;
  const bottom = 24;
  const plotW = Math.max(10, width - left - right);
  const plotH = height - top - bottom;
  const vals = data.map((d) => d.avg);
  const lo0 = Math.min(...vals);
  const hi0 = Math.max(...vals);
  const pad = Math.max(1, (hi0 - lo0) * 0.1);
  const step = hi0 - lo0 + 2 * pad > 12 ? 5 : 2;
  const lo = Math.floor((lo0 - pad) / step) * step;
  const hi = Math.ceil((hi0 + pad) / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t);
  const y0 = data[0].year;
  const y1 = data[data.length - 1].year;
  const x = (yr: number) => left + ((yr - y0) / Math.max(1, y1 - y0)) * plotW;
  const y = (v: number) => top + plotH - ((v - lo) / (hi - lo)) * plotH;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(d.year).toFixed(1)},${y(d.avg).toFixed(1)}`).join("");
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const every = width < 480 ? 5 : width < 820 ? 2 : 1;

  const show = (i: number | null) => {
    setHover(i);
    if (i === null || !svg.current) return setTip(null);
    const d = data[i];
    const r = svg.current.getBoundingClientRect();
    setTip({
      x: r.left + x(d.year),
      y: r.top + y(d.avg) - 4,
      y2: r.top + y(d.avg) + 4,
      content: (
        <div className="min-w-[170px]">
          <p className="mb-1 font-semibold text-ink">{d.year}</p>
          <TipRow k="Average film score" v={d.avg.toFixed(1)} />
          <TipRow k="Films scored" v={d.n} />
          {hrefFor && <p className="mt-1.5 text-[11px] text-muted">Click to open {d.year}</p>}
        </div>
      ),
    });
  };
  const nearest = (clientX: number) => {
    if (!svg.current) return null;
    const px = clientX - svg.current.getBoundingClientRect().left;
    const yr = Math.round(y0 + ((px - left) / plotW) * (y1 - y0));
    const i = data.findIndex((d) => d.year === yr);
    return i >= 0 ? i : null;
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
          aria-label={`Average film score by release year, ${y0} to ${y1}: from ${lo0.toFixed(1)} to ${hi0.toFixed(1)}.`}
          onKeyDown={onKey}
          onBlur={() => show(null)}
          onMouseMove={(e) => show(nearest(e.clientX))}
          onMouseLeave={() => show(null)}
          onClick={(e) => {
            const i = nearest(e.clientX);
            if (i !== null) open(i);
          }}
          className={`block select-none overflow-visible outline-none ${hrefFor ? "cursor-pointer" : ""}`}
        >
          <text x={left - 30} y={12} className="fill-muted text-[11px]">
            Average film score, 0–100 scale (axis fitted to the data)
          </text>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
              <text x={left - 8} y={y(t) + 4} textAnchor="end" className="tabular fill-muted text-[11px]">
                {t}
              </text>
            </g>
          ))}
          <line x1={left} x2={left + plotW} y1={y(mean)} y2={y(mean)} stroke="var(--field-2)" strokeDasharray="3 3" />
          <text x={left + plotW} y={y(mean) - 5} textAnchor="end" className="tabular fill-muted text-[10.5px]">
            average {mean.toFixed(1)}
          </text>
          {data.map((d, i) =>
            i % every === (data.length - 1) % every || d.year === selected ? (
              <text key={d.year} x={x(d.year)} y={height - 6} textAnchor="middle" className={`tabular text-[11px] ${d.year === selected ? "fill-ink font-semibold" : "fill-muted"}`}>
                {d.year}
              </text>
            ) : null,
          )}
          {hover !== null && <line x1={x(data[hover].year)} x2={x(data[hover].year)} y1={top} y2={top + plotH} stroke="var(--ink-2)" strokeOpacity={0.3} />}
          <path d={path} fill="none" stroke="var(--ink)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" className="fade-mark" />
          {data.map((d, i) => {
            const sel = d.year === selected;
            const on = hover === i;
            return (
              <circle
                key={d.year}
                className="fade-mark"
                style={{ ["--d" as string]: `${i * 10}ms` }}
                cx={x(d.year)}
                cy={y(d.avg)}
                r={sel || on ? 5 : 3}
                fill={sel ? "var(--accent)" : on ? "var(--ink)" : "var(--surface)"}
                stroke={sel ? "var(--surface)" : "var(--ink)"}
                strokeWidth={sel ? 2 : 1.5}
              />
            );
          })}
        </svg>
      </div>
      <FloatTip state={tip} />
    </div>
  );
}
