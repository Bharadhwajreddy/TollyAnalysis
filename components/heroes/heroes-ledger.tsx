"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FocusChip, useFocus } from "@/components/charts/focus";
import { Ledger, type LedgerRow } from "@/components/charts/ledger";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { DirectorMono } from "@/components/entity/tokens";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { Segmented } from "@/components/ui/segmented";
import { HERO_METRICS } from "@/lib/ledger-metrics";

export type GroupBy = "none" | "family" | "industry" | "era";
export interface HeroMeta {
  family: string;
  industry: string;
  debut: number | null;
  rank: number | null;
}
export interface DirectorOption {
  slug: string;
  name: string;
  films: number;
  heroes: number;
  hits: number;
}

const FAMILY: [string, string][] = [
  ["mega", "Mega family"],
  ["nandamuri", "Nandamuri family"],
  ["akkineni", "Akkineni family"],
  ["daggubati", "Daggubati family"],
  ["ghattamaneni", "Ghattamaneni family"],
  ["manchu", "Manchu family"],
  ["other", "Not from a film family"],
];
const INDUSTRY: [string, string][] = [
  ["telugu", "Telugu"],
  ["tamil", "Tamil"],
  ["malayalam", "Malayalam"],
  ["kannada", "Kannada"],
  ["hindi", "Hindi"],
];
const ERA: [string, string][] = [
  ["pre2000", "Debut before 2000"],
  ["2000s", "Debut 2000–2007"],
  ["2010s", "Debut 2008–2015"],
  ["new", "Debut 2016 onwards"],
];
const eraOf = (y: number | null) => (!y ? "2010s" : y < 2000 ? "pre2000" : y <= 2007 ? "2000s" : y <= 2015 ? "2010s" : "new");

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "");

function syncUrl(patch: Record<string, string | null>) {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const q = p.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
}

/** "Light up a director": a searchable list that pins the page focus to one director. */
function DirectorPicker({ directors }: { directors: DirectorOption[] }) {
  const { pinned, pin } = useFocus();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const list = useMemo(() => {
    const n = fold(q.trim());
    return n ? directors.filter((d) => fold(d.name).split(" ").some((w) => w.startsWith(n)) || fold(d.name).includes(n)) : directors;
  }, [q, directors]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (d: DirectorOption) => {
    pin({ kind: "director", key: d.slug, label: d.name });
    syncUrl({ director: d.slug });
    setQ("");
    setOpen(false);
    input.current?.blur();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.max(0, Math.min(list.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter" && open && list[active]) {
      e.preventDefault();
      choose(list[active]);
    } else if (e.key === "Escape") setOpen(false);
  };
  const lit = pinned?.kind === "director" ? pinned : null;

  return (
    <div ref={box} className="relative">
      <label htmlFor={`${id}-i`} className="sr-only">
        Light up a director&apos;s films
      </label>
      <div className="flex h-[38px] items-center gap-2 rounded-[10px] bg-surface-2 pl-2.5 pr-1.5 max-sm:h-11">
        <DirectorMono name={lit?.label ?? "D"} size={20} />
        <input
          ref={input}
          id={`${id}-i`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-l`}
          aria-autocomplete="list"
          aria-activedescendant={open && list[active] ? `${id}-${active}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={lit ? `Lit: ${lit.label}` : "Light up a director"}
          className="w-full min-w-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted sm:w-[190px]"
        />
      </div>
      {open && (
        <ul id={`${id}-l`} role="listbox" aria-label="Directors" className="pop-in absolute left-0 top-[calc(100%+6px)] z-50 max-h-[340px] w-[300px] max-w-[calc(100vw-32px)] overflow-auto rounded-[12px] border border-rule bg-surface p-1 shadow-[var(--shadow-pop)]">
          {list.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">No director by that name</li>}
          {list.map((d, i) => (
            <li
              key={d.slug}
              id={`${id}-${i}`}
              role="option"
              aria-selected={lit?.key === d.slug}
              onPointerEnter={() => setActive(i)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(d)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] ${i === active ? "bg-surface-2" : ""}`}
            >
              <DirectorMono name={d.name} size={22} />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{d.name}</span>
              <span className="tabular shrink-0 text-[11.5px] text-muted">
                {d.films} films · {d.heroes} heroes
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The Heroes ledger: every hero's career on one timeline. Search filters instantly; Group by splits the list
 * into sections with a heading each (never colour); "Rank by" re-sorts every section at once; lighting up a
 * director pins the page focus so his films stay lit in every strip.
 */
export function HeroesLedger({
  rows,
  meta,
  directors,
  end,
  partialFrom,
  initial,
}: {
  rows: LedgerRow[];
  meta: Record<string, HeroMeta>;
  directors: DirectorOption[];
  end: number;
  partialFrom: number;
  initial: { q: string; group: GroupBy; metric: string };
}) {
  const [q, setQ] = useState(initial.q);
  const dq = useDeferredValue(q);
  const [group, setGroup] = useState<GroupBy>(initial.group);
  const [metric, setMetric] = useState(initial.metric);
  const [onlyHis, setOnlyHis] = useState(false);
  const { pinned } = useFocus();
  const director = pinned?.kind === "director" ? pinned : null;

  useEffect(() => {
    if (!director) syncUrl({ director: null });
  }, [director]);

  const filtered = useMemo(() => {
    const n = fold(dq.trim());
    return rows.filter((r) => {
      if (n && !fold(r.name).split(" ").some((w) => w.startsWith(n)) && !fold(r.name).replace(/ /g, "").includes(n.replace(/ /g, ""))) return false;
      if (director && onlyHis && !r.films.some((f) => f.ds === director.key)) return false;
      return true;
    });
  }, [rows, dq, director, onlyHis]);

  const sections = useMemo(() => {
    if (group === "none") return [{ key: "all", label: null as string | null, rows: filtered }];
    const defs = group === "family" ? FAMILY : group === "industry" ? INDUSTRY : ERA;
    const keyOf = (r: LedgerRow) => {
      const m = meta[r.key];
      if (!m) return "other";
      return group === "family" ? (FAMILY.some(([k]) => k === m.family) ? m.family : "other") : group === "industry" ? m.industry : eraOf(m.debut);
    };
    return defs.map(([key, label]) => ({ key, label, rows: filtered.filter((r) => keyOf(r) === key) })).filter((s) => s.rows.length > 0);
  }, [group, filtered, meta]);

  const litCount = director ? rows.filter((r) => r.films.some((f) => f.ds === director.key)).length : 0;
  const litFilms = director ? new Set(rows.flatMap((r) => r.films.filter((f) => f.ds === director.key).map((f) => f.s))).size : 0;
  const rankFor = (key: string, metricKey: string, position: number) => (metricKey === "index" ? (meta[key]?.rank ?? null) : position);

  return (
    <ChartFrame
      id="heroes"
      title="Every hero, every film"
      finding={
        director
          ? `${director.label}: ${litFilms} films with ${litCount} of these heroes, lit in every career below.`
          : "One row per hero; each tick is a film on the day it released, taller for a bigger reported gross. Heroes outside the index show — and sort last."
      }
      controls={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-[38px] min-w-0 basis-full items-center gap-2 rounded-[10px] bg-surface-2 px-3 max-sm:h-11 sm:basis-[260px]">
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden className="shrink-0 text-muted">
                <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  syncUrl({ q: e.target.value.trim() || null });
                }}
                placeholder="Find a hero"
                aria-label="Find a hero"
                className="w-full min-w-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <button type="button" onClick={() => (setQ(""), syncUrl({ q: null }))} aria-label="Clear search" className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
                  ×
                </button>
              )}
            </div>
            <DirectorPicker directors={directors} />
            <FocusChip />
            {director && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
                <input type="checkbox" checked={onlyHis} onChange={(e) => setOnlyHis(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
                Only his heroes
              </label>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="scroll-x -mx-1 max-w-full px-1">
              <Segmented
                className="!max-w-none"
                label="Rank by"
                size="sm"
                value={metric}
                onChange={(k) => {
                  setMetric(k);
                  syncUrl({ sort: k === "index" ? null : k });
                }}
                options={HERO_METRICS.map((m) => ({ value: m.key, label: m.label, title: m.hint }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-muted">Group</span>
              <div className="scroll-x max-w-full">
                <Segmented<GroupBy>
                  className="!max-w-none"
                  label="Group by"
                  size="sm"
                  value={group}
                  onChange={(g) => {
                    setGroup(g);
                    syncUrl({ group: g === "none" ? null : g });
                  }}
                  options={[
                    { value: "none", label: "None" },
                    { value: "family", label: "Family" },
                    { value: "industry", label: "Industry" },
                    { value: "era", label: "Debut era" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      }
      legend={<OutcomeLegend />}
      source={<Source>{filtered.length === rows.length ? `${rows.length} heroes` : `${filtered.length} of ${rows.length} heroes`}</Source>}
    >
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-muted">No hero matches “{q}”.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.key} aria-label={s.label ?? "All heroes"}>
              {s.label && (
                <h3 className="mb-2 flex items-baseline gap-2 border-b border-ink/80 pb-1.5 font-serif text-[19px] font-semibold text-ink">
                  {s.label}
                  <span className="tabular font-sans text-[12.5px] font-normal text-muted">
                    {s.rows.length} {s.rows.length === 1 ? "hero" : "heroes"}
                  </span>
                </h3>
              )}
              <Ledger rows={s.rows} metrics={HERO_METRICS} metric={metric} showTabs={false} label="Hero" end={end} partialFrom={partialFrom} dense rankFor={rankFor} ariaLabel={s.label ?? "All heroes"} />
            </section>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
