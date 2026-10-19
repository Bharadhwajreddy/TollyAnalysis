import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BandBar, IndexValue, PILLARS } from "@/components/tolly/tolly-parts";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled } from "@/lib/features";
import { getTollyRanking, getTopTollyFilms, tollyMeta } from "@/lib/tolly/view";

export const metadata: Metadata = {
  title: "Tolly Index",
  description: "Every Telugu hero scored from 0 to 100 on what audiences think of his films, not box office.",
};

const RULES = [
  ["No money", "Box office depends on ticket prices and inflation, so no rupee figure enters the index."],
  ["Same era only", "Votes and readers grow with the internet, so a film is only compared with films released within a year of it."],
  ["No data, no score", "A film with any input missing is not scored, and its hero's page says exactly what is missing."],
] as const;

const STEPS = [
  ["Collect", "IMDb ratings and votes, Wikidata facts, Wikipedia readers (English + Telugu)"],
  ["Match", "One record per film, checked to be the same film in every source"],
  ["Check", "Every input present, or the film waits and the gap is named"],
  ["Score each film", "Three questions, each judged against films of its time"],
  ["Score each hero", "Average of his films, weighted by how many people rated each"],
] as const;

export default function TollyIndexPage() {
  if (!tollyIndexEnabled() || DATA_MODE !== "real") notFound();
  const { ranked, unranked } = getTollyRanking();
  const top = getTopTollyFilms(10);
  const m = tollyMeta;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader
        eyebrow="Our index"
        title="Tolly Index"
        subtitle={
          <>
            Every Telugu hero scored from 0 to 100 on what audiences think of his films: did people like them, how many cared, and do people still care. Built only
            from public data, never from box office.
          </>
        }
      >
        <p className="tabular mt-3 text-xs text-muted">
          Data as of {m.asOf} · {m.films.complete.toLocaleString("en-IN")} of {m.films.total.toLocaleString("en-IN")} films complete · {m.heroes.qualified} of{" "}
          {m.heroes.total} heroes ranked · method {m.version}
        </p>
      </PageHeader>

      <section aria-labelledby="how" className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-4 sm:p-5">
          <h2 id="how" className="eyebrow">
            Three rules keep it fair
          </h2>
          <ol className="mt-2 space-y-2.5 text-[13.5px]">
            {RULES.map(([t, d], i) => (
              <li key={t}>
                <span className="font-semibold text-ink">
                  {i + 1}. {t}.
                </span>{" "}
                <span className="text-ink-2">{d}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-4 sm:p-5">
          <h2 className="eyebrow">Three questions make a film&apos;s score</h2>
          <ul className="mt-2 space-y-2.5 text-[13.5px]">
            {PILLARS.map((p) => (
              <li key={p.key} className="flex gap-3">
                <span className="tabular w-11 shrink-0 font-semibold" style={{ color: p.color }}>
                  {p.weight}
                </span>
                <span>
                  <span className="font-semibold text-ink">{p.question.replace("his films", "it")}</span>{" "}
                  <span className="text-ink-2">
                    {p.key === "rating"
                      ? "IMDb audience rating; with few voters it is pulled toward the average of its time."
                      : p.key === "reach"
                        ? "Number of voters, and how many Wikipedia languages cover it."
                        : "How many people read about it on Wikipedia today."}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-muted">A fourth question, what people say on social media, joins once the API keys are in place.</p>
        </div>
        <div className="card p-4 sm:p-5">
          <h2 className="eyebrow">Five steps, rerun automatically</h2>
          <ol className="mt-2 space-y-2 text-[13.5px]">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-2.5">
                <span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line text-[11px] font-semibold text-wine">{i + 1}</span>
                <span>
                  <span className="font-semibold text-ink">{t}:</span> <span className="text-ink-2">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="ranking" className="card mt-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="section-kicker">Ranked heroes</p>
            <h2 id="ranking" className="mt-1 font-serif text-[24px] font-semibold text-ink">
              Hero ranking ({ranked.length})
            </h2>
          </div>
          <p className="text-[12px] text-muted">The shaded range is the ± band: overlapping bands mean the heroes are about level.</p>
        </div>
        <div className="scroll-x mt-3 rounded-lg border border-line">
          <table className="w-full min-w-[980px] text-[13px]">
            <thead className="bg-surface-2 text-[10.5px] uppercase tracking-wide text-ink-2">
              <tr>
                <th scope="col" className="px-2.5 py-2 text-left">#</th>
                <th scope="col" className="px-2.5 py-2 text-left">Hero</th>
                <th scope="col" className="px-2.5 py-2 text-left">Tolly Index</th>
                <th scope="col" className="w-[220px] px-2.5 py-2 text-left">Range (40–80)</th>
                <th scope="col" className="px-2.5 py-2 text-right">Rating</th>
                <th scope="col" className="px-2.5 py-2 text-right">Reach</th>
                <th scope="col" className="px-2.5 py-2 text-right">Staying power</th>
                <th scope="col" className="px-2.5 py-2 text-right">Films complete</th>
                <th scope="col" className="px-2.5 py-2 text-left">Best film</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((h) => (
                <tr key={h.slug} className="border-t border-line">
                  <td className="tabular px-2.5 py-2 text-muted">{h.rank}</td>
                  <td className="px-2.5 py-2 font-medium">
                    <Link href={`/hero/${h.slug}#tolly`} className="text-ink hover:text-wine hover:underline">
                      {h.name}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2">
                    <IndexValue hero={h} size="sm" />
                  </td>
                  <td className="px-2.5 py-2">
                    <BandBar index={h.index as number} band={h.band} />
                  </td>
                  <td className="tabular px-2.5 py-2 text-right">{h.pillars?.rating.toFixed(1)}</td>
                  <td className="tabular px-2.5 py-2 text-right">{h.pillars?.reach.toFixed(1)}</td>
                  <td className="tabular px-2.5 py-2 text-right">{h.pillars?.stay.toFixed(1)}</td>
                  <td className="tabular px-2.5 py-2 text-right text-ink-2">
                    {h.complete} of {h.judged}
                  </td>
                  <td className="px-2.5 py-2 text-ink-2">{h.best[0] ? `${h.best[0].title} (${h.best[0].year}) ${h.best[0].index.toFixed(1)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="films" className="card p-4 sm:p-6">
          <p className="section-kicker">Complete films</p>
          <h2 id="films" className="mt-1 font-serif text-[22px] font-semibold text-ink">
            Top 10 films
          </h2>
          <ol className="mt-3 divide-y divide-line text-[13px]">
            {top.map((f, i) => (
              <li key={f.key} className="grid grid-cols-[28px_1fr_auto] items-baseline gap-2 py-1.5">
                <span className="tabular text-muted">{i + 1}</span>
                <span className="font-medium text-ink">
                  {f.title} <span className="font-normal text-muted">({f.year})</span>
                </span>
                <span className="tabular font-semibold text-wine">{f.index?.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="unranked" className="card p-4 sm:p-6">
          <p className="section-kicker">Waiting for data</p>
          <h2 id="unranked" className="mt-1 font-serif text-[22px] font-semibold text-ink">
            Not ranked yet ({unranked.length})
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Their films are missing an audience rating in every free source we can reach. We show the gap instead of guessing.</p>
          <ul className="mt-3 divide-y divide-line text-[13px]">
            {unranked.map((h) => (
              <li key={h.slug} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                <Link href={`/hero/${h.slug}#tolly`} className="font-medium text-ink hover:text-wine hover:underline">
                  {h.name}
                </Link>
                <span className="text-muted">{h.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
