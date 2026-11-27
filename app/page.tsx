import Link from "next/link";
import { FocusProvider } from "@/components/charts/focus";
import { Ledger } from "@/components/charts/ledger";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { YearColumns, YearLegend } from "@/components/charts/year-columns";
import { Dashboard } from "@/components/dashboard/dashboard";
import { FilmToken, HeroToken } from "@/components/entity/tokens";
import { EvidenceBars, EvidenceMarks } from "@/components/home/evidence";
import { HeadToHead, type DuelHero } from "@/components/home/head-to-head";
import { SectionTitle } from "@/components/layout/page-header";
import { SearchField } from "@/components/search/search-field";
import { GROUPS, groupFact, groupValue } from "@/components/tolly/tolly-parts";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { compactCount } from "@/lib/data/real/hero-facts";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled } from "@/lib/features";
import { getFindings } from "@/lib/findings";
import { date, int } from "@/lib/format";
import { getLedger } from "@/lib/ledger";
import { HERO_METRICS } from "@/lib/ledger-metrics";
import { getHeroSummaries, heroLedgerRows, spineEnd } from "@/lib/ledger-rows";
import { releaseCounts, releasesAsOf } from "@/lib/releases";
import { getDashboardData } from "@/lib/repositories";
import { getTollyRanking, tollyMeta } from "@/lib/tolly/view";

export default async function HomePage() {
  // Demo / live data, or the index switched off: the career dashboard stays the home page.
  if (!tollyIndexEnabled() || DATA_MODE !== "real") return <Dashboard data={await getDashboardData()} />;

  const { ranked } = getTollyRanking();
  const [rows, findings, summaries, ledger] = await Promise.all([heroLedgerRows((h) => h.qualified), getFindings(), getHeroSummaries(), getLedger()]);
  const { end, partialFrom } = spineEnd();
  const thumbs = new Map(summaries.map((s) => [s.slug, s.img]));
  const duel: DuelHero[] = ranked.map((h) => ({
    slug: h.slug,
    name: h.name,
    thumb: thumbs.get(h.slug) ?? null,
    rank: h.rank as number,
    index: h.index as number,
    factors: GROUPS.map((g) => ({ key: g.key, label: g.label, value: groupValue(h, g.key).value, fact: groupFact(h, g.key, compactCount) })),
  }));
  const counts = releaseCounts();
  const now = counts[counts.length - 1];
  const recent = ledger.films.filter((f) => f.date && f.date <= releasesAsOf && f.language === "te").slice(-6).reverse();
  const top = ranked[0];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      {/* The question, answered with the evidence attached */}
      <section aria-labelledby="home-title" className="grid gap-8 pb-10 pt-10 sm:pt-16 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <h1 id="home-title" className="font-serif text-[40px] font-bold leading-[1.02] tracking-[-0.025em] text-ink sm:text-[64px]">
            Who is Tollywood&rsquo;s biggest&nbsp;hero?
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            {ranked.length} heroes, {int(tollyMeta.films.complete)} scored films, one score out of 100. Every tick below is a film, placed on the day it released:
            taller for a bigger box office, coloured by how it did.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <SearchField />
            <Link href="/methodology" className="link text-[14px] font-medium">
              How the score works
            </Link>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-6 border-t border-rule pt-5 lg:min-w-[340px] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <dt className="label">No. 1</dt>
            <dd className="mt-1.5">
              <HeroToken slug={top.slug} name={top.name} face={false} className="text-[15px]" />
              <span className="num mt-0.5 block text-[28px] font-semibold leading-none text-ink">{top.index?.toFixed(1)}</span>
            </dd>
          </div>
          <div>
            <dt className="label">Films</dt>
            <dd className="num mt-1.5 text-[28px] font-semibold leading-none text-ink">{int(ledger.films.length)}</dd>
            <dd className="mt-1 text-[12px] text-muted">since 2000</dd>
          </div>
          <div>
            <dt className="label">Updated</dt>
            <dd className="mt-1.5 text-[15px] font-medium text-ink">{date(tollyMeta.asOf)}</dd>
            <dd className="mt-1 text-[12px] text-muted">every week</dd>
          </div>
        </dl>
      </section>

      <FocusProvider>
        <ChartFrame
          id="index"
          title="The Tolly Index"
          finding="Rank by any of the numbers behind the score; each row is one hero's career, film by film."
          legend={<OutcomeLegend />}
          source={<Source>Data as of {date(tollyMeta.asOf)}</Source>}
        >
          <Ledger rows={rows} metrics={HERO_METRICS} label="Hero" end={end} partialFrom={partialFrom} limit={10} moreHref="/tolly-index" moreLabel="Open the full index" />
        </ChartFrame>
      </FocusProvider>

      {/* Findings: computed from the data, each with its evidence */}
      <section aria-labelledby="findings" className="mt-24">
        <SectionTitle id="findings" title="What the films say" finding="Four things the ledger shows, recomputed every week." />
        <ol className="divide-y divide-rule border-y border-rule">
          {findings.map((f, i) => (
            <li key={f.id} className="grid gap-x-8 gap-y-3 py-6 sm:grid-cols-[48px_190px_1fr_auto] sm:items-center">
              <span className="tabular text-[13px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="num text-[30px] font-semibold leading-none text-ink">{f.big}</span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-ink">
                  <Link href={f.href} className="hover:text-accent">
                    {f.title}
                  </Link>
                </h3>
                <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{f.body}</p>
              </div>
              <div className="overflow-hidden sm:justify-self-end">{f.films ? <EvidenceMarks films={f.films} /> : f.bars ? <EvidenceBars bars={f.bars} /> : null}</div>
            </li>
          ))}
        </ol>
      </section>

      {duel.length >= 2 && (
        <section aria-labelledby="duel" className="mt-24 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <SectionTitle id="duel" title="Head to head" finding="Pick any two ranked heroes and see who leads on each part of the score." />
            <p className="max-w-sm text-[14px] leading-relaxed text-muted">The bars share one scale, 0 to 100. For every number side by side, open the full comparison.</p>
          </div>
          <div className="frame p-4 sm:p-6">
            <HeadToHead heroes={duel} />
          </div>
        </section>
      )}

      <section aria-labelledby="year" className="mt-24 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SectionTitle
            id="year"
            title={`${now.year} so far: ${now.total} releases`}
            finding={`Telugu films in theatres, straight to OTT, and films dubbed into Telugu, up to ${date(releasesAsOf)}.`}
            aside={
              <Link href="/releases" className="link text-[14px] font-medium">
                All years
              </Link>
            }
          />
          <YearColumns data={counts} height={190} compact hrefFor="/releases?year={y}#list" selected={now.year} />
          <div className="mt-3 text-[12px] text-muted">
            <YearLegend />
          </div>
        </div>
        <div>
          <p className="label mb-3">Latest Telugu releases with a tracked hero</p>
          <ul className="divide-y divide-rule border-y border-rule">
            {recent.map((f) => (
              <li key={f.slug} className="flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0">
                  <FilmToken slug={f.slug} title={f.title} o={f.outcome} showYear={false} className="text-[15px]" />
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                    {f.heroes.map((h) => h.name).join(", ")}
                    {f.director ? ` · ${f.director.name}` : ""}
                  </span>
                </span>
                <span className="tabular shrink-0 text-[12.5px] text-muted">{f.date ? date(f.date, { year: false }) : f.year}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
