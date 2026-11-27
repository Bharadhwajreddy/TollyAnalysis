"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FloatTip, TipRow, type FloatTipState } from "@/components/charts/float-tip";
import { lit, useFocus } from "@/components/charts/focus";
import { useEnter } from "@/components/charts/use-enter";
import { useElementWidth } from "@/components/charts/use-width";
import { inr, date as fmtDate } from "@/lib/format";
import { OUTCOME_LABEL, OUTCOME_VAR, VERDICT_LABEL, filmHref, type FilmDot, type Outcome } from "@/lib/ledger-types";
import { grossShare, spine, yearPos } from "@/lib/timeline";

const SOLID = new Set<Outcome>(["blockbuster", "hit"]);
const HALF = new Set<Outcome>(["average"]);
const OUTLINE = new Set<Outcome>(["flop", "disaster"]);

/** One film mark, drawn the same way everywhere: height = gross (log), fill = outcome, shape backs up colour. */
export function Mark({ x, base, h, w, o, active, litOn, delay = 0 }: { x: number; base: number; h: number; w: number; o: Outcome; active?: boolean; litOn?: boolean; delay?: number }) {
  const c = OUTCOME_VAR[o];
  const y = base - h;
  const common = { className: "mark grow-mark", "data-lit": litOn ? "" : undefined, style: { ["--d" as string]: `${delay}ms` } } as const;
  if (SOLID.has(o)) return <rect {...common} x={x - w / 2} y={y} width={w} height={h} rx={Math.min(1.5, w / 3)} fill={c} stroke={active ? "var(--ink)" : "none"} strokeWidth={active ? 1.5 : 0} />;
  if (HALF.has(o))
    return (
      <g {...common}>
        <rect x={x - w / 2 + 0.5} y={y + 0.5} width={Math.max(1, w - 1)} height={h - 1} rx={1} fill="none" stroke={c} strokeWidth={1} />
        <rect x={x - w / 2} y={y + h / 2} width={w} height={h / 2} rx={1} fill={c} />
        {active && <rect x={x - w / 2 - 1} y={y - 1} width={w + 2} height={h + 2} fill="none" stroke="var(--ink)" strokeWidth={1.5} />}
      </g>
    );
  if (OUTLINE.has(o))
    return (
      <rect {...common} x={x - w / 2 + 0.6} y={y + 0.6} width={Math.max(1, w - 1.2)} height={h - 1.2} rx={1} fill={o === "disaster" ? "color-mix(in oklab, var(--v-disaster) 22%, transparent)" : "none"} stroke={active ? "var(--ink)" : c} strokeWidth={active ? 1.8 : 1.2} />
    );
  return <rect {...common} x={x - w / 2 + 0.5} y={y + 0.5} width={Math.max(1, w - 1)} height={h - 1} rx={1} fill="none" stroke={c} strokeWidth={1} strokeDasharray="2 1.5" />;
}

export function FilmTip({ f }: { f: FilmDot }) {
  return (
    <div className="min-w-[180px]">
      <p className="font-semibold leading-tight text-ink">{f.t}</p>
      <p className="mb-1.5 text-[11.5px] text-muted">{f.dt ? fmtDate(f.dt) : f.y}{f.d ? ` · ${f.d}` : ""}</p>
      <TipRow k="Result" v={<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: OUTCOME_VAR[f.o] }} />{f.v ? (VERDICT_LABEL[f.v] ?? OUTCOME_LABEL[f.o]) : OUTCOME_LABEL[f.o]}</span>} />
      {f.g !== null && <TipRow k="Reported gross" v={inr(f.g)} />}
      {f.sc !== null && <TipRow k="Film score" v={f.sc.toFixed(1)} />}
    </div>
  );
}

interface Props {
  films: FilmDot[];
  /** Fractional-year domain. */
  start: number;
  end: number;
  height?: number;
  /** Show year ticks under the strip. */
  axis?: boolean | "decades";
  /** Label the biggest films (n) plus the highlighted one. */
  labels?: number;
  highlight?: string | null;
  /** The running year is drawn as "to date" from this fractional year. */
  partialFrom?: number | null;
  upcoming?: { title: string; year: number } | null;
  ariaLabel: string;
  className?: string;
  /** Click a mark to open the film page (default true). */
  navigate?: boolean;
}

/**
 * A career (or any set of films) on the shared time spine: one mark per film. Hover or arrow-key through the
 * marks for details; click opens the film. Marks dim when the page focus (a director, a year…) does not match.
 */
export function FilmStrip({ films, start, end, height = 44, axis = false, labels = 0, highlight = null, partialFrom = null, upcoming = null, ariaLabel, className = "", navigate = true }: Props) {
  const [wrap, width] = useElementWidth<HTMLDivElement>(600);
  const enter = useEnter<HTMLDivElement>();
  const router = useRouter();
  const { focus } = useFocus();
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const labelH = labels ? 30 : 0;
  const axisH = axis ? 18 : 0;
  const H = height + labelH + axisH;
  const base = labelH + height;
  const s = spine(start, end, 4, Math.max(10, width - 4), axis === "decades" ? 5 : width < 520 ? 5 : width < 900 ? 2 : 1);
  const perYear = (width - 8) / Math.max(1, end - start);
  // Never wider than the films' share of the width, so a dense strip (a single year) does not overlap itself.
  const w = Math.max(2, Math.min(labels ? 9 : 6, perYear / 4, ((width - 8) / Math.max(1, films.length)) * 0.9));
  const pts = useMemo(() => films.map((f) => ({ f, x: s.x(yearPos(f.dt, f.y)), h: Math.max(4, grossShare(f.g) * height) })), [films, s, height]);

  // Greedy labels: biggest films first, two levels, never overlapping.
  const placed = useMemo(() => {
    if (!labels) return [] as { i: number; x: number; level: number; text: string }[];
    const order = pts
      .map((p, i) => ({ i, pr: (p.f.s === highlight ? 1e6 : 0) + (p.f.g ?? (p.f.sc ?? 0) / 10) }))
      .sort((a, b) => b.pr - a.pr)
      .slice(0, labels + (highlight ? 1 : 0));
    const boxes: { l: number; r: number; level: number }[] = [];
    const out: { i: number; x: number; level: number; text: string }[] = [];
    for (const { i } of order) {
      const text = pts[i].f.t.length > 22 ? `${pts[i].f.t.slice(0, 20)}…` : pts[i].f.t;
      const tw = text.length * 6.1 + 6;
      for (const level of [0, 1]) {
        const l = Math.min(Math.max(2, pts[i].x - tw / 2), width - tw - 2);
        const r = l + tw;
        if (boxes.some((b) => b.level === level && !(r < b.l || l > b.r))) continue;
        boxes.push({ l, r, level });
        out.push({ i, x: l + tw / 2, level, text });
        break;
      }
    }
    return out;
  }, [labels, pts, highlight, width]);

  const show = (i: number | null) => {
    setActive(i);
    if (i === null || !svg.current) return setTip(null);
    const r = svg.current.getBoundingClientRect();
    const p = pts[i];
    setTip({ x: r.left + p.x, y: r.top + base - p.h, y2: r.top + base, content: <FilmTip f={p.f} /> });
  };
  const nearest = (clientX: number) => {
    if (!svg.current || !pts.length) return null;
    const x = clientX - svg.current.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].x - x) < Math.abs(pts[best].x - x)) best = i;
    return Math.abs(pts[best].x - x) < Math.max(14, w * 2) ? best : null;
  };
  const onKey = (e: KeyboardEvent) => {
    if (!pts.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      show(active === null ? (d > 0 ? 0 : pts.length - 1) : (active + d + pts.length) % pts.length);
    } else if (e.key === "Enter" && active !== null && navigate) router.push(filmHref(pts[active].f.s));
    else if (e.key === "Escape") show(null);
  };

  const dim = !!focus && focus.kind !== "hero";
  const xPartial = partialFrom !== null ? s.x(partialFrom) : null;

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <div ref={enter}>
        <svg
          ref={svg}
          width={width}
          height={H}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          data-dim={dim ? "" : undefined}
          onKeyDown={onKey}
          onBlur={() => show(null)}
          onMouseMove={(e) => show(nearest(e.clientX))}
          onMouseLeave={() => show(null)}
          onClick={(e) => {
            const i = nearest(e.clientX);
            if (i !== null && navigate) router.push(filmHref(pts[i].f.s));
          }}
          className={`block overflow-visible outline-none ${navigate ? "cursor-pointer" : ""}`}
        >
          {/* baseline */}
          <line x1={0} x2={width} y1={base + 0.5} y2={base + 0.5} stroke="var(--rule)" />
          {xPartial !== null && <rect x={xPartial} y={labelH} width={Math.max(0, width - xPartial)} height={height} fill="url(#hatch)" opacity={0.5} />}
          {axis &&
            s.ticks.map((t) => (
              <g key={t}>
                <line x1={s.x(t)} x2={s.x(t)} y1={labelH} y2={base} stroke="var(--grid)" strokeDasharray={t % 10 ? "1 3" : undefined} />
                <text x={s.x(t)} y={base + 13} textAnchor="middle" className="fill-muted text-[10.5px] tabular">
                  {t}
                </text>
              </g>
            ))}
          {active !== null && <line x1={pts[active].x} x2={pts[active].x} y1={labelH} y2={base} stroke="var(--ink-2)" strokeOpacity={0.35} />}
          {pts.map((p, i) => (
            <Mark key={p.f.s} x={p.x} base={base} h={p.h} w={w} o={p.f.o} active={active === i || p.f.s === highlight} litOn={lit(p.f, focus)} delay={Math.min(240, i * 6)} />
          ))}
          {upcoming && (
            <g>
              <rect x={s.x(Math.min(end - 0.1, upcoming.year + 0.5)) - w / 2} y={base - height * 0.5} width={w} height={height * 0.5} rx={1} fill="none" stroke="var(--muted)" strokeDasharray="2 2" />
              <text x={s.x(Math.min(end - 0.1, upcoming.year + 0.5))} y={base - height * 0.5 - 4} textAnchor="middle" className="fill-muted text-[10px]">
                ?
              </text>
            </g>
          )}
          {placed.map((l) => {
            const p = pts[l.i];
            const ly = labelH - 6 - l.level * 13;
            return (
              <g key={`l${l.i}`} className="fade-mark" style={{ ["--d" as string]: "200ms" }}>
                <line x1={p.x} x2={p.x} y1={ly + 3} y2={base - p.h - 2} stroke="var(--field-2)" strokeWidth={0.75} />
                <text x={l.x} y={ly} textAnchor="middle" className={`text-[10.5px] ${p.f.s === highlight ? "fill-ink font-semibold" : "fill-ink-2"}`}>
                  {l.text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <FloatTip state={tip} />
    </div>
  );
}

/** The shared defs (hatch pattern) — rendered once in the layout. */
export function ChartDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--field)" strokeWidth="1.5" />
        </pattern>
      </defs>
    </svg>
  );
}
