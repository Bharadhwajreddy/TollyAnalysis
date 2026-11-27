"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FloatTip, TipRow, type FloatTipState } from "@/components/charts/float-tip";
import { useEnter } from "@/components/charts/use-enter";
import { useElementWidth } from "@/components/charts/use-width";
import { heroHref } from "@/lib/ledger-types";

export interface StandingPillar {
  key: string;
  label: string;
  question: string;
  /** His value 0–100 (null = no data). */
  value: number | null;
  rank: number | null;
  of: number;
  fact: string | null;
  median: number | null;
  /** Every ranked hero's value on this pillar. */
  field: { slug: string; name: string; v: number }[];
}

const R = 3.6;
const LANE = 7.6;
const LANES = 4;

/** One pillar: a 0–100 axis with every ranked hero as a small dot, him in accent with his value, and the median tick. */
function PillarStrip({ p, slug, name }: { p: StandingPillar; slug: string; name: string }) {
  const [wrap, width] = useElementWidth<HTMLDivElement>(640);
  const enter = useEnter<HTMLDivElement>();
  const router = useRouter();
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);

  const padL = 8;
  const padR = 12;
  const top = 22;
  const base = top + LANES * LANE + 4;
  const H = base + 22;
  const x = (v: number) => padL + (Math.max(0, Math.min(100, v)) / 100) * (width - padL - padR);

  // Dodge: each dot takes the lowest lane where it does not touch a neighbour.
  const dots = useMemo(() => {
    const others = p.field.filter((d) => d.slug !== slug).sort((a, b) => a.v - b.v || a.name.localeCompare(b.name));
    const lanes: number[] = Array(LANES).fill(-1e9);
    return others.map((d) => {
      const px = x(d.v);
      let lane = lanes.findIndex((last) => px - last >= R * 2 + 0.8);
      if (lane < 0) lane = lanes.indexOf(Math.min(...lanes));
      lanes[lane] = px;
      return { ...d, px, py: base - R - 1 - lane * LANE };
    });
  }, [p.field, slug, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = (i: number | null) => {
    setActive(i);
    if (i === null || !svg.current) return setTip(null);
    const r = svg.current.getBoundingClientRect();
    const d = dots[i];
    setTip({
      x: r.left + d.px,
      y: r.top + d.py - R,
      y2: r.top + d.py + R,
      content: (
        <div className="min-w-[150px]">
          <p className="mb-1 font-semibold text-ink">{d.name}</p>
          <TipRow k={p.label} v={d.v.toFixed(1)} />
          {p.value !== null && <TipRow k={`vs ${name}`} v={`${d.v >= p.value ? "+" : "−"}${Math.abs(d.v - p.value).toFixed(1)}`} />}
          <p className="mt-1.5 text-[11px] text-muted">Click to open his page</p>
        </div>
      ),
    });
  };
  const nearest = (clientX: number, clientY: number) => {
    if (!svg.current || !dots.length) return null;
    const r = svg.current.getBoundingClientRect();
    const mx = clientX - r.left;
    const my = clientY - r.top;
    let best = -1;
    let bd = Infinity;
    dots.forEach((d, i) => {
      const dd = (d.px - mx) ** 2 + ((d.py - my) * 0.6) ** 2;
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    return best >= 0 && bd < 14 ** 2 ? best : null;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      show(active === null ? (d > 0 ? 0 : dots.length - 1) : (active + d + dots.length) % dots.length);
    } else if (e.key === "Enter" && active !== null) router.push(heroHref(dots[active].slug));
    else if (e.key === "Escape") show(null);
  };

  const hx = p.value !== null ? x(p.value) : null;
  const mx = p.median !== null ? x(p.median) : null;
  const labelX = hx === null ? 0 : Math.min(width - padR - 14, Math.max(padL + 14, hx));

  return (
    <div ref={wrap} className="relative min-w-0">
      <div ref={enter}>
        <svg
          ref={svg}
          width={width}
          height={H}
          role="img"
          tabIndex={0}
          aria-label={`${p.label}: ${name} ${p.value === null ? "has no value" : `${p.value.toFixed(1)} out of 100${p.rank ? `, ${p.rank} of ${p.of}` : ""}`}; typical ${p.median?.toFixed(1) ?? "—"}. Arrow keys move through the other heroes.`}
          onKeyDown={onKey}
          onBlur={() => show(null)}
          onMouseMove={(e) => show(nearest(e.clientX, e.clientY))}
          onMouseLeave={() => show(null)}
          onClick={(e) => {
            const i = nearest(e.clientX, e.clientY);
            if (i !== null) router.push(heroHref(dots[i].slug));
          }}
          className="block cursor-pointer overflow-visible outline-none"
        >
          {/* axis */}
          <line x1={padL} x2={width - padR} y1={base + 0.5} y2={base + 0.5} stroke="var(--rule)" />
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={base} y2={base + 4} stroke="var(--field-2)" />
              {!(mx !== null && Math.abs(x(t) - mx) < 30) && (
                <text x={x(t)} y={base + 16} textAnchor="middle" className="fill-muted text-[10.5px] tabular">
                  {t}
                </text>
              )}
            </g>
          ))}
          {/* typical (median) */}
          {mx !== null && (
            <g className="fade-mark">
              <line x1={mx} x2={mx} y1={top - 2} y2={base + 5} stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="2 2" />
              <text x={mx} y={base + 16} textAnchor="middle" className="fill-ink-2 text-[10.5px] font-medium">
                typical {p.median?.toFixed(0)}
              </text>
            </g>
          )}
          {dots.map((d, i) => (
            <circle
              key={d.slug}
              cx={d.px}
              cy={d.py}
              r={active === i ? R + 1 : R}
              className="fade-mark"
              style={{ ["--d" as string]: `${Math.min(220, (d.px / Math.max(1, width)) * 220)}ms`, transition: "r var(--dur-1) var(--ease-out), fill var(--dur-1)" }}
              fill={active === i ? "var(--ink)" : "var(--field)"}
            />
          ))}
          {hx !== null && (
            <g className="fade-mark" style={{ ["--d" as string]: "240ms" }}>
              <line x1={hx} x2={hx} y1={top + 2} y2={base} stroke="var(--accent)" strokeWidth={1.5} />
              <circle cx={hx} cy={base - R - 1} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
              <text x={labelX} y={top - 6} textAnchor="middle" className="fill-accent text-[13px] font-semibold tabular">
                {p.value?.toFixed(1)}
              </text>
            </g>
          )}
        </svg>
      </div>
      <FloatTip state={tip} />
    </div>
  );
}

export function Standing({ pillars, slug, name }: { pillars: StandingPillar[]; slug: string; name: string }) {
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {pillars.map((p) => (
        <li key={p.key} className="grid gap-x-10 gap-y-2 py-5 md:grid-cols-[minmax(220px,280px)_1fr] md:items-center">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 md:block">
              <h3 className="text-[15.5px] font-semibold text-ink">{p.label}</h3>
              {p.rank !== null && (
                <span className="tabular text-[12.5px] text-muted md:mt-0.5 md:block">
                  {p.rank === 1 ? "Best" : `${ordinal(p.rank)}`} of {p.of}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{p.question}</p>
            {p.fact && <p className="mt-1 text-[13px] font-medium text-ink-2">{p.fact}</p>}
          </div>
          <PillarStrip p={p} slug={slug} name={name} />
        </li>
      ))}
    </ol>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
