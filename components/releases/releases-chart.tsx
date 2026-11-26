"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChartTooltip, type TooltipState } from "@/components/charts/chart-tooltip";
import { niceMax, useElementWidth } from "@/components/charts/use-width";

export interface YearPoint {
  year: number;
  total: number;
  theatrical: number;
  ott: number;
  dubbed: number;
  wikipedia: number;
  extra: number;
  partial: boolean;
}

/** Fixed order and colours (validated for colour-vision separation and 3:1 contrast on the card surface). */
const SERIES = [
  { key: "total", label: "All releases", color: "#4a3aa7", width: 3 },
  // Reference line for checking: the plain count of Wikipedia's yearly list (dashed, neutral).
  { key: "wikipedia", label: "Wikipedia list only", color: "#7d6d65", width: 2, dash: "5 5" },
  { key: "theatrical", label: "Telugu, in theatres", color: "#a3284f", width: 2 },
  { key: "dubbed", label: "Dubbed into Telugu", color: "#b98200", width: 2 },
  { key: "ott", label: "Telugu, direct to OTT", color: "#00879e", width: 2 },
] as { key: "total" | "wikipedia" | "theatrical" | "dubbed" | "ott"; label: string; color: string; width: number; dash?: string }[];
type Key = "total" | "wikipedia" | "theatrical" | "dubbed" | "ott";

/**
 * Releases per year as lines that draw themselves the first time the chart scrolls into view (instantly for
 * reduced motion). Hover or tap a year for its numbers; with `linkYears`, a click opens that year's list.
 */
export function ReleasesChart({ data, height = 320, selected, linkYears = false, compact = false }: { data: YearPoint[]; height?: number; selected?: number; linkYears?: boolean; compact?: boolean }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const [drawn, setDrawn] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const shown: Key[] = compact ? ["total"] : SERIES.map((s) => s.key);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const narrow = width < 520;
  const left = 40;
  const right = compact ? 16 : narrow ? 16 : 150;
  const top = 16;
  const bottom = 28;
  const plotW = Math.max(10, width - left - right);
  const plotH = height - top - bottom;
  const max = niceMax(Math.max(...data.map((d) => d.total), 1));
  const sx = (i: number) => left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const sy = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const step = Math.max(1, Math.ceil(data.length / (narrow ? 5 : 9)));
  const path = (k: Key) => data.map((d, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(d[k]).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];

  // Direct labels at the right end, nudged apart so they never overlap.
  const labels = SERIES.filter((s) => shown.includes(s.key))
    .map((s) => ({ ...s, y: sy(last[s.key]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 15) labels[i].y = labels[i - 1].y + 15;

  const show = (i: number) => {
    const d = data[i];
    setHover(i);
    setTip({
      x: sx(i),
      y: sy(d.total) - 4,
      content: (
        <div>
          <p className="font-semibold text-ink">
            {d.year}
            {d.partial ? " (so far)" : ""}
          </p>
          <ul className="mt-1 space-y-0.5">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span aria-hidden className="h-[3px] w-3 rounded" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular font-semibold text-ink">{d[s.key]}</span>
              </li>
            ))}
          </ul>
          {linkYears && <p className="mt-1.5 text-[11px] text-muted">Click to see the list</p>}
        </div>
      ),
    });
  };

  return (
    <div ref={box}>
      {!compact && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-0 w-4" style={{ borderTop: `${s.dash ? 2 : 3}px ${s.dash ? "dashed" : "solid"} ${s.color}` }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div
        ref={ref}
        role="figure"
        aria-label="Telugu releases per year since 2000"
        className="relative"
        onMouseLeave={() => (setHover(null), setTip(null))}
      >
        <svg width={width} height={height} className="block select-none">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={left + plotW} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeDasharray={t ? "2 4" : undefined} />
              <text x={left - 8} y={sy(t) + 4} textAnchor="end" className="fill-muted text-[11px]">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            (data.length - 1 - i) % step === 0 ? (
              <text key={d.year} x={sx(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                {d.year}
              </text>
            ) : null,
          )}
          {selected !== undefined && data.some((d) => d.year === selected) && (
            <line x1={sx(data.findIndex((d) => d.year === selected))} x2={sx(data.findIndex((d) => d.year === selected))} y1={top} y2={top + plotH} stroke="var(--wine)" strokeOpacity={0.35} strokeWidth={2} />
          )}
          {hover !== null && <line x1={sx(hover)} x2={sx(hover)} y1={top} y2={top + plotH} stroke="var(--ink-2)" strokeOpacity={0.4} />}
          {SERIES.filter((s) => shown.includes(s.key)).map((s, si) => (
            <path
              key={s.key}
              d={path(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width}
              strokeLinejoin="round"
              strokeLinecap={s.dash ? "butt" : "round"}
              {...(s.dash
                ? // A dashed line fades in (the draw-in trick needs the dash pattern itself).
                  { strokeDasharray: s.dash, style: { opacity: drawn ? 1 : 0, transition: `opacity .8s ease ${1.2 + si * 0.18}s` } }
                : { pathLength: 1, style: { strokeDasharray: 1, strokeDashoffset: drawn ? 0 : 1, transition: `stroke-dashoffset 1.6s cubic-bezier(.2,.7,.2,1) ${si * 0.18}s` } })}
            />
          ))}
          {/* The current year is still running: an open dot. */}
          {SERIES.filter((s) => shown.includes(s.key)).map((s) => (
            <circle key={s.key} cx={sx(data.length - 1)} cy={sy(last[s.key])} r={4} fill={last.partial ? "var(--surface)" : s.color} stroke={s.color} strokeWidth={2} style={{ opacity: drawn ? 1 : 0, transition: "opacity .3s 1.7s" }} />
          ))}
          {hover !== null &&
            SERIES.filter((s) => shown.includes(s.key)).map((s) => <circle key={s.key} cx={sx(hover)} cy={sy(data[hover][s.key])} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />)}
          {!compact &&
            !narrow &&
            labels.map((l) => (
              <text key={l.key} x={left + plotW + 10} y={l.y + 4} className="fill-ink-2 text-[11.5px]" style={{ opacity: drawn ? 1 : 0, transition: "opacity .4s 1.6s" }}>
                {l.label.replace("Telugu, ", "")} · <tspan className="font-semibold fill-ink">{last[l.key]}</tspan>
              </text>
            ))}
          {/* Hit areas: one column per year. */}
          {data.map((d, i) => {
            const w = plotW / Math.max(1, data.length - 1);
            const open = () => linkYears && router.push(`/releases?year=${d.year}#list`, { scroll: false });
            return (
              <rect
                key={d.year}
                x={sx(i) - w / 2}
                y={top}
                width={w}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role={linkYears ? "link" : "button"}
                aria-label={`${d.year}: ${d.total} releases${d.partial ? " so far" : ""}`}
                onMouseEnter={() => show(i)}
                onFocus={() => show(i)}
                onTouchStart={() => show(i)}
                onClick={open}
                onKeyDown={(e) => e.key === "Enter" && open()}
                className={`${linkYears ? "cursor-pointer" : ""} outline-none`}
              />
            );
          })}
        </svg>
        <ChartTooltip state={tip} containerWidth={width} />
      </div>
    </div>
  );
}
