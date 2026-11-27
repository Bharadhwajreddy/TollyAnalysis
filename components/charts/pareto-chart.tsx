"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FloatTip, TipRow, type FloatTipState } from "@/components/charts/float-tip";
import { useFocus } from "@/components/charts/focus";
import { useElementWidth } from "@/components/charts/use-width";

export interface ScatterPoint {
  id: string;
  label: string;
  img: string | null;
  x: number;
  y: number;
  href?: string;
  /** Extra tooltip rows under the two axis values. */
  extra?: ReactNode;
}

export interface ScatterAxis {
  key: string;
  label: string;
  unit: string;
  log?: boolean;
  /** Lower is better on this axis (the frontier runs the other way). */
  asc?: boolean;
  /** Natural maximum (100 for shares and 0–100 scores): the axis never runs past it. */
  cap?: number;
  fmt: (v: number) => string;
}

/**
 * Points nobody beats on both axes at once (the Pareto set), ordered by x.
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

// ── Scales ─────────────────────────────────────────────────────────────────

function niceStep(span: number, n = 5): number {
  const raw = Math.max(span, 1e-6) / n;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

interface Scale {
  domain: [number, number];
  ticks: number[];
  /** 0..1 position */
  t: (v: number) => number;
}

function linearScale(values: number[], tickN: number, cap?: number): Scale {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(1e-6, hi - lo);
  const step = niceStep(span * 1.1, tickN);
  let a = Math.floor((lo - span * 0.04) / step) * step;
  if (lo >= 0 && a < 0) a = 0;
  let b = Math.ceil((hi + span * 0.04) / step) * step;
  if (cap !== undefined && b > cap) b = Math.max(cap, hi);
  const ticks: number[] = [];
  for (let v = a; v <= b + step * 1e-6; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { domain: [a, b], ticks, t: (v) => (v - a) / Math.max(1e-9, b - a) };
}

function logScale(values: number[], tickN: number): Scale {
  const pos = values.filter((v) => v > 0);
  const lo = Math.log10(Math.min(...pos));
  const hi = Math.log10(Math.max(...pos));
  const a = Math.floor(lo * 2) / 2;
  const b = Math.ceil(hi * 2) / 2;
  const ticks: number[] = [];
  for (let e = Math.floor(a); e <= Math.ceil(b); e++) {
    for (const m of b - a <= 1.6 ? [1, 2, 5] : b - a <= 3 && tickN > 4 ? [1, 3] : [1]) {
      const v = m * 10 ** e;
      const l = Math.log10(v);
      if (l >= a - 1e-9 && l <= b + 1e-9) ticks.push(v);
    }
  }
  return { domain: [10 ** a, 10 ** b], ticks, t: (v) => (Math.log10(Math.max(v, 1e-9)) - a) / Math.max(1e-9, b - a) };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ── Labels: greedy placement over 8 candidate spots, then further out with a leader line; drop rather than overlap.

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}
const hit = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

function placeLabels(items: { id: string; text: string; x: number; y: number; r: number }[], obstacles: Box[], bounds: Box) {
  const placed: Box[] = [];
  const out: { id: string; x: number; y: number; anchor: "start" | "middle" | "end"; leader: { x1: number; y1: number; x2: number; y2: number } | null }[] = [];
  const H = 14;
  for (const it of items) {
    const w = it.text.length * 6.3 + 4;
    let done = false;
    for (const gap of [4, 16, 30]) {
      const d = it.r + gap;
      const cands: { cx: number; cy: number; anchor: "start" | "middle" | "end" }[] = [
        { cx: it.x + d, cy: it.y, anchor: "start" },
        { cx: it.x - d, cy: it.y, anchor: "end" },
        { cx: it.x, cy: it.y - d - 2, anchor: "middle" },
        { cx: it.x, cy: it.y + d + 3, anchor: "middle" },
        { cx: it.x + d * 0.75, cy: it.y - d * 0.75, anchor: "start" },
        { cx: it.x - d * 0.75, cy: it.y - d * 0.75, anchor: "end" },
        { cx: it.x + d * 0.75, cy: it.y + d * 0.75, anchor: "start" },
        { cx: it.x - d * 0.75, cy: it.y + d * 0.75, anchor: "end" },
      ];
      for (const c of cands) {
        const l = c.anchor === "start" ? c.cx : c.anchor === "end" ? c.cx - w : c.cx - w / 2;
        const box = { l, t: c.cy - H / 2, r: l + w, b: c.cy + H / 2 };
        if (box.l < bounds.l || box.r > bounds.r || box.t < bounds.t || box.b > bounds.b) continue;
        if (placed.some((p) => hit(p, box)) || obstacles.some((o) => hit(o, box))) continue;
        placed.push(box);
        const leader =
          gap > 4
            ? (() => {
                const ex = c.anchor === "start" ? box.l - 1 : c.anchor === "end" ? box.r + 1 : c.cx;
                const ey = c.anchor === "middle" ? (c.cy < it.y ? box.b : box.t) : c.cy;
                const dx = ex - it.x;
                const dy = ey - it.y;
                const len = Math.hypot(dx, dy) || 1;
                return { x1: it.x + (dx / len) * (it.r + 1.5), y1: it.y + (dy / len) * (it.r + 1.5), x2: ex, y2: ey };
              })()
            : null;
        out.push({ id: it.id, x: c.cx, y: c.cy, anchor: c.anchor, leader });
        done = true;
        break;
      }
      if (done) break;
    }
  }
  return out;
}

/** Remember the last value for a short while (so old ticks can fade out while new ones fade in). */
function useLeaving<T>(value: T, key: string, ms = 220): { key: string; value: T } | null {
  const prev = useRef<{ key: string; value: T }>({ key, value });
  const [leaving, setLeaving] = useState<{ key: string; value: T } | null>(null);
  useEffect(() => {
    if (prev.current.key !== key) {
      const old = prev.current;
      const id = requestAnimationFrame(() => setLeaving(old));
      const t = setTimeout(() => setLeaving(null), ms);
      prev.current = { key, value };
      return () => (cancelAnimationFrame(id), clearTimeout(t));
    }
    prev.current = { key, value };
  }, [key, value, ms]);
  return leaving;
}

/**
 * The trade-off scatter: one dot per hero (in `--field`), with faces and names only for the handful that
 * matter (top by the y measure, the frontier, the focused hero), labels placed without collisions and with
 * leader lines when pushed out. Median lines split the field; the Pareto frontier is optional. Changing an
 * axis glides every dot to its new place while the ticks crossfade. Arrow keys walk the dots; Enter opens.
 */
export function ParetoChart({
  points,
  xAxis,
  yAxis,
  frontier = true,
  ariaLabel,
  height: h0,
  maxLabels,
}: {
  points: ScatterPoint[];
  xAxis: ScatterAxis;
  yAxis: ScatterAxis;
  frontier?: boolean;
  ariaLabel: string;
  height?: number;
  maxLabels?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>(900);
  const router = useRouter();
  const { focus } = useFocus();
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);
  const narrow = width < 560;
  const height = h0 ?? (narrow ? 420 : 520);
  const m = { top: 30, right: narrow ? 14 : 24, bottom: 40, left: narrow ? 40 : 50 };
  const W = Math.max(10, width - m.left - m.right);
  const H = height - m.top - m.bottom;
  const focusId = focus?.kind === "hero" ? focus.key : null;

  const L = useMemo(() => {
    if (!points.length) return null;
    const tickN = narrow ? 4 : 6;
    const sx0 = xAxis.log ? logScale(points.map((p) => p.x), tickN) : linearScale(points.map((p) => p.x), tickN, xAxis.cap);
    const sy0 = yAxis.log ? logScale(points.map((p) => p.y), tickN) : linearScale(points.map((p) => p.y), narrow ? 5 : 6, yAxis.cap);
    const px = (v: number) => m.left + sx0.t(v) * W;
    const py = (v: number) => m.top + H - sy0.t(v) * H;
    const pts = points.map((p) => ({ ...p, px: px(p.x), py: py(p.y) }));
    const front = frontier ? paretoFrontier(pts, !xAxis.asc, !yAxis.asc) : [];
    const frontIds = new Set(front.map((p) => p.id));
    // Who gets a face and a name: the best on y, then the best on x, the frontier, and the focused hero.
    const cap = maxLabels ?? (narrow ? 7 : 11);
    const byY = [...pts].sort((a, b) => (yAxis.asc ? a.y - b.y : b.y - a.y));
    const byX = [...pts].sort((a, b) => (xAxis.asc ? a.x - b.x : b.x - a.x));
    const chosen: string[] = [];
    const add = (id: string) => !chosen.includes(id) && chosen.length < cap && chosen.push(id);
    if (focusId && pts.some((p) => p.id === focusId)) chosen.push(focusId);
    for (let i = 0; chosen.length < cap && i < pts.length; i++) {
      add(byY[i].id);
      if (i < 3 || frontIds.has(byX[i].id)) add(byX[i].id);
      if (i < front.length) add(front[front.length - 1 - i].id);
    }
    const labelled = new Set(chosen);
    const R = 11;
    const obstacles: Box[] = pts.map((p) => {
      const r = labelled.has(p.id) ? R + 1 : 4;
      return { l: p.px - r, t: p.py - r, r: p.px + r, b: p.py + r };
    });
    // The median labels are obstacles too.
    const mx0 = px(median(points.map((p) => p.x)));
    const my0 = py(median(points.map((p) => p.y)));
    obstacles.push({ l: mx0, t: m.top, r: mx0 + 96, b: m.top + 14 }, { l: m.left + W - 96, t: my0 - 16, r: m.left + W, b: my0 - 1 });
    const order = chosen.map((id) => pts.find((p) => p.id === id)!);
    const labels = placeLabels(
      order.map((p) => ({ id: p.id, text: p.label, x: p.px, y: p.py, r: R + 1 })),
      obstacles,
      { l: 2, t: m.top - 4, r: width - 2, b: m.top + H + 2 },
    );
    // A face without a name is noise: heroes whose label found no room fall back to dots.
    const placedIds = new Set(labels.map((l) => l.id));
    for (const id of [...labelled]) if (!placedIds.has(id) && id !== focusId) labelled.delete(id);
    const mx = median(points.map((p) => p.x));
    const my = median(points.map((p) => p.y));
    return { sx0, sy0, px, py, pts, front, labelled, labels, mx, my, R };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, xAxis, yAxis, frontier, width, height, narrow, focusId, maxLabels]);

  const xTicks = L ? L.sx0.ticks.map((t) => ({ t, x: L.px(t) })) : [];
  const yTicks = L ? L.sy0.ticks.map((t) => ({ t, y: L.py(t) })) : [];
  const leavingX = useLeaving(xTicks, `${xAxis.key}|${width}`);
  const leavingY = useLeaving(yTicks, `${yAxis.key}|${height}`);

  const show = (id: string | null) => {
    setActive(id);
    const p = id && L ? L.pts.find((q) => q.id === id) : null;
    if (!p || !svg.current) return setTip(null);
    const r = svg.current.getBoundingClientRect();
    const rad = L!.labelled.has(p.id) ? L!.R : 4;
    setTip({
      x: r.left + p.px,
      y: r.top + p.py - rad - 2,
      y2: r.top + p.py + rad + 2,
      content: (
        <div className="min-w-[180px]">
          <p className="mb-1.5 font-semibold leading-tight text-ink">{p.label}</p>
          <TipRow k={xAxis.label} v={xAxis.fmt(p.x)} />
          <TipRow k={yAxis.label} v={yAxis.fmt(p.y)} />
          {p.extra}
        </div>
      ),
    });
  };
  const nearest = (clientX: number, clientY: number) => {
    if (!svg.current || !L) return null;
    const r = svg.current.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    let best: string | null = null;
    let bd = 22 * 22;
    for (const p of L.pts) {
      const d = (p.px - x) ** 2 + (p.py - y) ** 2;
      if (d < bd) {
        bd = d;
        best = p.id;
      }
    }
    return best;
  };
  const onKey = (e: KeyboardEvent) => {
    if (!L) return;
    const dirs: Record<string, [keyof (typeof L.pts)[number], number]> = { ArrowRight: ["px", 1], ArrowLeft: ["px", -1], ArrowUp: ["py", -1], ArrowDown: ["py", 1] };
    const d = dirs[e.key];
    if (d) {
      e.preventDefault();
      const [axis, sign] = d;
      const order = [...L.pts].sort((a, b) => sign * ((a[axis] as number) - (b[axis] as number)));
      const i = active ? order.findIndex((p) => p.id === active) : -1;
      show(order[(i + 1) % order.length].id);
    } else if (e.key === "Enter" && active) {
      const p = L.pts.find((q) => q.id === active);
      if (p?.href) router.push(p.href);
    } else if (e.key === "Escape") show(null);
  };

  const activeP = active && L ? L.pts.find((p) => p.id === active) : null;
  const tickText = (axis: ScatterAxis, t: number) => (axis.log ? axis.fmt(t).replace(/ cr$/, "") : Number.isInteger(t) ? String(t) : t.toFixed(1));

  return (
    <div ref={ref} className="relative w-full">
      {L && (
        <svg
          ref={svg}
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => show(null)}
          onMouseMove={(e) => {
            const id = nearest(e.clientX, e.clientY);
            if (id !== active) show(id);
          }}
          onMouseLeave={() => show(null)}
          onClick={(e) => {
            const id = nearest(e.clientX, e.clientY);
            const p = id ? L.pts.find((q) => q.id === id) : null;
            if (p?.href) router.push(p.href);
          }}
          className={`block select-none overflow-visible outline-none ${activeP?.href ? "cursor-pointer" : ""}`}
        >
          <defs>
            <clipPath id={`${uid}-c`} clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
            </clipPath>
          </defs>

          {/* Grid + ticks (old set fades out while the new set fades in) */}
          {leavingX && (
            <g key={`xo-${leavingX.key}`} aria-hidden style={{ animation: "vt-fade-out 140ms var(--ease-exit) both" }}>
              {leavingX.value.map(({ t, x }) => (
                <g key={t}>
                  <line x1={x} x2={x} y1={m.top} y2={m.top + H} stroke="var(--grid)" />
                  <text x={x} y={m.top + H + 16} textAnchor="middle" className="tabular fill-muted text-[11px]">
                    {tickText(xAxis, t)}
                  </text>
                </g>
              ))}
            </g>
          )}
          <g key={`x-${xAxis.key}`} aria-hidden className={leavingX ? "fade-in" : undefined}>
            {xTicks.map(({ t, x }) => (
              <g key={t}>
                <line x1={x} x2={x} y1={m.top} y2={m.top + H} stroke="var(--grid)" />
                <text x={x} y={m.top + H + 16} textAnchor="middle" className="tabular fill-muted text-[11px]">
                  {tickText(xAxis, t)}
                </text>
              </g>
            ))}
          </g>
          {leavingY && (
            <g key={`yo-${leavingY.key}`} aria-hidden style={{ animation: "vt-fade-out 140ms var(--ease-exit) both" }}>
              {leavingY.value.map(({ t, y }) => (
                <g key={t}>
                  <line x1={m.left} x2={m.left + W} y1={y} y2={y} stroke="var(--grid)" />
                  <text x={m.left - 8} y={y} dy="0.32em" textAnchor="end" className="tabular fill-muted text-[11px]">
                    {tickText(yAxis, t)}
                  </text>
                </g>
              ))}
            </g>
          )}
          <g key={`y-${yAxis.key}`} aria-hidden className={leavingY ? "fade-in" : undefined}>
            {yTicks.map(({ t, y }) => (
              <g key={t}>
                <line x1={m.left} x2={m.left + W} y1={y} y2={y} stroke="var(--grid)" />
                <text x={m.left - 8} y={y} dy="0.32em" textAnchor="end" className="tabular fill-muted text-[11px]">
                  {tickText(yAxis, t)}
                </text>
              </g>
            ))}
          </g>
          <line x1={m.left} x2={m.left + W} y1={m.top + H + 0.5} y2={m.top + H + 0.5} stroke="var(--field-2)" />

          {/* Axis titles at the end of each axis, never rotated */}
          <text x={m.left - (narrow ? 36 : 46)} y={m.top - 14} className="fill-ink text-[12px] font-semibold">
            {yAxis.label}
            <tspan className="fill-muted font-normal"> · {yAxis.unit}</tspan>
          </text>
          <text x={m.left + W} y={m.top + H + 34} textAnchor="end" className="fill-ink text-[12px] font-semibold">
            {xAxis.label}
            <tspan className="fill-muted font-normal"> · {xAxis.unit} →</tspan>
          </text>

          {/* Median crosshair */}
          <g aria-hidden className="transition-transform duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ transform: `translateX(${L.px(L.mx)}px)` }}>
            <line x1={0} x2={0} y1={m.top} y2={m.top + H} stroke="var(--field-2)" strokeDasharray="3 3" />
            <text x={4} y={m.top + 10} className="fill-muted text-[10.5px]">
              median {xAxis.fmt(L.mx)}
            </text>
          </g>
          <g aria-hidden className="transition-transform duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ transform: `translateY(${L.py(L.my)}px)` }}>
            <line x1={m.left} x2={m.left + W} y1={0} y2={0} stroke="var(--field-2)" strokeDasharray="3 3" />
            <text x={m.left + W - 2} y={-5} textAnchor="end" className="fill-muted text-[10.5px]">
              median {yAxis.fmt(L.my)}
            </text>
          </g>

          {/* Pareto frontier: a staircase through the heroes nobody beats on both measures */}
          {frontier && L.front.length > 1 && (
            <path
              key={`f-${xAxis.key}-${yAxis.key}`}
              d={L.front.map((p, i) => (i === 0 ? `M${p.px},${p.py}` : xAxis.asc ? `H${p.px}V${p.py}` : `V${p.py}H${p.px}`)).join("")}
              fill="none"
              stroke="var(--ink-2)"
              strokeOpacity={0.55}
              strokeWidth={1.25}
              strokeLinejoin="round"
              className="fade-in"
            />
          )}

          {/* Guides from the active dot to both axes */}
          {activeP && (
            <g aria-hidden pointerEvents="none">
              <line x1={activeP.px} x2={activeP.px} y1={activeP.py} y2={m.top + H} stroke="var(--ink-2)" strokeOpacity={0.35} />
              <line x1={m.left} x2={activeP.px} y1={activeP.py} y2={activeP.py} stroke="var(--ink-2)" strokeOpacity={0.35} />
            </g>
          )}

          {/* Dots (faces only for labelled heroes); each glides on axis change */}
          {L.pts.map((p) => {
            const face = L.labelled.has(p.id);
            const on = p.id === active || p.id === focusId;
            return (
              <g key={p.id} className="transition-transform duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ transform: `translate(${p.px}px, ${p.py}px)` }}>
                {face ? (
                  <g className="fade-in">
                    <circle r={L.R + (on ? 2.5 : 1)} fill={on ? "var(--accent)" : "var(--rule)"} />
                    <circle r={L.R} fill="var(--surface-2)" />
                    {p.img ? (
                      <image href={p.img} x={-L.R} y={-L.R} width={L.R * 2} height={L.R * 2} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${uid}-c)`} />
                    ) : (
                      <text dy="0.35em" textAnchor="middle" className="fill-ink-2 text-[8.5px] font-semibold">
                        {p.label
                          .split(/\s+/)
                          .slice(-2)
                          .map((w) => w[0])
                          .join("")}
                      </text>
                    )}
                  </g>
                ) : (
                  <circle r={on ? 4.5 : 3.5} fill={on ? "var(--ink)" : "var(--field)"} stroke={on ? "var(--surface)" : "var(--field-2)"} strokeWidth={on ? 1.5 : 0.75} className="transition-[fill] duration-[var(--dur-1)]" />
                )}
              </g>
            );
          })}

          {/* Labels with leader lines */}
          {L.labels.map((l) => {
            const p = L.pts.find((q) => q.id === l.id)!;
            const on = p.id === active || p.id === focusId;
            return (
              <g key={`l-${l.id}`} className="fade-in pointer-events-none">
                {l.leader && <line x1={l.leader.x1} y1={l.leader.y1} x2={l.leader.x2} y2={l.leader.y2} stroke="var(--field-2)" strokeWidth={0.8} />}
                <text x={l.x} y={l.y} dy="0.33em" textAnchor={l.anchor} paintOrder="stroke" stroke="var(--surface)" strokeWidth={3} strokeLinejoin="round" className={`text-[11.5px] ${on ? "fill-accent font-semibold" : "fill-ink font-medium"}`}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {!L && <div style={{ height }} className="grid place-items-center text-[13px] text-muted">No hero has both of these numbers yet.</div>}
      <p className="sr-only" aria-live="polite">
        {activeP ? `${activeP.label}: ${xAxis.label} ${xAxis.fmt(activeP.x)}, ${yAxis.label} ${yAxis.fmt(activeP.y)}` : ""}
      </p>
      <FloatTip state={tip} />
    </div>
  );
}
