import type { Metadata } from "next";
import { FocusChip, FocusProvider } from "@/components/charts/focus";
import { Ledger } from "@/components/charts/ledger";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { PairingsLegend, PairingsMatrix } from "@/components/charts/pairings-matrix";
import { DirectorToken, HeroToken } from "@/components/entity/tokens";
import { PageHeader } from "@/components/layout/page-header";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { getDirectors, MIN_JUDGED } from "@/lib/directors";
import { date, int, plural } from "@/lib/format";
import { DIRECTOR_METRICS } from "@/lib/ledger-metrics";
import { directorLedgerRows, spineEnd } from "@/lib/ledger-rows";
import { getPairings } from "@/lib/pairings";
import { releasesAsOf } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Directors",
  description: "Telugu film directors since 2000, ranked by hit rate, with every film on one timeline and who they made films with.",
};

export default async function DirectorsPage() {
  const [all, rows, pairs] = await Promise.all([getDirectors(), directorLedgerRows(), getPairings(14)]);
  const { end, partialFrom } = spineEnd();
  const order = new Map(all.map((d, i) => [d.slug, i]));
  const ledgerRows = rows.map((r) => ({ ...r, seq: order.get(r.key) ?? 9999 }));
  const inLedger = new Set(rows.map((r) => r.key));
  const rest = all.filter((d) => !inLedger.has(d.slug)).sort((a, b) => b.films.length - a.films.length || a.name.localeCompare(b.name));
  const ranked = all.filter((d) => d.ranked);
  const top = ranked[0];
  const films = all.reduce((s, d) => s + d.films.length, 0);

  // The matrix's headline: the most frequent pairing, and the best perfect record among the rest.
  const byN = [...pairs.cells].sort((a, b) => b.n - a.n || b.hits - a.hits);
  const most = byN[0];
  const perfect = byN.find((c) => c !== most && c.n >= 3 && c.hits === c.n);
  const name = (c: (typeof byN)[number]) => ({ d: pairs.directors[c.d], h: pairs.heroes[c.h] });

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 lg:px-8">
      <PageHeader
        title="Directors"
        subtitle={
          <>
            {int(all.length)} directors made {int(films)} Telugu films with a hero we track since 2000. Here are the {rows.length} with three or more,
            each film on one timeline, ranked by how often they deliver a hit.
          </>
        }
        aside={
          top && (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1 border-t border-rule pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <div>
                <dt className="label">No. 1</dt>
                <dd className="mt-1.5">
                  <DirectorToken slug={top.slug} name={top.name} className="text-[15px]" />
                  <span className="num mt-1 block text-[28px] font-semibold leading-none text-ink">
                    {top.hits} of {top.judged}
                  </span>
                  <span className="mt-1 block text-[12px] text-muted">hits</span>
                </dd>
              </div>
              <div>
                <dt className="label">Ranked</dt>
                <dd className="num mt-1.5 text-[28px] font-semibold leading-none text-ink">{ranked.length}</dd>
                <dd className="mt-1 text-[12px] text-muted">from {MIN_JUDGED} judged films</dd>
              </div>
            </dl>
          )
        }
      />

      <FocusProvider>
        <ChartFrame
          id="ledger"
          className="mt-10"
          title="The ledger of directors"
          finding={
            <>
              Ranked by hit rate; a tie goes to more films with a known result, then more hits, then the bigger reported gross. A director is ranked
              once {MIN_JUDGED} of their films have a known result.
            </>
          }
          aside={<FocusChip />}
          legend={<OutcomeLegend />}
          source={<Source>Telugu films with a tracked hero as lead · data as of {date(releasesAsOf)}</Source>}
        >
          <Ledger rows={ledgerRows} metrics={DIRECTOR_METRICS} label="Director" end={end} partialFrom={partialFrom} limit={15} />
        </ChartFrame>

          <ChartFrame
            id="pairings"
            className="mt-24"
            title="Who works with whom"
            finding={
              most && (
                <>
                  <DirectorToken slug={name(most).d.slug} name={name(most).d.name} /> made {plural(most.n, "film")} with{" "}
                  <HeroToken slug={name(most).h.slug} name={name(most).h.name} face={false} />, {most.hits} of them hits.
                  {perfect && (
                    <>
                      {" "}
                      <DirectorToken slug={name(perfect).d.slug} name={name(perfect).d.name} /> is {perfect.hits} for {perfect.n} with{" "}
                      <HeroToken slug={name(perfect).h.slug} name={name(perfect).h.name} face={false} />.
                    </>
                  )}{" "}
                  Point at a circle to light those films in the ledger above.
                </>
              )
            }
            aside={<FocusChip />}
            legend={<PairingsLegend max={pairs.max} />}
            source={<Source>The {pairs.directors.length} directors and {pairs.heroes.length} heroes with the most repeat films together</Source>}
          >
            <PairingsMatrix data={pairs} />
          </ChartFrame>
      </FocusProvider>

      {rest.length > 0 && (
        <details className="group mt-16 border-t border-rule pt-5">
          <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink marker:hidden hover:text-accent">
            <span aria-hidden className="mr-2 inline-block text-muted transition-transform duration-[var(--dur-2)] group-open:rotate-90">
              ›
            </span>
            Every other director: {rest.length} with one or two films
          </summary>
          <ul className="mt-4 columns-1 gap-x-8 text-[13.5px] sm:columns-2 lg:columns-4">
            {rest.map((d) => (
              <li key={d.slug} className="break-inside-avoid py-1">
                <DirectorToken slug={d.slug} name={d.name} />{" "}
                <span className="tabular text-muted">
                  · {plural(d.films.length, "film")}
                  {d.judged ? `, ${d.hits} of ${d.judged} hits` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
