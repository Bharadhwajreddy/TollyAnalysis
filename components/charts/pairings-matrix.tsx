"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FloatTip, type FloatTipState } from "@/components/charts/float-tip";
import { useFocus } from "@/components/charts/focus";
import { useEnter } from "@/components/charts/use-enter";
import { DirectorMono, MiniMark } from "@/components/entity/tokens";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { directorHref, heroHref } from "@/lib/ledger-types";
import type { PairCell, Pairings } from "@/lib/pairings";

const COL = 58;
const ROW = 46;

/** Hit share → the outcome ramp: 0% flop, 50% average, 100% blockbuster (CSS variables only, so dark mode follows). */
export function shareColor(share: number): string {
  if (share >= 0.5) return `color-mix(in oklab, var(--v-blockbuster) ${Math.round((share - 0.5) * 200)}%, var(--v-average))`;
  return `color-mix(in oklab, var(--v-average) ${Math.round(share * 200)}%, var(--v-flop))`;
}

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : `${w}s`}`;

export function pairLine(c: Pick<PairCell, "n" | "hits" | "judged">) {
  if (!c.judged) return `${plural(c.n, "film")}, no result yet`;
  return c.judged === c.n ? `${plural(c.n, "film")}, ${plural(c.hits, "hit")}` : `${plural(c.n, "film")}, ${c.hits} of ${c.judged} with a result were hits`;
}

function Dot({ c, max, size }: { c: PairCell; max: number; size: number }) {
  const R = size / 2 - 3;
  const r = Math.max(5, R * Math.sqrt(c.n / max));
  const share = c.judged ? c.hits / c.judged : null;
  return (
    <svg width={size} height={size} aria-hidden className="pointer-events-none block">
      {share === null ? (
        <circle cx={size / 2} cy={size / 2} r={r - 0.75} fill="none" stroke="var(--v-unknown)" strokeWidth={1.5} strokeDasharray="2.5 2" />
      ) : (
        <circle className="fade-mark" cx={size / 2} cy={size / 2} r={r} fill={shareColor(share)} />
      )}
      {c.n > 1 && r >= 8 && (
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" className="tabular text-[11px] font-semibold" fill={share === null ? "var(--muted)" : "var(--surface)"}>
          {c.n}
        </text>
      )}
    </svg>
  );
}

/**
 * Director × hero pairings: one row per director, one column per hero. A circle's area is the number of
 * films they made together, its colour the share that were hits. Hover or arrow-key to a cell for the films;
 * the page focus lights exactly those films in every strip above. Click (or Enter) pins it.
 */
export function PairingsMatrix({ data }: { data: Pairings }) {
  const { directors, heroes, cells, max } = data;
  const { hover, pin, pinned } = useFocus();
  const enter = useEnter<HTMLDivElement>();
  const [active, setActive] = useState<{ d: number; h: number } | null>(null);
  const [cursor, setCursor] = useState<{ d: number; h: number }>(() => ({ d: cells[0]?.d ?? 0, h: cells[0]?.h ?? 0 }));
  const [tip, setTip] = useState<FloatTipState | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const at = useMemo(() => new Map(cells.map((c) => [`${c.d}:${c.h}`, c])), [cells]);
  const cell = (d: number, h: number) => at.get(`${d}:${h}`) ?? null;

  const focusOf = (c: PairCell) => ({
    kind: "film" as const,
    key: `pair:${directors[c.d].slug}|${heroes[c.h].slug}`,
    label: `${directors[c.d].name} × ${heroes[c.h].name}`,
    set: c.films.map((f) => f.s),
  });

  const show = (d: number, h: number, el: HTMLElement | null) => {
    const c = cell(d, h);
    setActive({ d, h });
    if (!c || !el) {
      setTip(null);
      hover(null);
      return;
    }
    hover(focusOf(c));
    const r = el.getBoundingClientRect();
    setTip({
      x: r.left + r.width / 2,
      y: r.top + 4,
      y2: r.bottom - 4,
      content: (
        <div className="min-w-[200px]">
          <p className="font-semibold leading-tight text-ink">
            {directors[d].name} <span className="font-normal text-muted">×</span> {heroes[h].name}
          </p>
          <p className="mb-2 mt-0.5 text-[12px] text-ink-2">{pairLine(c)}</p>
          <ul className="space-y-1">
            {c.films.map((f) => (
              <li key={f.s} className="flex items-center gap-1.5">
                <MiniMark o={f.o} />
                <span className="truncate font-medium text-ink">{f.t}</span>
                <span className="tabular ml-auto pl-3 text-muted">{f.y}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">{pinned?.key === focusOf(c).key ? "Click again to unpin" : "Click to keep these films lit"}</p>
        </div>
      ),
    });
  };
  const clear = () => {
    setActive(null);
    setTip(null);
    hover(null);
  };
  const toggle = (c: PairCell) => {
    const f = focusOf(c);
    pin(pinned?.key === f.key ? null : f);
  };

  const btn = (d: number, h: number) => grid.current?.querySelector<HTMLButtonElement>(`[data-cell="${d}:${h}"]`) ?? null;
  const move = (d: number, h: number) => {
    setCursor({ d, h });
    const el = btn(d, h);
    el?.focus();
    show(d, h, el);
  };
  const onKey = (e: KeyboardEvent) => {
    const { d, h } = cursor;
    const step: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
    if (step[e.key]) {
      e.preventDefault();
      const [dd, dh] = step[e.key];
      // Jump over empty cells along the direction of travel.
      for (let i = 1; ; i++) {
        const nd = d + dd * i;
        const nh = h + dh * i;
        if (nd < 0 || nh < 0 || nd >= directors.length || nh >= heroes.length) break;
        if (cell(nd, nh)) return move(nd, nh);
      }
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const row = cells.filter((c) => c.d === d).sort((a, b) => a.h - b.h);
      const c = e.key === "Home" ? row[0] : row[row.length - 1];
      if (c) move(c.d, c.h);
    } else if (e.key === "Escape") clear();
  };

  return (
    <div ref={enter}>
      <div className="scroll-x -mx-4 sm:-mx-6" onMouseLeave={clear}>
        <div
          ref={grid}
          role="grid"
          aria-label={`Films made together by ${directors.length} directors and ${heroes.length} heroes`}
          aria-rowcount={directors.length + 1}
          onKeyDown={onKey}
          className="relative inline-grid min-w-full px-4 pb-2 sm:px-6"
          style={{ gridTemplateColumns: `minmax(124px, 240px) repeat(${heroes.length}, ${COL}px) 72px` }}
        >
          {/* Column headers: hero faces with angled names */}
          <div role="row" className="contents">
            <div role="columnheader" className="sticky left-0 z-[2] flex items-end bg-surface pb-2 pr-3">
              <span className="label leading-relaxed">Director ↓<br className="sm:hidden" /> Hero →</span>
            </div>
            {heroes.map((h, i) => {
              const on = active?.h === i;
              return (
                <div key={h.slug} role="columnheader" className="relative h-[146px]">
                  <Link href={heroHref(h.slug)} className="group/h absolute inset-0 block" aria-label={`${h.name}, ${plural(h.films, "film")} with these directors`}>
                    <span
                      className={`absolute bottom-[44px] left-[calc(50%-3px)] origin-bottom-left -rotate-[52deg] whitespace-nowrap text-[12.5px] font-medium transition-colors duration-[var(--dur-1)] group-hover/h:text-accent ${on ? "text-ink" : "text-ink-2"}`}
                    >
                      {h.name}
                    </span>
                    <span className="absolute bottom-[6px] left-1/2 -translate-x-1/2">
                      <HeroAvatar name={h.name} photo={h.img} size={28} active={on} />
                    </span>
                  </Link>
                </div>
              );
            })}
            <div aria-hidden />
          </div>

          {directors.map((d, di) => {
            const rowOn = active?.d === di;
            return (
              <div key={d.slug} role="row" className="group/row contents">
                <div role="rowheader" className="sticky left-0 z-[2] flex min-w-0 items-center border-t border-rule bg-surface pr-3" style={{ height: ROW }}>
                  <Link href={directorHref(d.slug)} className="group/t flex min-w-0 items-center gap-2 font-medium hover:text-accent">
                    <DirectorMono name={d.name} size={24} />
                    <span className={`truncate text-[13.5px] underline decoration-transparent decoration-1 underline-offset-[3px] transition-colors duration-[var(--dur-1)] group-hover/t:decoration-current ${rowOn ? "text-ink" : "text-ink-2"}`}>{d.name}</span>
                  </Link>
                </div>
                {heroes.map((h, hi) => {
                  const c = cell(di, hi);
                  const on = active?.d === di && active.h === hi;
                  const band = !on && (active?.d === di || active?.h === hi);
                  const isPinned = !!c && pinned?.key === `pair:${d.slug}|${h.slug}`;
                  return (
                    <div
                      key={h.slug}
                      role="gridcell"
                      className={`relative grid place-items-center border-t border-rule transition-colors duration-[var(--dur-1)] ${band ? "bg-surface-2/70" : ""} ${on ? "bg-surface-2" : ""}`}
                      style={{ height: ROW }}
                      onMouseEnter={(e) => (c ? show(di, hi, e.currentTarget) : (setActive({ d: di, h: hi }), setTip(null), hover(null)))}
                    >
                      {c && (
                        <button
                          type="button"
                          data-cell={`${di}:${hi}`}
                          tabIndex={cursor.d === di && cursor.h === hi ? 0 : -1}
                          aria-label={`${d.name} × ${h.name}: ${pairLine(c)}`}
                          aria-pressed={isPinned}
                          onFocus={(e) => (setCursor({ d: di, h: hi }), show(di, hi, e.currentTarget))}
                          onBlur={clear}
                          onClick={() => toggle(c)}
                          className={`grid place-items-center rounded-full transition-transform duration-[var(--dur-2)] ease-[var(--ease-out)] ${on ? "scale-110" : ""} ${isPinned ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                          style={{ width: COL - 6, height: ROW - 4 }}
                        >
                          <Dot c={c} max={max} size={Math.min(COL, ROW) - 2} />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div role="gridcell" className="tabular flex items-center justify-end border-t border-rule pl-2 text-[12px] text-muted" style={{ height: ROW }}>
                  {plural(d.films, "film")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <FloatTip state={tip} />
    </div>
  );
}

/** Legend: circle area = films together; colour = share of hits. */
export function PairingsLegend({ max }: { max: number }) {
  const sizes = [1, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <span className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className="inline-flex items-center gap-2">
        {sizes.map((n) => {
          const r = Math.max(5, 19 * Math.sqrt(n / max));
          return (
            <span key={n} className="inline-flex items-center gap-1">
              <svg width={r * 2 + 2} height={r * 2 + 2} aria-hidden>
                <circle cx={r + 1} cy={r + 1} r={r} fill="none" stroke="var(--ink-2)" strokeWidth={1} />
              </svg>
              <span className="tabular">{n}</span>
            </span>
          );
        })}
        <span>films together</span>
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="tabular">0%</span>
        <span aria-hidden className="h-2.5 w-28 rounded-full" style={{ background: "linear-gradient(to right, var(--v-flop), var(--v-average), var(--v-blockbuster))" }} />
        <span className="tabular">100% hits</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--v-unknown)" strokeWidth="1.5" strokeDasharray="2.5 2" />
        </svg>
        no result yet
      </span>
    </span>
  );
}
