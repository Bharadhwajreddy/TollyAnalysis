"use client";

import { Fragment, useMemo, useState } from "react";

export interface FilmRowView {
  id: string;
  title: string;
  releaseDate: string | null;
  approximate: boolean;
  year: number | null;
  director: string | null;
  music: string | null;
  runtimeMin: number | null;
  genres: string[];
  languages: string[];
  budget: number | null;
  gross: number | null;
  budgetText: string | null;
  grossText: string | null;
  multiple: number | null;
  /** Grouped result used for counts and filters: blockbuster | hit | average | flop | ott | recent | unknown. */
  verdict: string;
  /** Finer wording shown on the badge ("Super hit", "Below average", "Direct to OTT"…). */
  verdictText: string;
  verdictWhy: string | null;
  /** Where the result was read ("Wikipedia film article", "Trade blog (low confidence)"…). */
  verdictSource: string | null;
  verdictUrl: string | null;
  billing: string | null;
  coLeads: string[];
  rating: number | null;
  wiki: string | null;
  wikidata: string | null;
  isDemo: boolean;
}

const BADGE: Record<string, string> = {
  blockbuster: "bg-[#e3f2e6] text-good",
  hit: "bg-[#eef7f1] text-good",
  average: "bg-[#fbf3e4] text-warn",
  flop: "bg-[#fcefee] text-bad",
  ott: "bg-teal-soft text-[#00596a]",
  recent: "bg-teal-soft text-[#00596a]",
  unknown: "bg-surface-2 text-muted",
};

type Key = "releaseDate" | "title" | "gross" | "budget" | "multiple" | "runtimeMin" | "verdict";
const VERDICT_ORDER: Record<string, number> = { blockbuster: 4, hit: 3, average: 2, flop: 1, ott: 0, recent: 0, unknown: -1 };
const cr = (v: number | null) => (v === null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })} cr`);
const FILTERS: [string, string][] = [
  ["all", "All"],
  ["hits", "Hits & blockbusters"],
  ["average", "Average"],
  ["flop", "Flops"],
  ["ott", "Direct to OTT"],
  ["unknown", "Not reported"],
];
const COLS = 12;

/** Every counted film with all the details we have, sortable and filterable, each with its evidence. */
export function HeroFilmsTable({ rows, heroName }: { rows: FilmRowView[]; heroName: string }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "releaseDate", desc: true });
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    const val = (r: FilmRowView): number | string | null =>
      sort.key === "verdict" ? VERDICT_ORDER[r.verdict] : sort.key === "title" ? r.title.toLowerCase() : (r[sort.key] as number | string | null);
    return rows
      .filter(
        (r) =>
          filter === "all" ||
          (filter === "hits" ? r.verdict === "hit" || r.verdict === "blockbuster" : filter === "unknown" ? r.verdict === "unknown" || r.verdict === "recent" : r.verdict === filter),
      )
      .sort((a, b) => {
        const av = val(a);
        const bv = val(b);
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return av < bv ? -dir : av > bv ? dir : 0;
      });
  }, [rows, sort, filter]);
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const countOf = (f: string) =>
    f === "all"
      ? rows.length
      : rows.filter((r) => (f === "hits" ? r.verdict === "hit" || r.verdict === "blockbuster" : f === "unknown" ? r.verdict === "unknown" || r.verdict === "recent" : r.verdict === f)).length;

  return (
    <div className="mt-3">
      <div className="mb-3 flex flex-wrap gap-1.5 text-[12.5px]" role="radiogroup" aria-label="Filter films by result">
        {FILTERS.filter(([v]) => v === "all" || countOf(v) > 0).map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={filter === v}
            onClick={() => setFilter(v)}
            className={`rounded-full border px-3 py-1 font-medium ${filter === v ? "border-wine bg-wine text-white" : "border-line text-ink-2 hover:border-ink-2"}`}
          >
            {l} <span className="tabular opacity-70">{countOf(v)}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((s) => (s.size ? new Set() : new Set(sorted.map((r) => r.id))))}
          className="ml-auto rounded-full border border-line px-3 py-1 font-medium text-ink-2 hover:border-ink-2"
        >
          {open.size ? "Close all evidence" : "Open all evidence"}
        </button>
      </div>
      <div className="scroll-x rounded-lg border border-line">
        {/* The 3 leftmost columns hold the essentials; the rest scroll sideways on phones. */}
        <table className="w-full min-w-[1320px] text-[12.5px]">
          <thead className="bg-surface-2 text-[10.5px] uppercase tracking-wide text-ink-2">
            <tr>
              <Th sort={sort} setSort={setSort} k="title">Film</Th>
              <Th sort={sort} setSort={setSort} k="releaseDate">Released</Th>
              <Th sort={sort} setSort={setSort} k="verdict">Result</Th>
              <Th sort={sort} setSort={setSort} k="gross" right>Worldwide gross</Th>
              <Th sort={sort} setSort={setSort} k="budget" right>Budget</Th>
              <Th sort={sort} setSort={setSort} k="multiple" right>Gross ÷ budget</Th>
              <Th sort={sort} setSort={setSort}>Director</Th>
              <Th sort={sort} setSort={setSort}>Music</Th>
              <Th sort={sort} setSort={setSort} k="runtimeMin" right>Runtime</Th>
              <Th sort={sort} setSort={setSort}>Genre</Th>
              <Th sort={sort} setSort={setSort}>Language</Th>
              <Th sort={sort} setSort={setSort}>Billing</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const isOpen = open.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr className="border-t border-line align-top">
                    <td className="min-w-[200px] px-2.5 py-2 font-medium text-ink">
                      {r.wiki ? (
                        <a href={r.wiki} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wine hover:underline">
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                      {r.isDemo && <span className="ml-1 rounded bg-gold-soft px-1 text-[9.5px] font-semibold text-[#7a5200]">FICTIONAL</span>}
                      {r.coLeads.length > 0 && <span className="block text-[11px] font-normal text-muted">with {r.coLeads.join(", ")}</span>}
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggle(r.id)}
                        className="mt-1 block text-[11.5px] font-normal text-wine hover:underline"
                      >
                        {isOpen ? "▾ Hide evidence" : "▸ Inspect film evidence"}
                      </button>
                    </td>
                    <td className="tabular whitespace-nowrap px-2.5 py-2">{r.releaseDate ? (r.approximate ? r.releaseDate.slice(0, 4) : r.releaseDate) : "—"}</td>
                    <td className="min-w-[150px] px-2.5 py-2">
                      <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11.5px] font-semibold ${BADGE[r.verdict] ?? BADGE.unknown}`} title={r.verdictWhy ?? undefined}>
                        {r.verdictText}
                      </span>
                      {r.verdictSource && <span className="mt-1 block text-[10.5px] text-muted">via {r.verdictSource}</span>}
                    </td>
                    <td className="tabular px-2.5 py-2 text-right" title={r.grossText ?? undefined}>{cr(r.gross)}</td>
                    <td className="tabular px-2.5 py-2 text-right" title={r.budgetText ?? undefined}>{cr(r.budget)}</td>
                    <td className="tabular px-2.5 py-2 text-right font-semibold">{r.multiple ? `${r.multiple}×` : "—"}</td>
                    <td className="min-w-[120px] px-2.5 py-2">{r.director ?? "—"}</td>
                    <td className="min-w-[120px] px-2.5 py-2">{r.music ?? "—"}</td>
                    <td className="tabular px-2.5 py-2 text-right">{r.runtimeMin ? `${r.runtimeMin} min` : "—"}</td>
                    <td className="min-w-[120px] px-2.5 py-2 text-[11.5px]">{r.genres.length ? r.genres.join(", ") : "—"}</td>
                    <td className="px-2.5 py-2 text-[11.5px]">{r.languages.join(", ") || "—"}</td>
                    <td className="px-2.5 py-2 text-[11.5px] text-muted">{r.billing ?? "—"}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-surface-2/60">
                      <td colSpan={COLS} className="px-3 pb-3 pt-1">
                        <dl className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
                          <Fact label="Result">
                            <strong>{r.verdictText}</strong>
                            {r.verdictSource && <> · read from {r.verdictUrl ? <a href={r.verdictUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline">{r.verdictSource}</a> : r.verdictSource}</>}
                          </Fact>
                          <Fact label="Why" wide>
                            {r.verdictWhy ? <span className="italic">“{r.verdictWhy}”</span> : r.verdict === "ott" ? "Released straight to a streaming platform, so there is no box-office result." : "No source we use states a result for this film yet."}
                          </Fact>
                          <Fact label="Reported gross">{r.grossText ?? "not reported"}</Fact>
                          <Fact label="Reported budget">{r.budgetText ?? "not reported"}</Fact>
                          <Fact label="Lead credit">{r.billing ?? "—"}{r.coLeads.length ? ` · co-lead with ${r.coLeads.join(", ")}` : ""}</Fact>
                          <Fact label="Sources">
                            {r.wiki && <a href={r.wiki} target="_blank" rel="noopener noreferrer nofollow" className="mr-3 text-wine underline">Wikipedia</a>}
                            {r.wikidata && <a href={r.wikidata} target="_blank" rel="noopener noreferrer nofollow" className="mr-3 text-wine underline">Wikidata</a>}
                            <a href={`/annexure/corrections?hero=${encodeURIComponent(heroName)}&film=${encodeURIComponent(r.title)}`} className="text-wine underline">
                              Suggest a correction
                            </a>
                          </Fact>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">
        {heroName}&apos;s counted films. Gross = worldwide, all languages, as reported on Wikipedia (lower end of any range). Budget = upper end of any range.
        “Not reported” means no source we use states a result yet — it is never counted as a flop.
      </p>
    </div>
  );
}

function Fact({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink-2">{children}</dd>
    </div>
  );
}

function Th({
  k,
  children,
  right = false,
  sort,
  setSort,
}: {
  k?: Key;
  children: React.ReactNode;
  right?: boolean;
  sort: { key: Key; desc: boolean };
  setSort: (f: (s: { key: Key; desc: boolean }) => { key: Key; desc: boolean }) => void;
}) {
  return (
    <th scope="col" className={`whitespace-nowrap px-2.5 py-2 font-semibold ${right ? "text-right" : "text-left"}`}>
      {k ? (
        <button type="button" onClick={() => setSort((s) => ({ key: k, desc: s.key === k ? !s.desc : true }))} className="inline-flex items-center gap-1 hover:text-ink">
          {children}
          <span aria-hidden className="text-[9px] text-muted">{sort.key === k ? (sort.desc ? "▼" : "▲") : "↕"}</span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}
