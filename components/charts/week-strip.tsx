"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { FloatTip, type FloatTipState } from "@/components/charts/float-tip";
import { MiniMark } from "@/components/entity/tokens";
import type { Outcome } from "@/lib/ledger-types";

export interface WeekFilm {
  t: string;
  /** Release kind: theatrical | ott | dubbed. */
  k: string;
  /** Outcome when the film is one of the ledger's (a tracked hero leads it). */
  o?: Outcome;
}
export interface Week {
  /** ISO date of the week's first day. */
  start: string;
  /** Month (0–11) the week starts in: clicking a week opens that month's list. */
  m: number;
  films: WeekFilm[];
  /** Entirely after the data date (the running year): drawn hatched, never as an empty week. */
  future: boolean;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const KIND_VAR: Record<string, string> = { theatrical: "var(--k-theatrical)", ott: "var(--k-ott)", dubbed: "var(--k-dubbed)" };
const short = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]}`;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** Ink scale on paper: more releases, more ink (CSS variables, so dark mode inverts correctly). */
const ink = (n: number, max: number) => (n === 0 ? "var(--surface-2)" : `color-mix(in oklab, var(--ink) ${Math.round(12 + 72 * (n / max))}%, var(--surface-2))`);

/**
 * A year as 52 weeks: each cell is one week, darker for more releases. Point at (or arrow-key to) a week for
 * its films; click it to jump to that month's list. Weeks after the data date are hatched, not empty.
 */
export function WeekStrip({ weeks, year, label }: { weeks: Week[]; year: number; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<FloatTipState | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...weeks.map((w) => w.films.length));

  const show = (i: number | null) => {
    setActive(i);
    const el = i === null ? null : box.current?.querySelector<HTMLElement>(`[data-week="${i}"]`);
    if (i === null || !el) return setTip(null);
    const w = weeks[i];
    const r = el.getBoundingClientRect();
    const end = addDays(w.start, 6);
    setTip({
      x: r.left + r.width / 2,
      y: r.top,
      y2: r.bottom,
      content: (
        <div className="min-w-[200px]">
          <p className="font-semibold text-ink">
            {short(w.start)} – {short(end)}
          </p>
          <p className="mb-1.5 text-[11.5px] text-muted">{w.future ? "Still to come" : w.films.length ? `${w.films.length} ${w.films.length === 1 ? "release" : "releases"}` : "No releases"}</p>
          {w.films.length > 0 && (
            <ul className="space-y-1">
              {w.films.slice(0, 10).map((f, j) => (
                <li key={j} className="flex items-center gap-1.5">
                  {f.o ? <MiniMark o={f.o} /> : <span aria-hidden className="mx-[0.5px] h-[7px] w-[7px] shrink-0 rounded-[2px]" style={{ background: KIND_VAR[f.k] }} />}
                  <span className={`truncate ${f.o ? "font-medium text-ink" : "text-ink-2"}`}>{f.t}</span>
                </li>
              ))}
              {w.films.length > 10 && <li className="text-muted">and {w.films.length - 10} more</li>}
            </ul>
          )}
        </div>
      ),
    });
  };
  const open = (i: number) => {
    const el = document.getElementById(`m-${weeks[i].m}`);
    if (!el) return;
    const d = el.closest("details");
    if (d && !d.open) d.open = true;
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      show(active === null ? (d > 0 ? 0 : weeks.length - 1) : Math.max(0, Math.min(weeks.length - 1, active + d)));
    } else if (e.key === "Enter" && active !== null) open(active);
    else if (e.key === "Escape") show(null);
  };

  // Month ticks at each month's first day, on the same 0–1 year fraction FilmStrip uses.
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const starts = days.map((_, m) => days.slice(0, m).reduce((a, b) => a + b, 0) / (leap ? 366 : 365));

  return (
    <div className="relative">
      <div
        ref={box}
        role="img"
        tabIndex={0}
        aria-label={label}
        onKeyDown={onKey}
        onBlur={() => show(null)}
        onMouseLeave={() => show(null)}
        className="grid gap-[2px] px-[4px] outline-none sm:gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((w, i) => (
          <span
            key={w.start}
            data-week={i}
            onMouseEnter={() => show(i)}
            onClick={() => open(i)}
            className={`h-9 cursor-pointer rounded-[3px] transition-[box-shadow,transform] duration-[var(--dur-1)] sm:h-11 ${w.future ? "hatch text-field" : ""} ${active === i ? "shadow-[0_0_0_2px_var(--accent)]" : ""}`}
            style={w.future ? undefined : { background: ink(w.films.length, max) }}
          />
        ))}
      </div>
      <div aria-hidden className="relative mx-[4px] mt-1.5 h-4">
        {starts.map((f, m) => (
          <span key={m} className="absolute text-[10.5px] text-muted" style={{ left: `${f * 100}%` }}>
            <span className="max-sm:hidden">{MON[m]}</span>
            <span className="sm:hidden">{m % 3 === 0 ? MON[m] : ""}</span>
          </span>
        ))}
      </div>
      <FloatTip state={tip} />
    </div>
  );
}

/** The ink scale, as a legend. */
export function WeekLegend({ max }: { max: number }) {
  const steps = [0, 1, Math.max(2, Math.round(max / 3)), Math.max(3, Math.round((2 * max) / 3)), max].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>Fewer</span>
      {steps.map((n) => (
        <span key={n} aria-hidden className="h-3 w-3 rounded-[2px]" style={{ background: ink(n, max) }} />
      ))}
      <span>more releases a week</span>
    </span>
  );
}
