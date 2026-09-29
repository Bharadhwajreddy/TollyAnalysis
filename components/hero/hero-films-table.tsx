"use client";

import { useMemo, useState } from "react";

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
  verdict: string;
  verdictWhy: string | null;
  billing: string | null;
  coLeads: string[];
  rating: number | null;
  wiki: string | null;
  wikidata: string | null;
  isDemo: boolean;
}

const VERDICT: Record<string, { label: string; cls: string }> = {
  blockbuster: { label: "Blockbuster", cls: "bg-[#e3f2e6] text-good" },
  hit: { label: "Hit", cls: "bg-[#eef7f1] text-good" },
  average: { label: "Average", cls: "bg-[#fbf3e4] text-warn" },
  flop: { label: "Flop", cls: "bg-[#fcefee] text-bad" },
  unknown: { label: "Unknown", cls: "bg-surface-2 text-muted" },
  recent: { label: "Too recent", cls: "bg-teal-soft text-[#00596a]" },
};

type Key = "releaseDate" | "title" | "gross" | "budget" | "multiple" | "runtimeMin" | "verdict";
const VERDICT_ORDER: Record<string, number> = { blockbuster: 4, hit: 3, average: 2, flop: 1, recent: 0, unknown: -1 };
const cr = (v: number | null) => (v === null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })} cr`);

/** Every counted film with all the details we have, sortable and filterable. */
export function HeroFilmsTable({ rows, heroName }: { rows: FilmRowView[]; heroName: string }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "releaseDate", desc: true });
  const [filter, setFilter] = useState("all");
  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    const val = (r: FilmRowView): number | string | null =>
      sort.key === "verdict" ? VERDICT_ORDER[r.verdict] : sort.key === "title" ? r.title.toLowerCase() : (r[sort.key] as number | string | null);
    return rows
      .filter((r) => filter === "all" || (filter === "hits" ? r.verdict === "hit" || r.verdict === "blockbuster" : r.verdict === filter))
      .sort((a, b) => {
        const av = val(a);
        const bv = val(b);
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return av < bv ? -dir : av > bv ? dir : 0;
      });
  }, [rows, sort, filter]);

  return (
    <div className="mt-3">
      <div className="mb-3 flex flex-wrap gap-1.5 text-[12.5px]" role="radiogroup" aria-label="Filter films by result">
        {[
          ["all", "All"],
          ["hits", "Hits & blockbusters"],
          ["average", "Average"],
          ["flop", "Flops"],
          ["unknown", "Unknown"],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={filter === v}
            onClick={() => setFilter(v)}
            className={`rounded-full border px-3 py-1 font-medium ${filter === v ? "border-wine bg-wine text-white" : "border-line text-ink-2 hover:border-ink-2"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="scroll-x rounded-lg border border-line">
        {/* The 3 leftmost columns hold the essentials; the rest scroll sideways on phones. */}
        <table className="w-full min-w-[1500px] text-[12.5px]">
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
              <Th sort={sort} setSort={setSort}>Sources</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const v = VERDICT[r.verdict] ?? VERDICT.unknown;
              return (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="min-w-[180px] px-2.5 py-2 font-medium text-ink">
                    {r.wiki ? (
                      <a href={r.wiki} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wine hover:underline">
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                    {r.isDemo && <span className="ml-1 rounded bg-gold-soft px-1 text-[9.5px] font-semibold text-[#7a5200]">FICTIONAL</span>}
                    {r.coLeads.length > 0 && <span className="block text-[11px] font-normal text-muted">with {r.coLeads.join(", ")}</span>}
                  </td>
                  <td className="tabular whitespace-nowrap px-2.5 py-2">
                    {r.releaseDate ? (r.approximate ? r.releaseDate.slice(0, 4) : r.releaseDate) : "—"}
                  </td>
                  <td className="min-w-[230px] px-2.5 py-2">
                    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11.5px] font-semibold ${v.cls}`} title={r.verdictWhy ?? undefined}>
                      {v.label}
                    </span>
                    {r.verdictWhy && r.verdict !== "unknown" && <span className="mt-0.5 line-clamp-2 max-w-[260px] text-[10.5px] leading-snug text-muted">{r.verdictWhy}</span>}
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
                  <td className="whitespace-nowrap px-2.5 py-2 text-[11.5px]">
                    {r.wiki && (
                      <a href={r.wiki} target="_blank" rel="noopener noreferrer nofollow" className="mr-2 text-wine underline">
                        Wikipedia
                      </a>
                    )}
                    {r.wikidata && (
                      <a href={r.wikidata} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline">
                        Wikidata
                      </a>
                    )}
                    {!r.wiki && !r.wikidata && "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">
        {heroName}&apos;s counted films. Gross = worldwide, all languages, as reported on Wikipedia (lower end of any range). Budget = upper end of any range.
        Hover a result for the sentence it was read from.
      </p>
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
