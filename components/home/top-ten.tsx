"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import Link from "next/link";
import { useState } from "react";
import { ColourBySwitch } from "@/components/ui/colour-by";
import { ERA_GROUPS, FAMILY_GROUPS, groupOf, type ColourBy } from "@/lib/constants/groups";

export interface TopRow {
  slug: string;
  name: string;
  thumb: string | null;
  family: string | null;
  debutYear: number | null;
  rank: number;
  index: number;
  best: string | null;
}

const MEDAL = ["#d8a86b", "#c9c2bb", "#c08a5e"];

/** The home page's top 10: every hero's bar and photo ring take his debut-era or film-family colour. */
export function TopTen({ rows }: { rows: TopRow[] }) {
  const [by, setBy] = useState<ColourBy>("era");
  const max = Math.max(...rows.map((r) => r.index));
  const list = by === "era" ? ERA_GROUPS : FAMILY_GROUPS;
  const present = new Set(rows.map((r) => groupOf(r, by).key));
  return (
    <div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ul aria-label="Colours" className="flex flex-wrap gap-1.5">
          {list
            .filter((g) => present.has(g.key))
            .map((g) => (
              <li key={g.key} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                {g.label}
              </li>
            ))}
        </ul>
        <ColourBySwitch id="top-colour-by" value={by} onChange={setBy} />
      </div>
      <ol className="mt-3 space-y-1">
        {rows.map((r, i) => {
          const c = groupOf(r, by).color;
          return (
            <li key={r.slug}>
              <Link href={`/hero/${r.slug}`} className="group grid grid-cols-[26px_44px_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-wine-soft/60 sm:grid-cols-[28px_48px_1fr_auto] sm:px-3">
                <span className="tabular grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold" style={i < 3 ? { background: MEDAL[i], color: "#2b1c1a" } : { color: "var(--muted)" }}>
                  {r.rank}
                </span>
                <span className="relative inline-grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-wine" style={{ boxShadow: `0 0 0 2.5px ${c}` }}>
                  {r.thumb ? <img src={r.thumb} alt="" width={44} height={44} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <span className="text-[13px] font-semibold text-white">{r.name[0]}</span>}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold text-ink group-hover:text-wine">{r.name}</span>
                    {r.best && <span className="hidden truncate text-[12px] text-muted sm:block">Best: {r.best}</span>}
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                    <span className="fill-x block h-full rounded-full" style={{ width: `${(r.index / max) * 100}%`, background: c }} />
                  </span>
                </span>
                <span className="tabular w-[46px] text-right font-serif text-[20px] font-bold" style={{ color: c }}>
                  {r.index.toFixed(1)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
