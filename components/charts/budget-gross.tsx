"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FloatTip, TipRow, type FloatTipState } from "@/components/charts/float-tip";
import { useEnter } from "@/components/charts/use-enter";
import { useElementWidth } from "@/components/charts/use-width";
import { inr, multiple } from "@/lib/format";
import { OUTCOME_LABEL, OUTCOME_VAR, VERDICT_LABEL, filmHref, type Outcome } from "@/lib/ledger-types";

export interface MoneyPoint {
  s: string;
  t: string;
  y: number;
  o: Outcome;
  v: string | null;
  g: number;
  b: number;
  sc: number | null;
  who: string;
}

const M = { l: 58, r: 18, t: 18, b: 40 };
const LINES = [
  { k: 1, label: "break-even (gross = budget)", strong: true },
  { k: 2, label: "2× budget", strong: false },
  { k: 5, label: "5× budget", strong: false },
];

const log = Math.log10;
const niceLo = (v: number) => {
  const p = 10 ** Math.floor(log(Math.max(0.1, v)));
  return [5, 2, 1].map((m) => m * p).find((x) => x <= v * 0.95) ?? p;
};
const niceHi = (v: number) => {
  const p = 10 ** Math.floor(log(v));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= v) ?? 10 * p;
};

function Dot({ x, y, r, o, ring, faded, delay }: { x: number; y: number; r: number; o: Outcome; ring: boolean; faded: boolean; delay: number }) {
  const c = OUTCOME_VAR[o];
  const solid = o === "hit" || o === "blockbuster";
  const half = o === "average";
  const outline = o === "flop" || o === "disaster";
  const style = { ["--d" as string]: `${delay}ms`, opacity: faded ? 0.28 : 1, transition: "opacity var(--dur-1) var(--ease-out)" };
  return (
    <g className="fade-mark" style={style}>
      {ring && <circle cx={x} cy={y} r={r + 2.5} fill="none" stroke="var(--ink)" strokeWidth={1} />}
      {solid && <circle cx={x} cy={y} r={r} fill={c} stroke="var(--surface)" strokeWidth={0.8} />}
      {half && (
        <>
          <circle cx={x} cy={y} r={r - 0.6} fill="var(--surface)" stroke={c} strokeWidth={1.2} />
          <path d={`M${x - r + 0.6},${y} A${r - 0.6},${r - 0.6} 0 0 0 ${x + r - 0.6},${y} Z`} fill={c} />
        </>
      )}
      {outline && <circle cx={x} cy={y} r={r - 0.6} fill={o === "disaster" ? "color-mix(in oklab, var(--v-disaster) 22%, var(--surface))" : "var(--surface)"} stroke={c} strokeWidth={1.5} />}
      {!solid && !half && !outline && <circle cx={x} cy={y} r={r - 0.6} fill="var(--surface)" stroke={c} strokeWidth={1.2} strokeDasharray="2 1.5" />}
    </g>
  );
}

/**
 * Budget against reported gross, both on log scales, with the break-even diagonal and ×2 / ×5 guides. Points
 * are filled by outcome (shape backs up colour). The films ranked by the active tab get a ring, and the most
 * notable are labelled without overlaps. Hover for details, click (or Enter) to open the film.
 */
export function BudgetGross({ points, emphasis, hovered, onHover, ariaLabel }: { points: MoneyPoint[]; emphasis: string[]; hovered: string | null; onHover: (s: string | null) => void; ariaLabel: string }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>(900);
  const enter = useEnter<HTMLDivElement>();
  const router = useRouter();
  const svg = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);
  const [kbd, setKbd] = useState<number | null>(null);

  const narrow = width < 560;
  const H = Math.round(Math.max(340, Math.min(500, width * 0.46)));
  const iw = Math.max(10, width - M.l - M.r);
  const ih = H - M.t - M.b;

  const dom = useMemo(() => {
    if (!points.length) return { x: [1, 1000], y: [1, 1000] };
    const bs = points.map((p) => p.b);
    const gs = points.map((p) => p.g);
    return { x: [niceLo(Math.min(...bs)), niceHi(Math.max(...bs) * 1.05)], y: [niceLo(Math.min(...gs)), niceHi(Math.max(...gs) * 1.05)] };
  }, [points]);
  const X = (v: number) => M.l + ((log(v) - log(dom.x[0])) / (log(dom.x[1]) - log(dom.x[0]))) * iw;
  const Y = (v: number) => M.t + ih - ((log(v) - log(dom.y[0])) / (log(dom.y[1]) - log(dom.y[0]))) * ih;
  const ticks = (lo: number, hi: number) => {
    const out: number[] = [];
    for (let p = Math.floor(log(lo)); p <= Math.ceil(log(hi)); p++) for (const m of [1, 2, 5]) out.push(m * 10 ** p);
    const inside = out.filter((t) => t >= lo * 0.999 && t <= hi * 1.001);
    const major = inside.filter((t) => Number.isInteger(log(t)));
    return major.length >= 3 ? major : inside;
  };

  const order = useMemo(() => [...points].sort((a, b) => a.b - b.b || a.g - b.g), [points]);
  const pos = useMemo(() => new Map(order.map((p) => [p.s, { x: X(p.b), y: Y(p.g) }])), [order, width, H, dom]); // eslint-disable-line react-hooks/exhaustive-deps
  const emph = useMemo(() => new Set(emphasis), [emphasis]);

  // Labels: emphasised films first (in tab order), greedy over 8 positions, never overlapping a label or the plot edge.
  const labels = useMemo(() => {
    const max = narrow ? 5 : 10;
    const boxes: { l: number; r: number; t: number; b: number }[] = [];
    const out: { s: string; x: number; y: number; anchor: "start" | "middle" | "end"; text: string; lx: number; ly: number; lead: boolean }[] = [];
    const want = emphasis.filter((s) => pos.has(s));
    for (const s of want) {
      if (out.length >= max) break;
      const p = pos.get(s)!;
      const f = points.find((q) => q.s === s)!;
      const text = f.t.length > 20 ? `${f.t.slice(0, 18)}…` : f.t;
      const tw = text.length * 6.2 + 4;
      const th = 13;
      const cands: [number, number, "start" | "middle" | "end"][] = [
        [9, 4, "start"],
        [-9, 4, "end"],
        [0, -10, "middle"],
        [0, 17, "middle"],
        [9, -8, "start"],
        [-9, -8, "end"],
        [9, 15, "start"],
        [-9, 15, "end"],
        [22, -18, "start"],
        [-22, -18, "end"],
      ];
      for (const [dx, dy, anchor] of cands) {
        const x = p.x + dx;
        const y = p.y + dy;
        const l = anchor === "start" ? x : anchor === "end" ? x - tw : x - tw / 2;
        const box = { l, r: l + tw, t: y - th + 3, b: y + 3 };
        if (box.l < M.l + 2 || box.r > width - 2 || box.t < 2 || box.b > M.t + ih - 2) continue;
        if (boxes.some((o) => !(box.r < o.l || box.l > o.r || box.b < o.t || box.t > o.b))) continue;
        // keep clear of other emphasised dots
        if (want.some((w) => w !== s && pos.has(w) && (() => { const q = pos.get(w)!; return q.x > box.l - 4 && q.x < box.r + 4 && q.y > box.t - 4 && q.y < box.b + 4; })())) continue;
        boxes.push(box);
        out.push({ s, x, y, anchor, text, lx: p.x, ly: p.y, lead: Math.hypot(dx, dy) > 12 });
        break;
      }
    }
    return out;
  }, [emphasis, pos, points, narrow, width, ih]);

  const showTip = (p: MoneyPoint | null) => {
    if (!p || !svg.current) return setTip(null);
    const r = svg.current.getBoundingClientRect();
    const q = pos.get(p.s)!;
    setTip({
      x: r.left + q.x,
      y: r.top + q.y - 7,
      y2: r.top + q.y + 7,
      content: (
        <div className="min-w-[200px]">
          <p className="font-semibold leading-tight text-ink">{p.t}</p>
          <p className="mb-1.5 text-[11.5px] text-muted">
            {p.y}
            {p.who ? ` · ${p.who}` : ""}
          </p>
          <TipRow
            k="Result"
            v={
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: OUTCOME_VAR[p.o] }} />
                {p.v ? (VERDICT_LABEL[p.v] ?? OUTCOME_LABEL[p.o]) : OUTCOME_LABEL[p.o]}
              </span>
            }
          />
          <TipRow k="Reported gross" v={inr(p.g)} />
          <TipRow k="Reported budget" v={inr(p.b)} />
          <TipRow k="Gross ÷ budget" v={multiple(p.g / p.b)} />
          {p.sc !== null && <TipRow k="Film score" v={p.sc.toFixed(1)} />}
          <p className="mt-1.5 text-[11px] text-muted">Click to open the film</p>
        </div>
      ),
    });
  };
  const nearest = (cx: number, cy: number) => {
    if (!svg.current) return null;
    const r = svg.current.getBoundingClientRect();
    const mx = cx - r.left;
    const my = cy - r.top;
    let best: MoneyPoint | null = null;
    let bd = 18 ** 2;
    for (const p of points) {
      const q = pos.get(p.s)!;
      const d = (q.x - mx) ** 2 + (q.y - my) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };
  const set = (p: MoneyPoint | null) => {
    onHover(p?.s ?? null);
    showTip(p);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!order.length) return;
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : -1;
      const i = kbd === null ? (d > 0 ? 0 : order.length - 1) : (kbd + d + order.length) % order.length;
      setKbd(i);
      set(order[i]);
    } else if (e.key === "Enter" && kbd !== null) router.push(filmHref(order[kbd].s));
    else if (e.key === "Escape") {
      setKbd(null);
      set(null);
    }
  };

  const hp = hovered ? pos.get(hovered) : null;
  const xT = ticks(dom.x[0], dom.x[1]);
  const yT = ticks(dom.y[0], dom.y[1]);
  const clip = `bg-clip-${points.length}`;

  // Each guide is labelled near where it enters the plot (bottom-left, where films are sparse), along the line.
  const entry = (k: number) => {
    const x0 = Math.max(dom.x[0], dom.y[0] / k);
    const x1 = Math.min(dom.x[1], dom.y[1] / k);
    if (x1 <= x0) return null;
    const ax = X(x0);
    const ay = Y(k * x0);
    const bx = X(x1);
    const by = Y(k * x1);
    const len = Math.hypot(bx - ax, by - ay);
    const t = Math.min(0.5, 70 / Math.max(1, len));
    return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI };
  };
  const line = (k: number) => {
    const x0 = Math.max(dom.x[0], dom.y[0] / k);
    const x1 = Math.min(dom.x[1], dom.y[1] / k);
    return x1 > x0 ? `M${X(x0)},${Y(k * x0)} L${X(x1)},${Y(k * x1)}` : "";
  };
  const below = (() => {
    const x0 = Math.max(dom.x[0], dom.y[0]);
    const x1 = Math.min(dom.x[1], dom.y[1]);
    if (x1 <= x0) return "";
    return `M${X(x0)},${Y(x0)} L${X(x1)},${Y(x1)} L${X(dom.x[1])},${Y(Math.min(dom.y[1], x1))} L${X(dom.x[1])},${M.t + ih} L${X(x0)},${M.t + ih} Z`;
  })();

  return (
    <div ref={wrap} className="relative">
      <div ref={enter}>
        <svg
          ref={svg}
          width={width}
          height={H}
          role="img"
          tabIndex={0}
          aria-label={`${ariaLabel} Arrow keys step through the films from the smallest budget; Enter opens one.`}
          onKeyDown={onKey}
          onBlur={() => {
            setKbd(null);
            set(null);
          }}
          onMouseMove={(e) => set(nearest(e.clientX, e.clientY))}
          onMouseLeave={() => set(null)}
          onClick={(e) => {
            const p = nearest(e.clientX, e.clientY);
            if (p) router.push(filmHref(p.s));
          }}
          className="block cursor-crosshair overflow-visible outline-none"
        >
          <defs>
            <clipPath id={clip}>
              <rect x={M.l} y={M.t} width={iw} height={ih} />
            </clipPath>
          </defs>
          {/* below break-even */}
          <path d={below} fill="color-mix(in oklab, var(--v-flop) 6%, transparent)" clipPath={`url(#${clip})`} />
          {!narrow && (
            <text x={width - M.r - 8} y={M.t + ih - 10} textAnchor="end" className="fill-muted text-[11px]">
              Grossed less than its budget
            </text>
          )}
          {/* grid + axes */}
          {xT.map((t) => (
            <g key={`x${t}`}>
              <line x1={X(t)} x2={X(t)} y1={M.t} y2={M.t + ih} stroke="var(--grid)" />
              <text x={X(t)} y={M.t + ih + 16} textAnchor="middle" className="fill-muted text-[11px] tabular">
                {inr(t)}
              </text>
            </g>
          ))}
          {yT.map((t) => (
            <g key={`y${t}`}>
              <line x1={M.l} x2={M.l + iw} y1={Y(t)} y2={Y(t)} stroke="var(--grid)" />
              <text x={M.l - 8} y={Y(t) + 4} textAnchor="end" className="fill-muted text-[11px] tabular">
                {inr(t)}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={M.l + iw} y1={M.t + ih + 0.5} y2={M.t + ih + 0.5} stroke="var(--ink-2)" strokeOpacity={0.5} />
          <text x={M.l + iw} y={M.t + ih + 32} textAnchor="end" className="fill-ink-2 text-[11.5px] font-medium">
            Budget, reported (log scale) →
          </text>
          <text x={M.l - 8} y={M.t - 6} textAnchor="start" className="fill-ink-2 text-[11.5px] font-medium">
            ↑ Gross, reported worldwide (log scale)
          </text>
          {/* guides */}
          {LINES.map((l) => {
            const e = narrow && !l.strong ? null : entry(l.k);
            return (
              <g key={l.k}>
                <path d={line(l.k)} stroke={l.strong ? "var(--ink-2)" : "var(--field-2)"} strokeWidth={l.strong ? 1.2 : 1} strokeDasharray={l.strong ? undefined : "4 4"} fill="none" clipPath={`url(#${clip})`} />
                {e && (
                  <text
                    transform={`translate(${e.x},${e.y}) rotate(${e.angle})`}
                    y={-5}
                    textAnchor="middle"
                    className={`text-[11px] ${l.strong ? "fill-ink-2 font-semibold" : "fill-muted font-medium"}`}
                    style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 4, strokeLinejoin: "round" }}
                  >
                    {narrow ? l.label.replace(/ \(.*\)$/, "") : l.label}
                  </text>
                )}
              </g>
            );
          })}
          {/* points: smallest budget first so big films sit on top */}
          {order.map((p, i) => {
            const q = pos.get(p.s)!;
            const on = hovered === p.s;
            return <Dot key={p.s} x={q.x} y={q.y} r={on ? 6.5 : emph.has(p.s) ? 5.2 : narrow ? 3.8 : 4.4} o={p.o} ring={on || emph.has(p.s)} faded={!!hovered && !on} delay={Math.min(260, i * 1.2)} />;
          })}
          {/* labels */}
          {labels.map((l) => (
            <g key={`l${l.s}`} className="fade-mark" style={{ ["--d" as string]: "260ms", opacity: hovered && hovered !== l.s ? 0.35 : 1, transition: "opacity var(--dur-1)" }}>
              {l.lead && <line x1={l.lx} y1={l.ly} x2={l.x + (l.anchor === "start" ? -2 : l.anchor === "end" ? 2 : 0)} y2={l.y - 4} stroke="var(--field-2)" strokeWidth={0.8} />}
              <text x={l.x} y={l.y} textAnchor={l.anchor} className="pointer-events-none fill-ink text-[11.5px] font-medium" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3.5, strokeLinejoin: "round" }}>
                {l.text}
              </text>
            </g>
          ))}
          {hp && <circle cx={hp.x} cy={hp.y} r={11} fill="none" stroke="var(--accent)" strokeWidth={1.5} className="pop-in" />}
        </svg>
      </div>
      <FloatTip state={tip} />
    </div>
  );
}
