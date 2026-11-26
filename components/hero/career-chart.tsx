"use client";

import { useState } from "react";
import { ChartTooltip, type TooltipState } from "@/components/charts/chart-tooltip";
import { useElementWidth } from "@/components/charts/use-width";
import { RESULT_LEVELS } from "@/lib/constants/results";

export { RESULT_LEVELS };
const LEVEL = new Map<string, number>(RESULT_LEVELS.map((l, i) => [l.key, i]));

export interface CareerPoint {
  id: string;
  title: string;
  /** ISO date when known, else null (the film sits mid-year). */
  date: string | null;
  year: number;
  result: string | null;
  gross: string | null;
  score: number | null;
  note?: string | null;
}

const NO_RESULT = "#b9aca2";

function when(p: CareerPoint) {
  if (p.date) {
    const d = new Date(p.date + "T00:00:00Z");
    const start = Date.UTC(d.getUTCFullYear(), 0, 1);
    return d.getUTCFullYear() + (d.getTime() - start) / (365.25 * 864e5);
  }
  return p.year + 0.5;
}

/**
 * Every lead film as a dot on a ladder of box-office results (disaster at the bottom, blockbuster
 * at the top), joined in release order. Films with no reported result sit on a strip below.
 * An announced next film is drawn as a dashed "?" at the end.
 */
export function CareerChart({ points, next, name, height = 300 }: { points: CareerPoint[]; next?: { title: string; year: number | null } | null; name: string; height?: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const [tip, setTip] = useState<TooltipState | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const sorted = [...points].sort((a, b) => when(a) - when(b));
  if (!sorted.length) return <p className="text-sm text-muted">No dated films.</p>;

  const narrow = width < 480;
  const left = narrow ? 76 : 104;
  const right = 18;
  const top = 14;
  const strip = 34;
  const bottom = 26;
  const plotH = height - top - bottom - strip;
  const nextX = next ? Math.max(when(sorted[sorted.length - 1]) + 0.25, (next.year ?? 0) + 0.5) : null;
  const x0 = Math.floor(when(sorted[0]));
  const x1 = Math.ceil(Math.max(when(sorted[sorted.length - 1]), nextX ?? 0) + 0.01);
  const sx = (t: number) => left + ((t - x0) / Math.max(1, x1 - x0)) * (width - left - right);
  const rowH = plotH / (RESULT_LEVELS.length - 1);
  const sy = (level: number) => top + plotH - level * rowH;
  const stripY = top + plotH + strip / 2 + 6;
  const y = (p: CareerPoint) => (p.result && LEVEL.has(p.result) ? sy(LEVEL.get(p.result)!) : stripY);
  const judged = sorted.filter((p) => p.result && LEVEL.has(p.result));
  const path = judged.map((p, i) => `${i ? "L" : "M"}${sx(when(p)).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const years = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i);
  const step = Math.max(1, Math.ceil(years.length / (narrow ? 5 : 10)));

  const show = (p: CareerPoint, cx: number, cy: number) => {
    setActive(p.id);
    const lvl = p.result ? RESULT_LEVELS[LEVEL.get(p.result) ?? -1] : null;
    setTip({
      x: cx,
      y: cy - 8,
      content: (
        <div>
          <p className="font-semibold text-ink">{p.title}</p>
          <p className="text-ink-2">{p.date ? new Date(p.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : p.year}</p>
          <p className="mt-1 flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: lvl?.color ?? NO_RESULT }} />
            <span className="font-medium text-ink">{lvl?.label ?? "No result reported"}</span>
          </p>
          {p.gross && <p className="text-ink-2">Worldwide gross {p.gross}</p>}
          {p.score !== null && <p className="text-ink-2">Film score {p.score.toFixed(1)}</p>}
          {p.note && <p className="mt-1 text-muted">{p.note}</p>}
        </div>
      ),
    });
  };

  return (
    <div
      ref={ref}
      role="figure"
      aria-label={`${name}: box-office result of every lead film, in release order`}
      className="relative"
      onPointerLeave={() => { setTip(null); setActive(null); }}
    >
      <svg width={width} height={height} className="block select-none">
        {RESULT_LEVELS.map((l, i) => (
          <g key={l.key}>
            <line x1={left} x2={width - right} y1={sy(i)} y2={sy(i)} stroke="var(--color-line, #e5ded4)" strokeDasharray={l.key === "average" ? "0" : "2 4"} />
            <circle cx={left - 6} cy={sy(i)} r={3} fill={l.color} aria-hidden="true" />
            <text x={left - 13} y={sy(i)} dy="0.32em" textAnchor="end" fontSize={narrow ? 10 : 11} fill="var(--color-ink-2, #5b4b45)" fontWeight={600}>
              {narrow ? l.label.replace("Below average", "Below avg").replace("Above average", "Above avg") : l.label}
            </text>
          </g>
        ))}
        <circle cx={left - 6} cy={stripY} r={3} fill="var(--color-surface, #fff)" stroke={NO_RESULT} strokeWidth={1.5} aria-hidden="true" />
        <text x={left - 13} y={stripY} dy="0.32em" textAnchor="end" fontSize={narrow ? 10 : 11} fill="var(--color-muted, #665851)">No result</text>
        <line x1={left} x2={width - right} y1={stripY} y2={stripY} stroke="var(--color-line, #e5ded4)" strokeDasharray="1 5" />
        {years.filter((_, i) => i % step === 0).map((yr) => (
          <text key={yr} x={sx(yr)} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted, #665851)" className="num">{yr}</text>
        ))}
        <path d={path} fill="none" stroke="var(--color-ink-2, #5b524a)" strokeWidth={1.8} strokeLinejoin="round" opacity={0.55} />
        {nextX !== null && judged.length > 0 && (
          <g>
            <line x1={sx(when(judged[judged.length - 1]))} y1={y(judged[judged.length - 1])} x2={sx(nextX)} y2={sy(3.5)} stroke="var(--color-ink-2, #5b524a)" strokeDasharray="4 4" opacity={0.6} />
            <circle cx={sx(nextX)} cy={sy(3.5)} r={11} fill="var(--color-surface, #fff)" stroke="#a3284f" strokeWidth={2} strokeDasharray="3 2" />
            <text x={sx(nextX)} y={sy(3.5)} dy="0.35em" textAnchor="middle" fontSize={13} fontWeight={700} fill="#a3284f">?</text>
            <text x={sx(nextX)} y={sy(3.5) - 18} textAnchor="end" fontSize={11} fontWeight={600} fill="#a3284f">{next!.title}</text>
          </g>
        )}
        {sorted.map((p) => {
          const cx = sx(when(p));
          const cy = y(p);
          const lvl = p.result ? RESULT_LEVELS[LEVEL.get(p.result) ?? -1] : null;
          const on = active === p.id;
          return (
            <g
              key={p.id}
              tabIndex={0}
              role="button"
              aria-label={`${p.title}, ${p.year}: ${lvl?.label ?? "no result reported"}`}
              className="cursor-pointer outline-none"
              onPointerEnter={() => show(p, cx, cy)}
              onPointerDown={() => show(p, cx, cy)}
              onFocus={() => show(p, cx, cy)}
              onBlur={() => { setTip(null); setActive(null); }}
            >
              <circle cx={cx} cy={cy} r={14} fill="transparent" />
              <circle cx={cx} cy={cy} r={on ? 8 : 6} fill={lvl?.color ?? "var(--color-surface, #fff)"} stroke={lvl ? "#fff" : NO_RESULT} strokeWidth={lvl ? 1.5 : 2} />
            </g>
          );
        })}
      </svg>
      <ChartTooltip state={tip} containerWidth={width} />
    </div>
  );
}
