"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useElementWidth } from "@/components/charts/use-width";
import { TipRow } from "@/components/charts/float-tip";
import { Ledger, type LedgerRow } from "@/components/charts/ledger";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { ParetoChart, paretoFrontier, type ScatterAxis } from "@/components/charts/pareto-chart";
import { FilmToken, HeroFace } from "@/components/entity/tokens";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { DataTable, type Column, type SortState } from "@/components/ui/data-table";
import { Picker } from "@/components/ui/picker";
import { Segmented } from "@/components/ui/segmented";
import { AXES, BOXOFFICE_COLS, CAREER_COLS, PILLARS, WINDOWS, fmtCell, type ExplorerHero, type Win, type WindowedCol } from "@/lib/explorer-types";
import { HERO_METRICS } from "@/lib/ledger-metrics";

export type View = "ledger" | "table" | "scatter";
export type ColSet = "index" | "boxoffice" | "career";

export interface ExplorerState {
  view: View;
  set: ColSet;
  metric: string | null;
  win: Win;
  x: string;
  y: string;
}

const WIN_PARAM: Record<Win, string | null> = { all_time: null, last_5_years: "5y", last_10_films: "10f" };
const SET_LABEL: Record<ColSet, string> = { index: "Tolly Index", boxoffice: "Box office", career: "Career & reach" };

/** Write the explorer state to the address bar without a navigation (shareable, back-button friendly). */
function syncUrl(s: ExplorerState) {
  const p = new URLSearchParams(window.location.search);
  const view = s.view === "table" ? (s.set === "index" ? "table" : s.set) : s.view;
  if (view === "ledger") p.delete("view");
  else p.set("view", view);
  if (s.metric) p.set("metric", s.metric);
  else p.delete("metric");
  const w = s.view === "table" && s.set !== "index" ? WIN_PARAM[s.win] : null;
  if (w) p.set("window", w);
  else p.delete("window");
  if (s.view === "scatter") {
    p.set("x", s.x);
    p.set("y", s.y);
  } else {
    p.delete("x");
    p.delete("y");
  }
  const q = p.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`);
}

const IDX: [number, number] = [30, 80];
const idxPos = (v: number) => `${Math.max(0, Math.min(100, ((v - IDX[0]) / (IDX[1] - IDX[0])) * 100))}%`;

function IndexAxis() {
  return (
    <div aria-hidden className="relative ml-[88px] mt-0.5 h-4 w-[132px]">
      {[30, 40, 50, 60, 70, 80].map((t) => (
        <span key={t} className="tabular absolute top-0 -translate-x-1/2 text-[10.5px] font-normal normal-case tracking-normal text-muted" style={{ left: idxPos(t) }}>
          {t}
        </span>
      ))}
    </div>
  );
}

function IndexCell({ h, sorted }: { h: ExplorerHero; sorted: boolean }) {
  if (h.index === null) return <span className="text-muted">—</span>;
  const lo = h.index - (h.band ?? 0);
  const hi = h.index + (h.band ?? 0);
  return (
    <span className="flex items-center gap-3" aria-label={`${h.index.toFixed(1)}, likely between ${lo.toFixed(1)} and ${hi.toFixed(1)}`}>
      <span className="w-[76px] shrink-0 text-right">
        <span className={`num text-[15.5px] ${sorted ? "font-semibold text-ink" : "font-medium text-ink"}`}>{h.index.toFixed(1)}</span>
        {h.band !== null && <span className="tabular ml-1 text-[11.5px] text-muted">±{h.band.toFixed(1)}</span>}
      </span>
      <span aria-hidden className="relative h-4 w-[132px] shrink-0">
        {[40, 50, 60, 70].map((t) => (
          <span key={t} className="absolute inset-y-0.5 w-px bg-grid" style={{ left: idxPos(t) }} />
        ))}
        <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
        {h.band !== null && <span className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-field" style={{ left: idxPos(lo), width: `calc(${idxPos(hi)} - ${idxPos(lo)})` }} />}
        <span className={`absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-surface ${sorted ? "bg-ink" : "bg-ink-2"}`} style={{ left: idxPos(h.index) }} />
      </span>
    </span>
  );
}

function PillarCell({ v, sorted }: { v: number | null; sorted: boolean }) {
  if (v === null) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span aria-hidden className="relative h-[6px] w-8 overflow-hidden rounded-full bg-surface-2">
        <span className={`absolute inset-y-0 left-0 rounded-full transition-colors duration-[var(--dur-2)] ${sorted ? "bg-ink" : "bg-[var(--field-2)]"}`} style={{ width: `${Math.max(2, Math.min(100, v))}%` }} />
      </span>
      <span className={`w-7 ${sorted ? "font-semibold text-ink" : "text-ink-2"}`}>{Math.round(v)}</span>
    </span>
  );
}

const Num = ({ children, sorted }: { children: ReactNode; sorted: boolean }) => <span className={sorted ? "font-semibold text-ink" : "text-ink-2"}>{children}</span>;

function heroColumn(width: number): Column<ExplorerHero> {
  return {
    key: "hero",
    header: "Hero",
    unit: "# by Tolly Index",
    align: "left",
    width,
    sticky: true,
    sortValue: (h) => h.rank ?? null,
    asc: true,
    cell: (h) => (
      <Link href={`/hero/${h.slug}`} className="group/h flex min-w-0 items-center gap-2.5">
        <span className="tabular w-5 shrink-0 text-right text-[12px] text-muted">{h.rank ?? ""}</span>
        <HeroFace slug={h.slug} name={h.name} size={26} morph={false} />
        <span className="truncate font-semibold text-ink decoration-1 underline-offset-[3px] group-hover/h:underline">{h.name}</span>
      </Link>
    ),
  };
}

function windowedCols(cols: WindowedCol[], win: Win, width: number, heroes: ExplorerHero[]): Column<ExplorerHero>[] {
  // A measure nobody has a value for in this period is left out rather than shown as a column of dashes.
  return cols.filter((c) => heroes.some((h) => h.w[win][c.key] !== null)).map((c) => ({
    key: c.key,
    header: c.label,
    unit: c.unit,
    title: c.hint,
    width,
    asc: c.asc,
    sortValue: (h) => h.w[win][c.key],
    cell: (h, { sorted }) => <Num sorted={sorted}>{fmtCell(h.w[win][c.key], c.fmt)}</Num>,
  }));
}

/** The Index explorer: the same ranked heroes as a career Ledger, an all-numbers table or a trade-off scatter. */
export function IndexExplorer({ heroes, rows, end, partialFrom, initial, asOf }: { heroes: ExplorerHero[]; rows: LedgerRow[]; end: number; partialFrom: number; initial: ExplorerState; asOf: string }) {
  const [s, setS] = useState<ExplorerState>(initial);
  const update = (patch: Partial<ExplorerState>) =>
    setS((prev) => {
      const next = { ...prev, ...patch };
      syncUrl(next);
      return next;
    });

  const [boxRef, boxW] = useElementWidth<HTMLDivElement>(1200);
  const heroW = boxW < 640 ? 158 : 214;
  const ranked = useMemo(() => heroes.filter((h) => h.rank !== null).sort((a, b) => (a.rank as number) - (b.rank as number)), [heroes]);

  // ── Table
  const columns = useMemo<Column<ExplorerHero>[]>(() => {
    if (s.set === "boxoffice") return [heroColumn(heroW), ...windowedCols(BOXOFFICE_COLS, s.win, 112, ranked)];
    if (s.set === "career") return [heroColumn(heroW), ...windowedCols(CAREER_COLS, s.win, 100, ranked)];
    return [
      heroColumn(heroW),
      {
        key: "index",
        header: "Tolly Index",
        unit: "0–100, ± likely range",
        headerExtra: <IndexAxis />,
        align: "left",
        width: 236,
        sortValue: (h) => h.index,
        cell: (h, { sorted }) => <IndexCell h={h} sorted={sorted} />,
      },
      ...PILLARS.map<Column<ExplorerHero>>((p) => ({
        key: p.key,
        header: p.label,
        unit: "0–100",
        title: p.hint,
        width: 84,
        sortValue: (h) => h.pillars[p.key],
        cell: (h, { sorted }) => <PillarCell v={h.pillars[p.key]} sorted={sorted} />,
      })),
      { key: "hits", header: "Hits", unit: "of judged", width: 76, title: "Hits and blockbusters among his films with a known result", sortValue: (h) => h.hits, cell: (h, { sorted }) => <Num sorted={sorted}>{h.hits}<span className="text-muted"> / {h.judged}</span></Num> },
      { key: "gross", header: "Gross", unit: "₹ cr, reported", width: 90, title: "Reported worldwide gross of all his films since 2000", sortValue: (h) => h.gross, cell: (h, { sorted }) => <Num sorted={sorted}>{fmtCell(h.gross, "inr")}</Num> },
      {
        key: "best",
        header: "Best film",
        unit: "by film score",
        align: "left",
        width: 180,
        cell: (h) => (h.best ? <FilmToken slug={h.best.slug} title={h.best.title} year={h.best.year} o={h.best.o} className="max-w-full text-[13px] [&>span:first-of-type]:min-w-0 [&>span:first-of-type]:truncate" /> : <span className="text-muted">—</span>),
      },
    ];
  }, [s.set, s.win, heroW, ranked]);
  const defaultSortKey = s.set === "boxoffice" ? "starScore" : s.set === "career" ? "films" : "index";
  const sortKey = s.metric && columns.some((c) => c.key === s.metric && c.sortValue) ? s.metric : defaultSortKey;
  const sortCol = columns.find((c) => c.key === sortKey);
  const [dir, setDir] = useState<"asc" | "desc" | null>(null);
  const sort: SortState = { key: sortKey, dir: dir ?? (sortCol?.asc ? "asc" : "desc") };

  // ── Scatter
  const xA = AXES.find((a) => a.key === s.x) ?? AXES[6];
  const yA = AXES.find((a) => a.key === s.y) ?? AXES[1];
  const [frontier, setFrontier] = useState(true);
  const toAxis = (a: (typeof AXES)[number]): ScatterAxis => ({ key: a.key, label: a.label, unit: a.unit, log: a.log, asc: a.asc, cap: a.cap, fmt: a.fmt });
  const points = useMemo(
    () =>
      ranked
        .map((h) => ({ h, x: xA.get(h), y: yA.get(h) }))
        .filter((p): p is { h: ExplorerHero; x: number; y: number } => p.x !== null && p.y !== null && (!xA.log || p.x > 0) && (!yA.log || p.y > 0))
        .map(({ h, x, y }) => ({
          id: h.slug,
          label: h.name,
          img: h.img,
          x,
          y,
          href: `/hero/${h.slug}`,
          extra: <TipRow k="Tolly Index" v={`${h.index?.toFixed(1)} · #${h.rank}`} />,
        })),
    [ranked, xA, yA],
  );
  const front = useMemo(() => (frontier ? paretoFrontier(points, !xA.asc, !yA.asc) : []), [frontier, points, xA, yA]);
  const missing = ranked.length - points.length;

  const finding =
    s.view === "ledger" ? (
      "Every ranked hero, one row each: his films on one timeline, taller for a bigger reported gross. Switch the measure and the rows re-sort."
    ) : s.view === "table" ? (
      s.set === "index" ? (
        "The index and the five parts it is built from, each 0 to 100. The grey band is the likely range: overlapping bands mean about level."
      ) : s.set === "boxoffice" ? (
        "Hits, blockbusters and reported grosses for the chosen period. # is still the Tolly Index rank."
      ) : (
        "How long, how busy and how steady each career is, and how far his following reaches."
      )
    ) : front.length ? (
      <>
        On the frontier: {front.slice(-4).reverse().map((p, i, a) => (
          <span key={p.id}>
            <Link href={`/hero/${p.id}`} className="font-medium text-ink hover:text-accent">
              {p.label}
            </Link>
            {i < a.length - 2 ? ", " : i === a.length - 2 ? " and " : ""}
          </span>
        ))}
        . No other hero beats them on both.
      </>
    ) : (
      `${yA.label} against ${xA.label.toLowerCase()} for every ranked hero; dashed lines mark the median.`
    );

  const windowed = s.view === "table" && s.set !== "index";

  return (
    <ChartFrame
      id="explorer"
      title={s.view === "ledger" ? "Careers, ranked" : s.view === "table" ? "Every number behind the index" : "Trade-offs"}
      finding={finding}
      aside={
        <Segmented<View>
          label="View"
          value={s.view}
          onChange={(v) => update({ view: v, metric: null })}
          options={[
            { value: "ledger", label: "Ledger" },
            { value: "table", label: "Table" },
            { value: "scatter", label: "Scatter" },
          ]}
        />
      }
      controls={
        s.view === "ledger" ? undefined : (
        <div className="flex flex-col gap-3">
          {s.view === "table" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented<ColSet>
                label="Columns"
                size="sm"
                value={s.set}
                onChange={(v) => {
                  setDir(null);
                  update({ set: v, metric: null });
                }}
                options={(Object.keys(SET_LABEL) as ColSet[]).map((k) => ({ value: k, label: SET_LABEL[k] }))}
              />
              {windowed && <Segmented<Win> label="Period" value={s.win} onChange={(w) => update({ win: w })} options={WINDOWS} size="sm" />}
            </div>
          )}
          {s.view === "scatter" && (
            <div className="flex flex-wrap items-center gap-2">
              <Picker label="Across" value={xA.key} onChange={(v) => update({ x: v })} options={AXES.map((a) => ({ value: a.key, label: a.label, hint: a.log ? "log" : undefined, disabled: a.key === yA.key }))} />
              <Picker label="Up" value={yA.key} onChange={(v) => update({ y: v })} options={AXES.map((a) => ({ value: a.key, label: a.label, hint: a.log ? "log" : undefined, disabled: a.key === xA.key }))} />
              <button type="button" onClick={() => update({ x: yA.key, y: xA.key })} className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-sm:h-10" aria-label="Swap the axes">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M4 2v9M4 11l-2-2M4 11l2-2M10 12V3M10 3 8 5M10 3l2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Swap
              </button>
              <button
                type="button"
                aria-pressed={frontier}
                onClick={() => setFrontier((f) => !f)}
                className="inline-flex h-[34px] items-center gap-2 rounded-[10px] px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-sm:h-10"
              >
                <span aria-hidden className={`grid h-4 w-4 place-items-center rounded-[4px] border transition-colors ${frontier ? "border-ink bg-ink text-surface" : "border-[var(--field-2)]"}`}>
                  {frontier && (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M2 5.2 4.2 7.4 8 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                Frontier
              </button>
            </div>
          )}
        </div>
        )
      }
      legend={
        s.view === "ledger" ? (
          <OutcomeLegend />
        ) : s.view === "scatter" ? (
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-[7px] w-[7px] rounded-full border border-[var(--field-2)] bg-field" />
              {points.length} heroes{missing > 0 ? ` (${missing} without this number)` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-0 w-4 border-t border-dashed border-[var(--field-2)]" />
              median
            </span>
            {frontier && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-0 w-4 border-t-[1.5px] border-ink-2/60" />
                frontier
              </span>
            )}
          </span>
        ) : (
          <span>{s.set === "index" ? "Click a column to sort. Parts are 0–100; ± is the likely range of the index." : `${WINDOWS.find((w) => w.value === s.win)?.label}: — means too few films with data in this period, never zero.`}</span>
        )
      }
      source={<Source>Data as of {asOf}</Source>}
      flush={s.view === "table"}
    >
      {s.view === "ledger" && <Ledger rows={rows} metrics={HERO_METRICS} label="Hero" end={end} partialFrom={partialFrom} metric={s.metric && HERO_METRICS.some((m) => m.key === s.metric) ? s.metric : "index"} onMetricChange={(k) => update({ metric: k === "index" ? null : k })} ariaLabel="Tolly Index ledger" />}
      {s.view === "table" && (
        <div ref={boxRef}>
        <DataTable
          rows={ranked}
          columns={columns}
          rowKey={(h) => h.slug}
          sort={sort}
          onSortChange={(n) => {
            setDir(n.dir);
            update({ metric: n.key === defaultSortKey ? null : n.key });
          }}
          caption={`Tolly Index table, ${SET_LABEL[s.set]} columns`}
        />
        </div>
      )}
      {s.view === "scatter" && <ParetoChart points={points} xAxis={toAxis(xA)} yAxis={toAxis(yA)} frontier={frontier} ariaLabel={`${yA.label} against ${xA.label} for ${points.length} ranked heroes`} />}
    </ChartFrame>
  );
}
