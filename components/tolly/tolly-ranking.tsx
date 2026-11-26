"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import Link from "next/link";
import { useState } from "react";
import { ERA_GROUPS, FAMILY_GROUPS, groupOf, type ColourBy } from "@/lib/constants/groups";
import { ColourBySwitch } from "@/components/ui/colour-by";
import { BandBar, GROUPS, ProvisionalMark, PROVISIONAL_TIP } from "./tolly-parts";

export interface RankingRow {
  slug: string;
  name: string;
  thumb: string | null;
  family: string | null;
  debutYear: number | null;
  rank: number;
  index: number;
  band: number | null;
  /** Group values in GROUPS order (null = not counted). */
  groups: (number | null)[];
  best: string | null;
  followers: string | null;
  /** A hero from another industry: his box-office record is less complete, so the score is provisional. */
  provisional?: boolean;
}

/** The Tolly Index table and top three, with each hero coloured by debut era or film family. */
export function TollyRanking({ rows }: { rows: RankingRow[] }) {
  const [by, setBy] = useState<ColourBy>("era");
  const list = by === "era" ? ERA_GROUPS : FAMILY_GROUPS;
  const present = new Set(rows.map((r) => groupOf(r, by).key));
  const colour = (r: RankingRow) => groupOf(r, by).color;
  const Face = ({ r, size }: { r: RankingRow; size: number }) => (
    <span className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-wine" style={{ width: size, height: size, boxShadow: `0 0 0 ${size > 40 ? 3 : 2}px ${colour(r)}` }}>
      {r.thumb ? <img src={r.thumb} alt="" width={size} height={size} className="h-full w-full object-cover" /> : <span className="text-[11px] font-semibold text-white">{r.name[0]}</span>}
    </span>
  );
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <ul aria-label="Colours" className="flex flex-wrap gap-1.5">
          {list
            .filter((g) => present.has(g.key))
            .map((g) => (
              <li key={g.key} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                {g.label}
              </li>
            ))}
        </ul>
        <ColourBySwitch id="tolly-colour-by" value={by} onChange={setBy} />
      </div>

      <ol aria-label="Top three heroes" className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.slice(0, 3).map((r) => (
          <li key={r.slug}>
            <Link prefetch={false} href={`/hero/${r.slug}#tolly`} className="card flex items-center gap-4 border-l-4 p-4 transition-colors hover:border-wine/40" style={{ borderLeftColor: colour(r) }}>
              <span className="relative shrink-0">
                <Face r={r} size={72} />
                <span className="tabular absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-white ring-2 ring-surface">{r.rank}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[19px] font-bold tracking-tight text-ink">
                  {r.name}
                  {r.provisional && <ProvisionalMark />}
                </span>
                <span className="tabular flex items-center gap-2 text-[26px] font-semibold leading-tight text-ink">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colour(r) }} />
                  <span>
                    {r.index.toFixed(1)}
                    {r.band !== null && <span className="ml-1.5 text-[13px] font-normal text-muted">± {r.band.toFixed(1)}</span>}
                  </span>
                </span>
                {r.best && <span className="block truncate text-[12.5px] text-ink-2">Best: {r.best}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <section aria-labelledby="ranking" className="card mt-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="ranking" className="font-serif text-[24px] font-semibold text-ink">
            Hero ranking
          </h2>
          <p className="text-[12px] text-muted">
            ± shows how sure we are. Every column is out of 100.
            {rows.some((r) => r.provisional) && <> Provisional: {PROVISIONAL_TIP.replace(/^Provisional: /, "")}</>}
          </p>
        </div>
        <div className="scroll-x mt-3 rounded-lg border border-line" tabIndex={0} role="region" aria-label="Hero ranking table">
          <table className="w-full min-w-[960px] text-[13.5px]">
            <thead className="bg-surface-2 text-[10.5px] uppercase tracking-wide text-ink-2">
              <tr>
                <th scope="col" className="px-2.5 py-2 text-left">#</th>
                <th scope="col" className="px-2.5 py-2 text-left">Hero</th>
                <th scope="col" className="px-2.5 py-2 text-left">Tolly Index</th>
                <th scope="col" className="w-[190px] px-2.5 py-2 text-left">Range</th>
                {GROUPS.map((g) => (
                  <th key={g.key} scope="col" className="px-2.5 py-2 text-right">
                    {g.label}
                  </th>
                ))}
                <th scope="col" className="px-2.5 py-2 text-left">Best film</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug} className="border-t border-line">
                  <td className="tabular px-2.5 py-2 text-muted">{r.rank}</td>
                  <td className="px-2.5 py-1.5 font-medium">
                    <Link prefetch={false} href={`/hero/${r.slug}#tolly`} className="flex items-center gap-2.5 text-ink hover:text-wine">
                      <Face r={r} size={30} />
                      {r.name}
                      {r.provisional && <ProvisionalMark />}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="tabular inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colour(r) }} />
                      <span className="font-semibold text-ink">{r.index.toFixed(1)}</span>
                      {r.band !== null && <span className="text-[12px] text-muted">± {r.band.toFixed(1)}</span>}
                    </span>
                  </td>
                  <td className="px-2.5 py-2">
                    <BandBar index={r.index} band={r.band} color={colour(r)} />
                  </td>
                  {r.groups.map((v, i) => (
                    <td key={GROUPS[i].key} className="tabular px-2.5 py-2 text-right" title={GROUPS[i].key === "fame" && r.followers ? `${r.followers} followers` : undefined}>
                      {v === null ? "—" : v.toFixed(1)}
                    </td>
                  ))}
                  <td className="px-2.5 py-2 text-ink-2">{r.best ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
