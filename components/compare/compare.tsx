"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlignedReels } from "@/components/charts/aligned-reels";
import { FocusChip, useFocusTrigger } from "@/components/charts/focus";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { DirectorMono, FilmToken, HeroFace } from "@/components/entity/tokens";
import { ChartFrame } from "@/components/ui/chart-frame";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SectionTitle } from "@/components/layout/page-header";
import { PILLARS, fmtCell, type ExplorerHero, type Fmt } from "@/lib/explorer-types";
import { directorHref, type FilmDot } from "@/lib/ledger-types";

const SLOTS = ["var(--slot-a)", "var(--slot-b)", "var(--slot-c)", "var(--slot-d)"];
const SLOT_NAME = ["A", "B", "C", "D"];

interface Chosen {
  h: ExplorerHero;
  slot: number;
  color: string;
}

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "+ Add hero": a searchable list (ranked heroes first, by rank; then everyone else by name). */
function AddHero({ heroes, taken, onAdd }: { heroes: ExplorerHero[]; taken: Set<string>; onAdd: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const list = useMemo(() => {
    const n = fold(q.trim());
    const pool = heroes.filter((h) => !taken.has(h.slug) && (!n || fold(h.name).split(/\s+/).some((w) => w.startsWith(n)) || fold(h.name).includes(n)));
    return pool.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));
  }, [q, heroes, taken]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    requestAnimationFrame(() => input.current?.focus());
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (slug: string) => {
    onAdd(slug);
    setOpen(false);
    setQ("");
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(list.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter" && list[active]) {
      e.preventDefault();
      pick(list[active].slug);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-[var(--field-2)] px-3.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
      >
        <span aria-hidden className="text-[16px] leading-none">+</span> Add hero
      </button>
      {open && (
        <div className="pop-in absolute left-0 top-[calc(100%+6px)] z-50 w-[320px] max-w-[calc(100vw-32px)] rounded-[12px] border border-rule bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <input
            ref={input}
            role="combobox"
            aria-expanded
            aria-controls={`${id}-l`}
            aria-activedescendant={list[active] ? `${id}-${active}` : undefined}
            aria-label="Find a hero to add"
            value={q}
            onChange={(e) => (setQ(e.target.value), setActive(0))}
            onKeyDown={onKey}
            placeholder="Find a hero"
            className="mb-1 h-10 w-full rounded-[8px] bg-surface-2 px-3 text-[13.5px] text-ink outline-none placeholder:text-muted"
          />
          <ul id={`${id}-l`} role="listbox" aria-label="Heroes" className="max-h-[300px] overflow-auto">
            {list.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">No hero by that name</li>}
            {list.map((h, i) => (
              <li
                key={h.slug}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(h.slug)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13.5px] ${i === active ? "bg-surface-2" : ""}`}
              >
                <HeroFace slug={h.slug} name={h.name} size={26} morph={false} />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{h.name}</span>
                <span className="tabular shrink-0 text-[11.5px] text-muted">{h.rank ? `#${h.rank} · ${h.index?.toFixed(1)}` : h.industry === "telugu" ? "not ranked yet" : "outside index"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Two heroes: a butterfly — A's bars grow left, B's grow right, on one 0–100 scale. */
function Butterfly({ a, b }: { a: Chosen; b: Chosen }) {
  return (
    <div role="table" aria-label={`${a.h.name} and ${b.h.name}, parts of the Tolly Index`} className="grid gap-y-2.5">
      <div role="row" className="grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-end gap-3 pb-1 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
        <span role="columnheader" className="flex items-center justify-end gap-2 text-[13px] font-semibold text-ink">
          {a.h.name}
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
        </span>
        <span role="columnheader" className="label text-center">0–100</span>
        <span role="columnheader" className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
          {b.h.name}
        </span>
      </div>
      {PILLARS.map((p) => {
        const va = a.h.pillars[p.key];
        const vb = b.h.pillars[p.key];
        const lead = va !== null && vb !== null ? (va > vb ? "a" : vb > va ? "b" : null) : null;
        const bar = (v: number | null, c: Chosen, side: "l" | "r", leads: boolean) => (
          <span role="cell" className={`flex items-center gap-2 ${side === "l" ? "flex-row-reverse" : ""}`}>
            <span className={`relative h-[18px] flex-1 ${side === "l" ? "rotate-180" : ""}`} aria-hidden>
              <span className="absolute inset-0 rounded-[3px] bg-surface-2" />
              {v !== null && <span className="absolute inset-y-0 left-0 rounded-[3px] transition-[width] duration-[var(--dur-4)] ease-[var(--ease-in-out)]" style={{ width: `${Math.max(1, Math.min(100, v))}%`, background: c.color, opacity: leads ? 1 : 0.55 }} />}
              <span className="absolute inset-y-[-3px] left-1/2 w-px bg-[var(--field-2)]" />
            </span>
            <span className={`num w-9 shrink-0 text-[14px] ${side === "l" ? "text-right" : ""} ${leads ? "font-semibold text-ink" : "text-ink-2"}`}>{v === null ? "—" : Math.round(v)}</span>
          </span>
        );
        return (
          <div role="row" key={p.key} className="grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]" title={p.hint}>
            {bar(va, a, "l", lead === "a")}
            <span role="rowheader" className="text-center text-[13px] font-medium text-ink-2">
              {p.label}
            </span>
            {bar(vb, b, "r", lead === "b")}
          </div>
        );
      })}
      <p className="pt-1 text-center text-[12px] text-muted">The stronger side of each row is drawn solid; the thin line marks 50.</p>
    </div>
  );
}

/** Three or four heroes: one 0–100 line per part, a dot per hero in his slot colour. */
function DotPlot({ chosen }: { chosen: Chosen[] }) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  return (
    <div className="grid gap-y-1">
      <div className="grid grid-cols-[96px_1fr_auto] items-end gap-4 pb-1 sm:grid-cols-[120px_1fr_150px]">
        <span />
        <span className="relative h-4" aria-hidden>
          {[0, 25, 50, 75, 100].map((t) => (
            <span key={t} className="tabular absolute -translate-x-1/2 text-[11px] text-muted" style={{ left: pos(t) }}>
              {t}
            </span>
          ))}
        </span>
        <span className="label text-right max-sm:hidden">Leader</span>
      </div>
      {PILLARS.map((p) => {
        const vals = chosen.map((c) => c.h.pillars[p.key]);
        const best = Math.max(...vals.map((v) => v ?? -1));
        const leaders = chosen.filter((c, i) => vals[i] !== null && vals[i] === best);
        return (
          <div key={p.key} className="grid grid-cols-[96px_1fr_auto] items-center gap-4 border-t border-rule py-2.5 sm:grid-cols-[120px_1fr_150px]" title={p.hint}>
            <span className="text-[13px] font-medium text-ink-2">{p.label}</span>
            <span className="relative h-7" role="img" aria-label={`${p.label}: ${chosen.map((c, i) => `${c.h.name} ${vals[i] === null ? "no data" : Math.round(vals[i] as number)}`).join(", ")}`}>
              <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
              {[25, 50, 75].map((t) => (
                <span key={t} className="absolute inset-y-1 w-px bg-grid" style={{ left: pos(t) }} />
              ))}
              {chosen.map((c, i) =>
                vals[i] === null ? null : (
                  <span
                    key={c.h.slug}
                    className="absolute h-3 w-3 -translate-x-1/2 rounded-full border-2 border-surface transition-[left] duration-[var(--dur-4)] ease-[var(--ease-in-out)]"
                    style={{ left: pos(vals[i] as number), top: `calc(50% - 6px + ${(i - (chosen.length - 1) / 2) * 5}px)`, background: c.color, zIndex: 4 - i }}
                    title={`${c.h.name}: ${Math.round(vals[i] as number)}`}
                  />
                ),
              )}
            </span>
            <span className="flex items-center justify-end gap-1.5 text-[12.5px] max-sm:hidden">
              {leaders.length ? (
                <>
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: leaders[0].color }} />
                  <span className="truncate text-ink">{leaders.map((l) => l.h.name).join(", ")}</span>
                  <span className="num font-semibold text-ink">{Math.round(best)}</span>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface MetricRow {
  key: string;
  label: string;
  unit?: string;
  fmt: Fmt;
  get: (h: ExplorerHero) => number | null;
  /** Lower is better. */
  asc?: boolean;
  /** No leader (descriptive rows). */
  plain?: boolean;
  show?: (h: ExplorerHero) => ReactNode;
}

const METRIC_ROWS: MetricRow[] = [
  { key: "index", label: "Tolly Index", unit: "0–100", fmt: "score", get: (h) => h.index, show: (h) => (h.index === null ? null : <>{h.index.toFixed(1)}<span className="ml-1 text-[11.5px] font-normal text-muted">±{h.band?.toFixed(1)}</span></>) },
  { key: "rank", label: "Rank", fmt: "int", get: (h) => h.rank, asc: true, show: (h) => (h.rank === null ? null : `#${h.rank}`) },
  ...PILLARS.map((p) => ({ key: p.key, label: p.label, unit: "0–100", fmt: "score" as Fmt, get: (h: ExplorerHero) => h.pillars[p.key] })),
  { key: "films", label: "Films since 2000", fmt: "int", get: (h) => h.films, plain: true },
  { key: "hits", label: "Hits", fmt: "int", get: (h) => h.hits, show: (h) => <>{h.hits}<span className="font-normal text-muted"> / {h.judged}</span></> },
  { key: "hitRate", label: "Hit rate", unit: "%", fmt: "pct", get: (h) => h.hitRate },
  { key: "blockbusters", label: "Blockbusters", fmt: "int", get: (h) => h.blockbusters },
  { key: "bigFilms", label: "₹100-crore films", fmt: "int", get: (h) => h.bigFilms },
  { key: "gross", label: "Reported gross", unit: "₹ cr", fmt: "inr", get: (h) => h.gross },
  { key: "topGross", label: "Biggest film", unit: "₹ cr", fmt: "inr", get: (h) => h.topGross },
  { key: "perFilm", label: "Gross per film", unit: "₹ cr", fmt: "inr", get: (h) => (h.gross && h.grossFilms ? h.gross / h.grossFilms : null) },
  { key: "recent", label: "Recent hits", fmt: "int", get: (h) => (h.recentJudged ? h.recentHits : null), show: (h) => (h.recentJudged ? <>{h.recentHits}<span className="font-normal text-muted"> of last {h.recentJudged}</span></> : null) },
  { key: "years", label: "Years active", fmt: "int", get: (h) => h.yearsActive, plain: true },
  { key: "peak", label: "Most films in a year", fmt: "int", get: (h) => h.peakFilms, plain: true },
  { key: "gap", label: "Gap between films", unit: "months", fmt: "dec", get: (h) => h.releaseGap, plain: true },
  { key: "followers", label: "Followers", unit: "millions", fmt: "dec", get: (h) => (h.followers ? h.followers / 1e6 : null) },
  { key: "debut", label: "Debut", fmt: "int", get: (h) => h.debut, plain: true, show: (h) => (h.debut ? String(h.debut) : null) },
];

function DirectorItem({ slug, name, per, chosen }: { slug: string | null; name: string; per: number[]; chosen: Chosen[] }) {
  const trig = useFocusTrigger({ kind: "director", key: slug ?? name, label: name });
  const total = per.reduce((s, n) => s + n, 0);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-rule py-2.5 sm:grid-cols-[minmax(0,240px)_1fr]">
      <span className="flex min-w-0 items-center gap-2">
        <button type="button" {...trig} className="shrink-0 rounded-[4px]" aria-label={`Light up ${name}'s films in the reels`}>
          <DirectorMono name={name} size={22} />
        </button>
        {slug ? (
          <Link href={directorHref(slug)} onMouseEnter={trig.onMouseEnter} onMouseLeave={trig.onMouseLeave} className="truncate text-[14px] font-medium text-ink hover:text-accent hover:underline">
            {name}
          </Link>
        ) : (
          <span className="truncate text-[14px] font-medium text-ink-2">{name}</span>
        )}
      </span>
      <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[12.5px] text-ink-2 sm:justify-start">
        {chosen.map((c, i) =>
          per[i] ? (
            <span key={c.h.slug} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              <span className="max-sm:hidden">{c.h.name}</span>
              <span className="tabular font-semibold text-ink">{per[i]}</span>
            </span>
          ) : null,
        )}
        <span className="tabular text-muted max-sm:hidden">· {total} films</span>
      </span>
    </li>
  );
}

/**
 * Compare: slot chips (A–D), the aligned career reels, the index parts (butterfly for two, dot plot for
 * three or four), every number with the leader marked, and the films and directors they share.
 */
export function Compare({ heroes, initial, end, partialFrom }: { heroes: ExplorerHero[]; initial: string[]; end: number; partialFrom: number }) {
  const by = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const [slots, setSlots] = useState<(string | null)[]>(() => [0, 1, 2, 3].map((i) => initial[i] ?? null));

  const sync = (next: (string | null)[]) => {
    setSlots(next);
    const q = next.filter(Boolean).join(",");
    const p = new URLSearchParams(window.location.search);
    p.delete("h");
    if (q) p.set("heroes", q);
    else p.delete("heroes");
    const s = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s.replace(/%2C/g, ",")}` : ""}`);
  };
  const add = (slug: string) => {
    const i = slots.indexOf(null);
    if (i === -1 || slots.includes(slug)) return;
    sync(slots.map((s, k) => (k === i ? slug : s)));
  };
  const remove = (slug: string) => sync(slots.map((s) => (s === slug ? null : s)));

  const chosen: Chosen[] = slots.flatMap((s, i) => (s && by.get(s) ? [{ h: by.get(s)!, slot: i, color: SLOTS[i] }] : []));
  const taken = new Set(chosen.map((c) => c.h.slug));

  const shared = useMemo(() => {
    const films = new Map<string, { f: FilmDot; who: number[] }>();
    chosen.forEach((c, i) => (c.h.dots ?? []).forEach((f) => films.set(f.s, { f, who: [...(films.get(f.s)?.who ?? []), i] })));
    const together = [...films.values()].filter((x) => x.who.length > 1).sort((a, b) => b.f.y - a.f.y);
    const dirs = new Map<string, { slug: string | null; name: string; per: number[] }>();
    chosen.forEach((c, i) =>
      (c.h.dots ?? []).forEach((f) => {
        if (!f.d) return;
        const k = f.ds ?? f.d;
        const e = dirs.get(k) ?? { slug: f.ds, name: f.d, per: chosen.map(() => 0) };
        e.per[i]++;
        dirs.set(k, e);
      }),
    );
    const common = [...dirs.values()].filter((d) => d.per.filter(Boolean).length > 1).sort((a, b) => b.per.reduce((s, n) => s + n, 0) - a.per.reduce((s, n) => s + n, 0));
    return { together, common };
  }, [chosen]);

  const metricRows = METRIC_ROWS.filter((m) => chosen.some((c) => m.get(c.h) !== null));
  const columns: Column<MetricRow>[] = [
    {
      key: "label",
      header: "Measure",
      align: "left",
      width: 176,
      sticky: true,
      cell: (m) => (
        <span className="block truncate text-[13.5px] text-ink-2">
          {m.label}
          {m.unit && <span className="ml-1 text-[11.5px] text-muted">{m.unit}</span>}
        </span>
      ),
    },
    ...chosen.map<Column<MetricRow>>((c) => ({
      key: c.h.slug,
      header: (
        <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
          <span className="truncate text-[12.5px] font-semibold text-ink">{c.h.name}</span>
        </span>
      ),
      width: chosen.length <= 2 ? 160 : chosen.length === 3 ? 128 : 112,
      cell: (m) => {
        const vals = chosen.map((x) => m.get(x.h));
        const v = m.get(c.h);
        const present = vals.filter((x): x is number => x !== null);
        const best = present.length ? (m.asc ? Math.min(...present) : Math.max(...present)) : null;
        const leads = !m.plain && v !== null && present.length > 1 && v === best && present.some((x) => x !== best);
        const shown = m.show ? m.show(c.h) : fmtCell(v, m.fmt);
        return (
          <span className={`inline-flex items-center justify-end gap-2 ${leads ? "font-semibold text-ink" : "text-ink-2"}`}>
            {shown === null ? <span className="text-muted">—</span> : <span>{shown}</span>}
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full transition-opacity duration-[var(--dur-2)]" style={{ background: c.color, opacity: leads ? 1 : 0 }} />
            {leads && <span className="sr-only">(leads)</span>}
          </span>
        );
      },
    })),
  ];

  const outside = chosen.filter((c) => c.h.rank === null);

  return (
    <div className="mt-8">
      {/* Slots */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Heroes being compared">
        {chosen.map((c) => (
          <span key={c.h.slug} className="pop-in inline-flex h-10 items-center gap-2 rounded-full border border-rule bg-surface py-1 pl-1.5 pr-1 text-[13.5px] shadow-[var(--shadow-soft)]">
            <span className="relative">
              <HeroFace slug={c.h.slug} name={c.h.name} size={28} morph={false} />
              <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface" style={{ background: c.color }} />
            </span>
            <Link href={`/hero/${c.h.slug}`} className="font-semibold text-ink hover:text-accent">
              {c.h.name}
            </Link>
            <span className="tabular text-[12px] text-muted">{c.h.rank ? `#${c.h.rank}` : ""}</span>
            <span className="sr-only">slot {SLOT_NAME[c.slot]}</span>
            <button type="button" onClick={() => remove(c.h.slug)} aria-label={`Remove ${c.h.name}`} className="grid h-8 w-8 place-items-center rounded-full text-[16px] text-muted hover:bg-surface-2 hover:text-ink">
              ×
            </button>
          </span>
        ))}
        {chosen.length < 4 && <AddHero heroes={heroes} taken={taken} onAdd={add} />}
      </div>
      {outside.length > 0 && (
        <p className="mt-3 text-[13px] text-muted">
          {outside.map((c) => c.h.name).join(" and ")} {outside.length === 1 ? "is" : "are"} not in the Tolly Index ({outside.map((c) => c.h.reason?.toLowerCase()).filter(Boolean).join("; ")}), so {outside.length === 1 ? "his" : "their"} index and parts show —.
        </p>
      )}

      {chosen.length < 2 ? (
        <div className="mt-10 border-y border-rule py-16 text-center">
          <p className="text-[16px] font-medium text-ink">Add {chosen.length ? "one more hero" : "two heroes"} to compare.</p>
          <p className="mt-1 text-[14px] text-muted">Every hero the site tracks can be compared, including those outside the index.</p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <ChartFrame id="reels" title="Careers, film by film" finding="Each tick is a film, taller for a bigger reported gross. Line careers up by calendar year, or start them together at their debut." legend={<OutcomeLegend />}>
              <AlignedReels rows={chosen.map((c) => ({ key: c.h.slug, name: c.h.name, img: c.h.img, color: c.color, debut: c.h.debut, films: c.h.dots ?? [] }))} end={end} partialFrom={partialFrom} />
            </ChartFrame>
          </div>

          <div className={`mt-6 grid grid-cols-1 gap-6 lg:items-start ${chosen.length > 2 ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"}`}>
            <ChartFrame className="min-w-0 lg:sticky lg:top-24" id="parts" title="The parts of the index" finding={chosen.length === 2 ? "Each part is 0 to 100. Longer is better." : "Each part is 0 to 100, one dot per hero."}>
              <div className="pb-4">{chosen.length === 2 ? <Butterfly a={chosen[0]} b={chosen[1]} /> : <DotPlot chosen={chosen} />}</div>
            </ChartFrame>

            <ChartFrame className="min-w-0" id="numbers" title="Every number" finding="The dot marks who leads each row. — means no data, never zero." flush>
              <DataTable rows={metricRows} columns={columns} rowKey={(m) => m.key} caption={`Numbers for ${chosen.map((c) => c.h.name).join(", ")}`} />
            </ChartFrame>
          </div>

          <section aria-labelledby="shared" className="mt-24">
            <SectionTitle
              id="shared"
              title="What they share"
              finding={
                shared.together.length || shared.common.length
                  ? `${shared.together.length ? `${shared.together.length} ${shared.together.length === 1 ? "film" : "films"} together` : "No film together"} and ${shared.common.length || "no"} ${shared.common.length === 1 ? "director" : "directors"} in common. Hover a director to light up his films in the reels.`
                  : "No film together and no director in common."
              }
              aside={<FocusChip />}
            />
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h3 className="label mb-2">Films together</h3>
                {shared.together.length ? (
                  <ul className="border-t border-rule">
                    {shared.together.map(({ f, who }) => (
                      <li key={f.s} className="flex items-center justify-between gap-4 border-b border-rule py-2.5">
                        <FilmToken slug={f.s} title={f.t} year={f.y} o={f.o} className="min-w-0 text-[14px] [&>span:first-of-type]:truncate" />
                        <span className="flex shrink-0 items-center -space-x-1.5">
                          {who.map((i) => (
                            <span key={i} className="rounded-full ring-2 ring-surface" title={chosen[i].h.name}>
                              <HeroFace slug={chosen[i].h.slug} name={chosen[i].h.name} size={22} morph={false} />
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-rule pt-3 text-[14px] text-muted">They have not led a film together since 2000.</p>
                )}
              </div>
              <div>
                <h3 className="label mb-2">Directors in common</h3>
                {shared.common.length ? (
                  <ul className="border-t border-rule">
                    {shared.common.slice(0, 12).map((d) => (
                      <DirectorItem key={d.slug ?? d.name} slug={d.slug} name={d.name} per={d.per} chosen={chosen} />
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-rule pt-3 text-[14px] text-muted">No director has worked with more than one of them.</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
