import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DirectorsTable, DirectorsTableView, type DirectorRow } from "@/components/directors/directors-table";
import { PageHeader } from "@/components/layout/page-header";
import { getDirectors, MIN_JUDGED } from "@/lib/directors";
import { directorsJsonLd, directorsMetadata, JsonLd } from "@/lib/seo";

export const metadata: Metadata = directorsMetadata;

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

export default async function DirectorsPage() {
  const [all, jsonLd] = await Promise.all([getDirectors(), directorsJsonLd()]);
  const ranked = all.filter((d) => d.ranked);
  const rest = all.filter((d) => !d.ranked);
  const top = ranked.slice(0, 3);
  const rankedRows: DirectorRow[] = ranked.map((d) => ({
    slug: d.slug,
    rank: d.rank,
    name: d.name,
    firstYear: d.firstYear,
    lastYear: d.lastYear,
    heroNames: d.heroes.slice(0, 3).map((h) => h.name),
    hitRate: d.hitRate,
    hits: d.hits,
    judged: d.judged,
    filmCount: d.films.length,
    blockbusters: d.blockbusters,
    totalGross: d.totalGross,
    grossFilms: d.grossFilms,
    biggest: d.biggest ? { title: d.biggest.title, year: d.biggest.year } : null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow="Directors"
        title="Telugu directors, by hit rate"
        subtitle={
          <>
            Every Telugu film since 2000 with one of our heroes as lead, grouped by director. Ranked by hit rate; when two
            directors tie, the one with more films with a known result goes first, then more hits, then the bigger total box
            office. A director needs at least {MIN_JUDGED} films with a known result to be ranked.
          </>
        }
      />

      {/* Podium */}
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {top.map((d) => (
          <li key={d.slug}>
            <Link prefetch={false} href={`/director/${d.slug}`} className="cinema block h-full rounded-2xl p-5 transition-shadow hover:shadow-lg">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c79c]">#{d.rank}</p>
              <p className="mt-1 font-serif text-[24px] font-bold leading-tight text-white">{d.name}</p>
              <p className="tabular mt-3 text-[34px] font-semibold leading-none text-white">{pct(d.hitRate)}</p>
              <p className="mt-1 text-[13px] text-[#e6d9cf]">
                {d.hits} hits in {d.judged} films · {d.firstYear}–{d.lastYear}
              </p>
            </Link>
          </li>
        ))}
      </ol>

      <Suspense fallback={<DirectorsTableView ranked={rankedRows} sort="rank" />}>
        <DirectorsTable ranked={rankedRows} />
      </Suspense>

      <p className="mt-2 text-[12px] text-ink-2">
        Films: with a known result / all films (too recent, direct to OTT or no reported result count only in the second number).
        Box office is the sum of reported worldwide grosses (lower figure where reports differ).
      </p>

      <details className="card mt-6 p-4">
        <summary className="cursor-pointer text-[14px] font-semibold text-ink">
          Not ranked yet: {rest.length} directors with fewer than {MIN_JUDGED} films with a known result
        </summary>
        <ul className="mt-3 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((d) => (
            <li key={d.slug}>
              <Link prefetch={false} href={`/director/${d.slug}`} className="text-ink hover:text-wine">
                {d.name}
              </Link>{" "}
              <span className="text-ink-2">
                · {d.films.length} {d.films.length === 1 ? "film" : "films"}
                {d.judged ? `, ${d.hits} of ${d.judged} hits` : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
