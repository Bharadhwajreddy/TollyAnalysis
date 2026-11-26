"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { FAMILY_GROUPS, groupOf } from "@/lib/constants/groups";
import { formatMetric } from "@/lib/constants/metrics";
import type { HeroView } from "@/lib/view-models";

const SORTS = {
  star: { label: "Star Score", fn: (a: HeroView, b: HeroView) => (b.m.starScore.v ?? -1) - (a.m.starScore.v ?? -1) },
  name: { label: "Name", fn: (a: HeroView, b: HeroView) => a.name.localeCompare(b.name) },
  films: { label: "Most films", fn: (a: HeroView, b: HeroView) => b.eligible - a.eligible },
  debut: { label: "Debut year", fn: (a: HeroView, b: HeroView) => (a.debutYear ?? 9999) - (b.debutYear ?? 9999) },
} as const;

type SortKey = keyof typeof SORTS;

export function HeroesGridView({ heroes, sort }: { heroes: HeroView[]; sort: SortKey }) {
  const sorted = useMemo(
    () => [...heroes].sort((a, b) => SORTS[sort].fn(a, b) || a.name.localeCompare(b.name)),
    [heroes, sort],
  );

  return (
    <>
      <nav aria-label="Sort heroes" className="mt-4 flex flex-wrap gap-1.5 text-[13px]">
        {Object.entries(SORTS).map(([k, v]) => (
          <Link
            key={k}
            href={k === "star" ? "/heroes" : `/heroes?sort=${k}`}
            scroll={false}
            aria-current={sort === k ? "true" : undefined}
            className={`rounded-full border px-3.5 py-1.5 font-medium ${sort === k ? "border-wine bg-wine text-white" : "border-line bg-surface text-ink hover:border-ink-2"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((h) => {
          const fam = FAMILY_GROUPS.find((g) => g.key === h.family);
          return (
            <li key={h.slug}>
              <Link href={`/hero/${h.slug}`} className="card flex h-full items-center gap-3 p-3 transition-shadow hover:shadow-md">
                <HeroAvatar name={h.name} photo={h.photo} industry={h.industry} color={groupOf(h, "era").color} size={64} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-ink">{h.name}</span>
                    {h.isEmerging && <span className="rounded bg-teal-soft px-1 text-[10px] font-semibold text-[#00596a]">NEW</span>}
                  </span>
                  <span className="tabular mt-0.5 block text-[12px] text-ink-2">
                    {h.eligible} films · {formatMetric("hits", h.m.hits.v)} hits · {formatMetric("overallSuccessRatio", h.m.overallSuccessRatio.v)} success
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-2">
                    {h.debutYear && <span>Debut {h.debutYear}</span>}
                    {fam && fam.key !== "other" && (
                      <span className="inline-flex items-center gap-1">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: fam.color }} />
                        {fam.label}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tabular block text-[20px] font-semibold leading-none text-wine">{formatMetric("starScore", h.m.starScore.v, false)}</span>
                  <span className="block text-[10.5px] text-ink-2">Star Score</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function HeroesGrid({ heroes }: { heroes: HeroView[] }) {
  const searchParams = useSearchParams();
  const rawSort = searchParams.get("sort");
  const sort = (rawSort && rawSort in SORTS ? rawSort : "star") as SortKey;
  return <HeroesGridView heroes={heroes} sort={sort} />;
}
