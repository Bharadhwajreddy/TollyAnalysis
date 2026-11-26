"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export interface DirectorRow {
  slug: string;
  rank: number | null;
  name: string;
  firstYear: number;
  lastYear: number;
  heroNames: string[];
  hitRate: number | null;
  hits: number;
  judged: number;
  filmCount: number;
  blockbusters: number;
  totalGross: number;
  grossFilms: number;
  biggest: { title: string; year: number } | null;
}

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const crore = (x: number) => (x >= 1000 ? `₹${(x / 1000).toFixed(2)}k cr` : `₹${Math.round(x).toLocaleString("en-IN")} cr`);

const SORTS = {
  rank: { label: "Hit rate", fn: null },
  hits: { label: "Most hits", fn: (a: DirectorRow, b: DirectorRow) => b.hits - a.hits || b.judged - a.judged },
  gross: { label: "Box office", fn: (a: DirectorRow, b: DirectorRow) => b.totalGross - a.totalGross },
  films: { label: "Most films", fn: (a: DirectorRow, b: DirectorRow) => b.filmCount - a.filmCount || b.hits - a.hits },
} as const;

type SortKey = keyof typeof SORTS;

function Initials({ name }: { name: string }) {
  const parts = name.replace(/[^A-Za-z &]/g, " ").split(/\s+/).filter((w) => w.length > 1 || /[A-Z]/.test(w));
  const ini = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2)).toUpperCase();
  return (
    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-wine/10 font-serif text-[15px] font-bold text-wine">
      {ini}
    </span>
  );
}

export function DirectorsTableView({ ranked, sort }: { ranked: DirectorRow[]; sort: SortKey }) {
  const list = useMemo(() => {
    const fn = SORTS[sort].fn;
    return fn ? [...ranked].sort((a, b) => fn(a, b) || (a.rank ?? 0) - (b.rank ?? 0)) : ranked;
  }, [ranked, sort]);

  return (
    <>
      <nav aria-label="Sort directors" className="mt-8 flex flex-wrap gap-1.5 text-[13px]">
        {Object.entries(SORTS).map(([k, v]) => (
          <Link
            prefetch={false}
            key={k}
            href={k === "rank" ? "/directors" : `/directors?sort=${k}`}
            scroll={false}
            aria-current={sort === k ? "true" : undefined}
            className={`rounded-full border px-3.5 py-1.5 font-medium ${sort === k ? "border-wine bg-wine text-white" : "border-line bg-surface text-ink hover:border-ink-2"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <div className="card mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Directors ranking table">
        <table className="w-full min-w-[760px] text-[13.5px]" data-testid="director-table">
          <thead>
            <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-ink-2">
              <th scope="col" className="px-3 py-2.5 font-semibold">#</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Director</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Hit rate</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Hits</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Films</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Blockbusters</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Box office</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Biggest film</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.slug} className="border-b border-line/60 last:border-0 hover:bg-wine/[0.03]">
                <td className="tabular px-3 py-2.5 text-ink-2">{d.rank}</td>
                <td className="px-3 py-2.5">
                  <Link prefetch={false} href={`/director/${d.slug}`} className="flex items-center gap-2.5 font-semibold text-ink hover:text-wine">
                    <Initials name={d.name} />
                    <span>
                      {d.name}
                      <span className="block text-[11.5px] font-normal text-ink-2">
                        {d.firstYear}–{d.lastYear}
                        {d.heroNames.length > 0 ? ` · ${d.heroNames.join(", ")}` : ""}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="tabular w-10 font-semibold text-ink">{pct(d.hitRate)}</span>
                    <span className="h-2 w-24 overflow-hidden rounded-full bg-line/70">
                      <span className="block h-full rounded-full bg-[#2f8f4e]" style={{ width: `${(d.hitRate ?? 0) * 100}%` }} />
                    </span>
                  </span>
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">{d.hits}</td>
                <td className="tabular px-3 py-2.5 text-right text-ink">
                  {d.judged}
                  {d.filmCount > d.judged && <span className="text-ink-2"> / {d.filmCount}</span>}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-ink">{d.blockbusters || "—"}</td>
                <td className="tabular px-3 py-2.5 text-right text-ink">{d.grossFilms ? crore(d.totalGross) : "—"}</td>
                <td className="px-3 py-2.5 text-ink-2">{d.biggest ? `${d.biggest.title} (${d.biggest.year})` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function DirectorsTable({ ranked }: { ranked: DirectorRow[] }) {
  const searchParams = useSearchParams();
  const rawSort = searchParams.get("sort");
  const sort = (rawSort && rawSort in SORTS ? rawSort : "rank") as SortKey;
  return <DirectorsTableView ranked={ranked} sort={sort} />;
}
