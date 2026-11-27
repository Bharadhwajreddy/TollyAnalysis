"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { lit, useFocus } from "@/components/charts/focus";
import { DirectorToken, FilmToken, HeroToken, MiniMark } from "@/components/entity/tokens";
import { Segmented } from "@/components/ui/segmented";
import { date as fmtDate, multiple as fmtMultiple } from "@/lib/format";
import { filmHref, type FilmDot, type Outcome } from "@/lib/ledger-types";

export interface HeroFilmRow {
  dot: FilmDot;
  slug: string;
  title: string;
  year: number;
  date: string | null;
  o: Outcome;
  result: string;
  score: number | null;
  gross: number | null;
  grossText: string;
  budget: number | null;
  budgetText: string;
  multiple: number | null;
  director: { slug: string | null; name: string } | null;
  coLeads: { slug: string; name: string }[];
  why: string | null;
  source: { label: string; url: string | null } | null;
  language: string | null;
}

type Filter = "all" | "hits" | "average" | "flops" | "unknown";
type SortKey = "date" | "score" | "gross" | "multiple";

const GROUP: Record<Outcome, Filter> = {
  blockbuster: "hits",
  hit: "hits",
  average: "average",
  flop: "flops",
  disaster: "flops",
  unknown: "unknown",
  recent: "unknown",
  ott: "unknown",
};

const COLS = "md:grid-cols-[minmax(200px,1.7fr)_92px_128px_96px_112px_100px_52px_minmax(130px,1fr)]";

/**
 * His films as a ledger: one row per film, newest first. Filter by result (rows fold away rather than vanish),
 * sort by a column (rows glide to their new place), open a row for the reported verdict and its source.
 */
export function FilmsTable({ rows }: { rows: HeroFilmRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "date", desc: true });
  const [open, setOpen] = useState<string | null>(null);
  const { focus } = useFocus();
  const box = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, number> | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, hits: 0, average: 0, flops: 0, unknown: 0 };
    for (const r of rows) c[GROUP[r.o]]++;
    return c;
  }, [rows]);

  const sorted = useMemo(() => {
    const val = (r: HeroFilmRow): number | null =>
      sort.key === "date" ? Date.parse(r.date ?? `${r.year}-07-01`) : sort.key === "score" ? r.score : sort.key === "gross" ? r.gross : r.multiple;
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sort.desc ? vb - va : va - vb;
    });
  }, [rows, sort]);

  // FLIP: rows glide from where they were to their new place when the sort changes.
  const measure = () => {
    const m = new Map<string, number>();
    box.current?.querySelectorAll<HTMLElement>("[data-row]").forEach((el) => m.set(el.dataset.row as string, el.getBoundingClientRect().top));
    before.current = m;
  };
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    box.current?.querySelectorAll<HTMLElement>("[data-row]").forEach((el) => {
      const was = prev.get(el.dataset.row as string);
      if (was === undefined) return;
      const dy = was - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform var(--dur-4) var(--ease-in-out)";
        el.style.transform = "";
      });
    });
  }, [sort]);

  const sortBy = (key: SortKey) => {
    measure();
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));
  };

  const shown = sorted.filter((r) => filter === "all" || GROUP[r.o] === filter).length;
  const opts: { value: Filter; label: React.ReactNode }[] = (
    [
      ["all", "All"],
      ["hits", "Hits"],
      ["average", "Average"],
      ["flops", "Flops"],
      ["unknown", "Not reported"],
    ] as [Filter, string][]
  )
    .filter(([k]) => k === "all" || counts[k] > 0)
    .map(([k, l]) => ({
      value: k,
      label: (
        <span className="inline-flex items-center gap-1.5">
          {l}
          <span className="tabular text-[11.5px] text-muted">{counts[k]}</span>
        </span>
      ),
    }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="scroll-x -mx-4 max-w-[calc(100%+2rem)] px-4 sm:mx-0 sm:max-w-full sm:px-0">
          <Segmented label="Show films" value={filter} onChange={setFilter} options={opts} />
        </div>
        <p className="tabular text-[12.5px] text-muted" aria-live="polite">
          {shown === rows.length ? `${rows.length} films` : `${shown} of ${rows.length} films`}
        </p>
      </div>
      <div ref={box} role="table" aria-label="Films" className="text-[13.5px]">
        <div role="rowgroup" className="hidden md:block">
          <div role="row" className={`grid items-end gap-x-4 border-b border-rule px-2 pb-2 ${COLS}`}>
            <span role="columnheader" className="label">Film</span>
            <SortHead k="date" sort={sort} onSort={sortBy}>Released</SortHead>
            <span role="columnheader" className="label">Result</span>
            <SortHead k="score" sort={sort} onSort={sortBy} right>Film score</SortHead>
            <SortHead k="gross" sort={sort} onSort={sortBy} right>Gross</SortHead>
            <span role="columnheader" className="label text-right">Budget</span>
            <SortHead k="multiple" sort={sort} onSort={sortBy} right>×</SortHead>
            <span role="columnheader" className="label">Director</span>
          </div>
        </div>
        <div role="rowgroup">
          {sorted.map((r) => {
            const on = filter === "all" || GROUP[r.o] === filter;
            const isOpen = open === r.slug && on;
            const dim = !!focus && focus.kind !== "hero" && !lit(r.dot, focus);
            return (
              <div
                key={r.slug}
                data-row={r.slug}
                className="grid transition-[grid-template-rows,opacity] duration-[var(--dur-4)] ease-[var(--ease-in-out)]"
                style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? (dim ? 0.38 : 1) : 0 }}
                aria-hidden={!on}
                inert={!on}
              >
                <div className="min-h-0 overflow-hidden">
                  <div role="row" className={`group/row border-b border-rule transition-colors duration-[var(--dur-1)] ${isOpen ? "bg-surface-2/60" : "hover:bg-surface-2/50"}`}>
                    <div
                      className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-2 py-3 md:min-h-[52px] md:py-2 ${COLS}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("a")) return;
                        setOpen(isOpen ? null : r.slug);
                      }}
                    >
                      <span role="cell" className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Hide" : "Show"} details for ${r.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(isOpen ? null : r.slug);
                          }}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink max-md:hidden"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={`transition-transform duration-[var(--dur-2)] ${isOpen ? "rotate-90" : ""}`}>
                            <path d="M3.5 1.5 7 5l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <span className="min-w-0">
                          <FilmToken slug={r.slug} title={r.title} o={r.o} showYear={false} className="text-[14.5px] leading-snug" />
                          {r.coLeads.length > 0 && (
                            <span className="block truncate text-[12px] text-muted">
                              with{" "}
                              {r.coLeads.map((c, j) => (
                                <span key={c.slug}>
                                  <HeroToken slug={c.slug} name={c.name} face={false} className="!font-normal !text-muted hover:!text-accent" />
                                  {j < r.coLeads.length - 1 && ", "}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </span>
                      <span role="cell" className="tabular text-right text-[12.5px] text-muted md:text-left md:text-[13px] md:text-ink-2">
                        <span className="md:hidden">{r.year}</span>
                        <span className="max-md:hidden">{r.date ? fmtDate(r.date) : r.year}</span>
                      </span>
                      <span role="cell" className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-2 md:contents md:text-[13.5px]">
                        <span className="inline-flex items-center gap-1.5 md:text-ink">
                          <MiniMark o={r.o} className="max-md:hidden" />
                          {r.result}
                        </span>
                        <span className="md:hidden">{r.score !== null && <>Score <b className="tabular font-semibold text-ink">{r.score.toFixed(1)}</b></>}</span>
                        <span className="md:hidden">{r.gross !== null && <b className="tabular font-semibold text-ink">{r.grossText}</b>}</span>
                        <span className="tabular md:hidden">{r.multiple !== null && `${fmtMultiple(r.multiple)} budget`}</span>
                      </span>
                      <span role="cell" className="max-md:hidden">
                        <ScoreCell v={r.score} />
                      </span>
                      <span role="cell" className="tabular whitespace-nowrap text-right font-medium text-ink max-md:hidden">{r.gross !== null ? r.grossText : <span className="text-faint">—</span>}</span>
                      <span role="cell" className="tabular whitespace-nowrap text-right text-ink-2 max-md:hidden">{r.budget !== null ? r.budgetText : <span className="text-faint">—</span>}</span>
                      <span role="cell" className={`tabular text-right max-md:hidden ${r.multiple !== null && r.multiple < 1 ? "text-muted" : "text-ink-2"}`}>{r.multiple !== null ? fmtMultiple(r.multiple) : <span className="text-faint">—</span>}</span>
                      <span role="cell" className="col-span-2 min-w-0 truncate text-[12.5px] md:col-span-1 md:text-[13.5px]">
                        {r.director ? <DirectorToken slug={r.director.slug} name={r.director.name} className="max-w-full truncate !font-normal md:!font-medium" /> : <span className="text-faint">—</span>}
                      </span>
                    </div>
                    <div className="grid transition-[grid-template-rows] duration-[var(--dur-3)] ease-[var(--ease-out)]" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                      <div className="min-h-0 overflow-hidden">
                        <Detail r={r} open={isOpen} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Detail({ r, open }: { r: HeroFilmRow; open: boolean }) {
  return (
    <div className={`grid gap-x-10 gap-y-3 px-2 pb-4 pt-1 md:grid-cols-[minmax(0,1fr)_auto] md:pl-10 ${open ? "" : "invisible"}`}>
      <div className="max-w-2xl">
        {r.why ? <p className="text-[13.5px] leading-relaxed text-ink-2">{r.o === "recent" || r.o === "ott" ? r.why : <>&ldquo;{r.why.replace(/^"|"$/g, "")}&rdquo;</>}</p> : <p className="text-[13.5px] text-muted">No box-office result has been reported for this film.</p>}
        {r.source && (
          <p className="mt-1.5 text-[12px] text-muted">
            Source:{" "}
            {r.source.url ? (
              <a href={r.source.url} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-rule underline-offset-2 hover:text-ink">
                {r.source.label} ↗
              </a>
            ) : (
              r.source.label
            )}
            {r.gross !== null && " · grosses are as reported, worldwide, all languages"}
          </p>
        )}
        {r.coLeads.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
            Also starring
            {r.coLeads.map((c) => (
              <HeroToken key={c.slug} slug={c.slug} name={c.name} size={18} />
            ))}
          </p>
        )}
      </div>
      <Link href={filmHref(r.slug)} className="link self-start whitespace-nowrap text-[13px] font-medium">
        Open the film page →
      </Link>
    </div>
  );
}

function ScoreCell({ v }: { v: number | null }) {
  if (v === null) return <span className="block text-right text-faint">—</span>;
  const pos = Math.max(0, Math.min(100, ((v - 20) / 80) * 100));
  return (
    <span className="flex items-center justify-end gap-2">
      <span aria-hidden className="relative h-3 w-9">
        <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
        <span className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-2" style={{ left: `${pos}%` }} />
      </span>
      <span className="tabular w-9 text-right font-medium text-ink">{v.toFixed(1)}</span>
    </span>
  );
}

function SortHead({ k, sort, onSort, right, children }: { k: SortKey; sort: { key: SortKey; desc: boolean }; onSort: (k: SortKey) => void; right?: boolean; children: React.ReactNode }) {
  const on = sort.key === k;
  return (
    <span role="columnheader" aria-sort={on ? (sort.desc ? "descending" : "ascending") : "none"} className={right ? "text-right" : ""}>
      <button type="button" onClick={() => onSort(k)} className={`label inline-flex items-center gap-1 hover:text-ink ${on ? "!text-ink" : ""} ${right ? "flex-row-reverse" : ""}`}>
        {children}
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden className={`transition-[transform,opacity] duration-[var(--dur-2)] ${on ? "opacity-100" : "opacity-0"} ${on && !sort.desc ? "rotate-180" : ""}`}>
          <path d="M1 2.5 4 5.5 7 2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}
