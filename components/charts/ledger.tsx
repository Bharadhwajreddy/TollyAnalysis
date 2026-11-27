"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import Link from "next/link";
import { ViewTransition, useEffect, useMemo, useRef, useState } from "react";
import { FilmStrip } from "@/components/charts/film-strip";
import { useFocus } from "@/components/charts/focus";
import { useElementWidth } from "@/components/charts/use-width";
import { Segmented } from "@/components/ui/segmented";
import { useTween } from "@/components/ui/use-tween";
import type { FilmDot } from "@/lib/ledger-types";
import { spine } from "@/lib/timeline";

export interface LedgerRow {
  key: string;
  href: string;
  name: string;
  /** Hero photo thumb, or null for a director monogram / initials. */
  img: string | null;
  kind: "hero" | "director";
  films: FilmDot[];
  /** Metric values by key (null = no value: sorted last, shown as "—"). */
  values: Record<string, number | null>;
  /** ± uncertainty for metrics that have one. */
  bands?: Record<string, number | null>;
  note?: string | null;
  upcoming?: { title: string; year: number } | null;
  /** Tie-break between equal values (lower first), e.g. the editorial ranking order; distinct values get distinct ranks. */
  seq?: number;
}

export interface LedgerMetric {
  key: string;
  label: string;
  /** Axis domain for the value dot. */
  domain: [number, number];
  /** How to print the value. */
  fmt: "score" | "pct" | "inr" | "int";
  /** Lower is better (sort ascending). */
  asc?: boolean;
  hint?: string;
}

const FMT: Record<LedgerMetric["fmt"], (v: number) => string> = {
  score: (v) => v.toFixed(1),
  pct: (v) => `${Math.round(v)}%`,
  inr: (v) => `₹${Math.round(v).toLocaleString("en-IN")} cr`,
  int: (v) => String(Math.round(v)),
};

const initials = (n: string) =>
  n
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Face({ row, size }: { row: LedgerRow; size: number }) {
  if (row.kind === "director")
    return (
      <span aria-hidden className="grid shrink-0 place-items-center rounded-[5px] bg-surface-2 font-semibold text-ink-2 ring-1 ring-rule" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {initials(row.name)}
      </span>
    );
  return (
    <ViewTransition name={`face-${row.key}`} share="morph" default="none">
      <span aria-hidden className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-rule" style={{ width: size, height: size }}>
        {row.img ? <img src={row.img} alt="" width={size} height={size} loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_18%]" /> : <span className="text-[11px] font-semibold text-ink-2">{initials(row.name)}</span>}
      </span>
    </ViewTransition>
  );
}

function Value({ v, band, metric }: { v: number | null; band: number | null | undefined; metric: LedgerMetric }) {
  const t = useTween(v ?? 0);
  const [lo, hi] = metric.domain;
  const pos = (x: number) => `${Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className="flex items-center gap-3">
      <span className="num w-[52px] shrink-0 text-right text-[17px] font-semibold text-ink">{v === null ? <span className="text-muted">—</span> : FMT[metric.fmt](t)}</span>
      <span className="relative hidden h-5 w-[110px] shrink-0 lg:block" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
        {v !== null && band ? <span className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-field transition-[left,width] duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ left: pos(v - band), width: `calc(${pos(v + band)} - ${pos(v - band)})` }} /> : null}
        {v !== null && <span className="absolute top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink transition-[left] duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ left: pos(v) }} />}
      </span>
    </div>
  );
}

/**
 * The Ledger: one row per hero (or director); on the left the rank, face, name and the active metric on a
 * visible axis; on the right every film of his career on the shared 2000 → today spine. Switching the metric
 * re-sorts the rows: they glide to their new places (no remount), values tween.
 */
export function Ledger({
  rows,
  metrics,
  initialMetric,
  start = 2000,
  end,
  partialFrom = null,
  limit,
  label,
  moreHref,
  moreLabel,
  showTabs = true,
  metric: controlled,
  onMetricChange,
  dense = false,
  rankFor,
  ariaLabel,
}: {
  rows: LedgerRow[];
  metrics: LedgerMetric[];
  initialMetric?: string;
  start?: number;
  end: number;
  partialFrom?: number | null;
  limit?: number;
  label: string;
  moreHref?: string;
  moreLabel?: string;
  showTabs?: boolean;
  /** Controlled metric key (several Ledgers sharing one "Rank by" control). */
  metric?: string;
  onMetricChange?: (key: string) => void;
  /** Tighter rows (long lists, e.g. every hero). */
  dense?: boolean;
  /** Override the rank shown in a row (e.g. the true index rank inside a filtered list). */
  rankFor?: (key: string, metricKey: string, position: number) => number | null;
  ariaLabel?: string;
}) {
  const [ownMetric, setOwnMetric] = useState(initialMetric ?? metrics[0].key);
  const metricKey = controlled ?? ownMetric;
  const setMetric = (k: string) => {
    setOwnMetric(k);
    onMetricChange?.(k);
  };
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [axisRef, axisW] = useElementWidth<HTMLDivElement>(600);
  const [boxRef, boxW] = useElementWidth<HTMLDivElement>(1000);
  const { focus } = useFocus();
  const narrow = boxW < 760;
  const rowH = dense ? (narrow ? 64 : 40) : narrow ? 82 : 56;

  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => {
      const va = a.values[metric.key];
      const vb = b.values[metric.key];
      if (va === null && vb === null) return a.name.localeCompare(b.name);
      if (va === null) return 1;
      if (vb === null) return -1;
      return (metric.asc ? va - vb : vb - va) || (a.seq ?? 0) - (b.seq ?? 0) || a.name.localeCompare(b.name);
    });
    return s;
  }, [rows, metric]);
  const pos = new Map(sorted.map((r, i) => [r.key, i]));
  const ranks = new Map<string, number>();
  sorted.forEach((r, i) => {
    const v = r.values[metric.key];
    const prev = i > 0 ? sorted[i - 1] : null;
    ranks.set(r.key, v === null ? 0 : prev && prev.values[metric.key] === v && prev.seq === r.seq ? (ranks.get(prev.key) as number) : i + 1);
  });
  if (rankFor) for (const [k, r] of ranks) ranks.set(k, rankFor(k, metric.key, r) ?? 0);
  const shownN = limit && !expanded ? Math.min(limit, rows.length) : rows.length;
  const visible = new Set(sorted.slice(0, shownN).map((r) => r.key));
  const s = spine(start, end, 4, Math.max(10, axisW - 4), axisW < 420 ? 10 : axisW < 700 ? 5 : 2);

  // Keep the hovered row in sync after a re-sort.
  const lastHover = useRef<string | null>(null);
  useEffect(() => {
    if (lastHover.current) setHover(pos.get(lastHover.current) ?? null);
  }, [metricKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusHero = focus?.kind === "hero" ? focus.key : null;

  return (
    <div>
      {showTabs && metrics.length > 1 && (
        <div className="scroll-x -mx-1 mb-4 px-1 pb-0.5">
          <Segmented className="!max-w-none" label="Rank by" value={metricKey} onChange={setMetric} options={metrics.map((m) => ({ value: m.key, label: m.label, title: m.hint }))} />
        </div>
      )}
      <div ref={boxRef} role={ariaLabel ? "group" : undefined} aria-label={ariaLabel}>
        {/* Column header with the shared time axis */}
        <div className={`grid items-end gap-4 border-b border-rule pb-2 ${narrow ? "grid-cols-1" : "grid-cols-[minmax(260px,330px)_1fr] lg:grid-cols-[minmax(360px,420px)_1fr]"}`}>
          <div className="flex items-center justify-between pl-1 pr-2">
            <span className="label">{label}</span>
            <span className="flex items-end gap-3">
              <span className="label w-[52px] text-right">{metric.label}</span>
              <span className="relative hidden h-4 w-[110px] lg:block" aria-hidden>
                {[metric.domain[0], (metric.domain[0] + metric.domain[1]) / 2, metric.domain[1]].map((t, i) => (
                  <span key={i} className="tabular absolute -translate-x-1/2 text-[10.5px] text-muted" style={{ left: `${i * 50}%` }}>
                    {metric.fmt === "inr" ? (t >= 1000 ? `${t / 1000}k` : t) : metric.fmt === "pct" ? `${t}%` : t}
                  </span>
                ))}
              </span>
            </span>
          </div>
          <div ref={axisRef} className="relative h-4" aria-hidden>
            {s.ticks.map((t) => (
              <span key={t} className="tabular absolute -translate-x-1/2 text-[11px] text-muted" style={{ left: s.x(t) }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="relative transition-[height] duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ height: shownN * rowH }} onMouseLeave={() => (setHover(null), (lastHover.current = null))}>
          {/* Sliding row highlight */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 rounded-[10px] bg-surface-2 transition-[transform,opacity] duration-[var(--dur-2)] ease-[var(--ease-out)]" style={{ height: rowH, transform: `translateY(${(hover ?? 0) * rowH}px)`, opacity: hover === null ? 0 : 1 }} />
          {rows.map((r) => {
            const i = pos.get(r.key) as number;
            const v = r.values[metric.key];
            const on = visible.has(r.key);
            const rank = ranks.get(r.key) ?? 0;
            const dimmed = focusHero && focusHero !== r.key;
            return (
              <div
                key={r.key}
                onMouseEnter={() => (setHover(i), (lastHover.current = r.key))}
                className={`absolute inset-x-0 top-0 grid items-center gap-x-4 px-1 transition-[transform,opacity] duration-[var(--dur-4)] ease-[var(--ease-in-out)] ${narrow ? "grid-cols-1 content-center gap-y-1" : "grid-cols-[minmax(260px,330px)_1fr] lg:grid-cols-[minmax(360px,420px)_1fr]"}`}
                style={{ height: rowH, transform: `translateY(${i * rowH}px)`, opacity: on ? (dimmed ? 0.35 : 1) : 0, pointerEvents: on ? undefined : "none", visibility: on ? undefined : "hidden" }}
                aria-hidden={!on}
              >
                <div className="flex min-w-0 items-center gap-3 pr-2">
                  <span className="tabular w-6 shrink-0 text-right text-[12.5px] text-muted">{rank || ""}</span>
                  <Link href={r.href} className="group/r flex min-w-0 flex-1 items-center gap-2.5 rounded-md" tabIndex={on ? 0 : -1}>
                    <Face row={r} size={dense ? 24 : 30} />
                    <span className="min-w-0">
                      <span className={`block truncate font-semibold text-ink decoration-1 underline-offset-[3px] group-hover/r:underline ${dense ? "text-[14px]" : "text-[14.5px]"}`}>{r.name}</span>
                      {r.note && (!dense || narrow) && <span className="block truncate text-[11.5px] text-muted">{r.note}</span>}
                    </span>
                  </Link>
                  <Value v={v} band={r.bands?.[metric.key]} metric={metric} />
                </div>
                <FilmStrip films={r.films} start={start} end={end} height={dense ? (narrow ? 20 : 26) : narrow ? 26 : 32} partialFrom={partialFrom} upcoming={r.upcoming ?? null} ariaLabel={`${r.name}: ${r.films.length} films on a timeline`} />
              </div>
            );
          })}
        </div>
      </div>
      {limit && rows.length > limit && (
        <div className="mt-3 flex items-center gap-4 border-t border-rule pt-3">
          <button type="button" onClick={() => setExpanded((e) => !e)} className="text-[13.5px] font-medium text-ink hover:text-accent">
            {expanded ? "Show fewer" : `Show all ${rows.length}`}
          </button>
          {moreHref && (
            <Link href={moreHref} className="text-[13.5px] font-medium text-accent hover:underline">
              {moreLabel ?? "Open the full table"} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
