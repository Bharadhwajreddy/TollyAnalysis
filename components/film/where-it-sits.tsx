"use client";

import type { ReactNode } from "react";
import { FilmStrip } from "@/components/charts/film-strip";
import { useElementWidth } from "@/components/charts/use-width";
import type { FilmDot } from "@/lib/ledger-types";
import { spine } from "@/lib/timeline";

export interface SitsRow {
  key: string;
  label: ReactNode;
  note: string;
  films: FilmDot[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "Where it sits": the film highlighted in every strip that contains it, all on the same 2000 → today spine
 * (so the column lines up from row to row), then a lens that opens its release year to full width.
 */
export function WhereItSits({
  slug,
  rows,
  year,
  yearFilms,
  yearLabel,
  end,
  partialFrom,
  pos,
}: {
  /** Fractional-year position of this film (draws the "you are here" line through every row). */
  pos: number;
  slug: string;
  rows: SitsRow[];
  year: number;
  yearFilms: FilmDot[];
  yearLabel: ReactNode;
  end: number;
  partialFrom: number | null;
}) {
  const yEnd = Math.min(year + 1, end);
  return (
    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-[200px_minmax(0,1fr)]">
      {rows.map((r, i) => (
        <Row key={r.key} label={r.label} note={r.note} last={i === rows.length - 1} frac={(pos - 2000) / (end - 2000)}>
          <FilmStrip films={r.films} start={2000} end={end} height={38} highlight={slug} partialFrom={partialFrom} axis={i === rows.length - 1} ariaLabel={`${r.note}; this film is outlined`} className="min-w-0" />
        </Row>
      ))}
      <div className="hidden md:block" />
      <Lens year={year} end={end} />
      <div className="border-t border-rule pt-3 md:border-0 md:pt-6">{yearLabel}</div>
      <div className="min-w-0 pt-2 md:pt-6">
        <FilmStrip films={yearFilms} start={year} end={yEnd} height={64} labels={5} highlight={slug} ariaLabel={`Every tracked film released in ${year}; this film is outlined`} className="min-w-0" />
        <Months year={year} end={yEnd} />
      </div>
    </div>
  );
}

function Row({ label, note, last, frac, children }: { label: ReactNode; note: string; last: boolean; frac: number; children: ReactNode }) {
  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-rule pt-3 md:block md:border-0 md:pt-0">
        <div className="min-w-0 truncate text-[14px]">{label}</div>
        <p className="tabular text-[12px] text-muted md:mt-0.5">{note}</p>
      </div>
      <div className={`relative min-w-0 py-2 ${last ? "" : "md:pb-4"}`}>
        <span aria-hidden className="pointer-events-none absolute top-0 w-0 border-l border-dashed border-accent/45" style={{ left: `calc(4px + (100% - 8px) * ${frac})`, bottom: last ? 26 : 0 }} />
        {children}
      </div>
    </>
  );
}

/** Two lines that open the year on the spine out to the full width below. */
function Lens({ year, end }: { year: number; end: number }) {
  const [ref, w] = useElementWidth<HTMLDivElement>(600);
  const s = spine(2000, end, 4, Math.max(10, w - 4));
  const a = s.x(year);
  const b = s.x(Math.min(year + 1, end));
  const H = 34;
  return (
    <div ref={ref} aria-hidden className="relative hidden min-w-0 md:block">
      <svg width={w} height={H} className="block overflow-visible">
        <rect x={a} y={0} width={Math.max(2, b - a)} height={3} rx={1.5} fill="var(--accent)" />
        <path d={`M${a},3 L4,${H} M${b},3 L${w - 4},${H}`} stroke="var(--field-2)" strokeWidth={1} fill="none" strokeDasharray="3 3" />
        <path d={`M${a},3 L${b},3 L${w - 4},${H} L4,${H} Z`} fill="var(--accent-wash)" opacity={0.45} />
      </svg>
    </div>
  );
}

function Months({ year, end }: { year: number; end: number }) {
  const [ref, w] = useElementWidth<HTMLDivElement>(600);
  const s = spine(year, end, 4, Math.max(10, w - 4));
  const months = MONTHS.map((m, i) => ({ m, p: year + i / 12 })).filter((x) => x.p <= end);
  return (
    <div ref={ref} aria-hidden className="relative mt-1 h-4 min-w-0 border-t border-rule">
      {months.map((x, i) => (
        <span key={x.m} className={`tabular absolute top-1 text-[10.5px] text-muted ${w < 520 && i % 2 ? "hidden" : ""}`} style={{ left: s.x(x.p + 1 / 24), transform: "translateX(-50%)" }}>
          {x.m}
        </span>
      ))}
    </div>
  );
}
