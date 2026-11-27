import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilmStrip } from "@/components/charts/film-strip";
import { FocusChip, FocusProvider } from "@/components/charts/focus";
import { FocusRow, FocusToggle } from "@/components/charts/focus-row";
import { SpineAxis } from "@/components/charts/spine-axis";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { DirectorMono, FilmToken, HeroToken, MiniMark } from "@/components/entity/tokens";
import { SectionTitle } from "@/components/layout/page-header";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { getDirector, getDirectors, MIN_JUDGED } from "@/lib/directors";
import { date, inr, int, pct, plural } from "@/lib/format";
import { getLedger, isHit, isJudged, longestStreak, toDot } from "@/lib/ledger";
import { spineEnd } from "@/lib/ledger-rows";
import { OUTCOME_LABEL, VERDICT_LABEL } from "@/lib/ledger-types";
import { releasesAsOf } from "@/lib/releases";

export async function generateMetadata(props: PageProps<"/director/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const d = await getDirector(slug);
  if (!d) return { title: "Director not found" };
  return {
    title: d.judged ? `${d.name} — ${d.hits} of ${d.judged} hits` : `${d.name}, director`,
    description: `${d.name}: ${plural(d.films.length, "Telugu film")} with a tracked hero, ${d.firstYear}–${d.lastYear}, every one on a timeline with its result and reported gross.`,
  };
}

function Fact({ k, children, note }: { k: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label">{k}</dt>
      <dd className="num mt-1.5 text-[22px] font-semibold leading-none text-ink">{children}</dd>
      {note && <dd className="mt-1.5 text-[12.5px] leading-snug text-muted">{note}</dd>}
    </div>
  );
}

export default async function DirectorPage(props: PageProps<"/director/[slug]">) {
  const { slug } = await props.params;
  const [d, all, ledger] = await Promise.all([getDirector(slug), getDirectors(), getLedger()]);
  if (!d) notFound();
  const rankedCount = all.filter((x) => x.ranked).length;
  const { end, partialFrom } = spineEnd();

  // The same films the ledger of directors draws for him: Telugu, since 2000.
  const films = (ledger.byDirector.get(d.slug) ?? []).filter((f) => f.language === "te" && f.year >= 2000);
  const dots = films.map(toDot);
  const streak = longestStreak(films);
  const biggest = [...films].filter((f) => f.gross !== null).sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0))[0] ?? null;
  const gross = films.reduce((s, f) => s + (f.gross ?? 0), 0);
  const withGross = films.filter((f) => f.gross !== null).length;

  const heroes = new Map<string, { slug: string; name: string; films: typeof films }>();
  for (const f of films) for (const h of f.heroes) heroes.set(h.slug, { ...h, films: [...(heroes.get(h.slug)?.films ?? []), f] });
  const heroRows = [...heroes.values()]
    .map((h) => ({ ...h, judged: h.films.filter(isJudged).length, hits: h.films.filter(isHit).length }))
    .sort((a, b) => b.films.length - a.films.length || b.hits - a.hits || a.name.localeCompare(b.name));
  const newest = [...films].reverse();
  const labelN = Math.min(films.length, films.length <= 14 ? 9 : 8);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="pt-6 text-[13px]">
        <Link href="/directors" className="text-muted hover:text-accent">
          ← Directors
        </Link>
      </nav>

      <header className="pb-10 pt-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <span className="hidden sm:block">
            <DirectorMono name={d.name} size={76} />
          </span>
          <span className="sm:hidden">
            <DirectorMono name={d.name} size={52} />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-[34px] font-bold leading-[1.04] tracking-[-0.02em] text-ink sm:text-[56px]">{d.name}</h1>
            <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">
              Telugu director · <span className="tabular">{d.firstYear === d.lastYear ? d.firstYear : `${d.firstYear}–${d.lastYear}`}</span> · {plural(films.length, "film")} with{" "}
              {plural(heroRows.length, "tracked hero", "tracked heroes")}
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-x-10 gap-y-6 border-t border-rule pt-6 sm:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="label">Hit rate</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="num text-[48px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[56px]">{d.judged ? `${d.hits} of ${d.judged}` : "—"}</span>
              <span className="text-[17px] font-medium text-ink-2">{d.judged ? "hits" : ""}</span>
            </p>
            <p className="mt-2 text-[13px] text-muted">
              {d.ranked ? (
                <>
                  <span className="tabular">{pct(d.hitRate)}</span> · No. {d.rank} of {rankedCount} ranked directors
                </>
              ) : (
                <>
                  Not ranked yet: {d.judged} of the {MIN_JUDGED} films with a known result needed
                </>
              )}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:border-l sm:border-rule sm:pl-10 lg:grid-cols-[auto_auto_minmax(0,1fr)]">
            <Fact k="Reported gross" note={withGross ? `${plural(withGross, "film")} with a figure` : "none reported"}>
              {withGross ? inr(gross) : "—"}
            </Fact>
            <Fact k="Best run" note={streak.length > 1 && streak.from && streak.to ? `in a row, ${streak.from.year}–${streak.to.year}` : "hits in a row"}>
              {streak.length > 1 ? `${streak.length} hits` : streak.length ? "1 hit" : "—"}
            </Fact>
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <dt className="label">Biggest film</dt>
              <dd className="mt-2 text-[16px]">{biggest ? <FilmToken slug={biggest.slug} title={biggest.title} year={biggest.year} o={biggest.outcome} /> : "—"}</dd>
              {biggest && <dd className="tabular mt-1.5 text-[12.5px] text-muted">{inr(biggest.gross)} reported worldwide</dd>}
            </div>
          </dl>
        </div>
      </header>

      <FocusProvider>
        <ChartFrame
          id="reel"
          title="Every film, on the timeline"
          finding="Each mark is a film on its release date: taller for a bigger reported gross, coloured by how it did. Point at a mark for details; click to open the film."
          aside={<FocusChip />}
          legend={<OutcomeLegend />}
          source={<Source>Telugu films since 2000 with a tracked hero as lead · data as of {date(releasesAsOf)}</Source>}
        >
          <FilmStrip films={dots} start={2000} end={end} height={112} axis labels={labelN} partialFrom={partialFrom} ariaLabel={`${d.name}: ${plural(films.length, "film")} on a timeline from 2000`} />
        </ChartFrame>

        {heroRows.length > 0 && (
          <section aria-labelledby="heroes" className="mt-24">
            <SectionTitle
              id="heroes"
              title="Heroes worked with"
              finding={
                heroRows[0].films.length > 1 ? (
                  <>
                    Most often with <HeroToken slug={heroRows[0].slug} name={heroRows[0].name} face={false} />: {plural(heroRows[0].films.length, "film")},{" "}
                    {plural(heroRows[0].hits, "hit")}. Point at a hero to light his films in the timeline above.
                  </>
                ) : (
                  "One film each. Point at a hero to light his film in the timeline above."
                )
              }
            />
            <div className="border-t border-rule">
              {heroRows.map((h) => {
                const focus = { kind: "film" as const, key: `hero:${h.slug}`, label: `with ${h.name}`, set: h.films.map((f) => f.slug) };
                return (
                  <FocusRow
                    key={h.slug}
                    focus={focus}
                    className="group/hr grid cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-rule px-1 py-2 transition-colors duration-[var(--dur-1)] hover:bg-surface-2/60 data-[pinned]:bg-accent-wash/50 sm:grid-cols-[220px_130px_minmax(0,1fr)]"
                  >
                    <HeroToken slug={h.slug} name={h.name} size={28} className="min-w-0 text-[14.5px]" />
                    <FocusToggle focus={focus} className="tabular justify-self-end rounded-md px-1.5 py-1 text-right text-[12.5px] text-muted hover:text-ink aria-pressed:text-accent sm:justify-self-start sm:text-left">
                      {plural(h.films.length, "film")} · {plural(h.hits, "hit")}
                    </FocusToggle>
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <FilmStrip films={h.films.map(toDot)} start={2000} end={end} height={26} partialFrom={partialFrom} ariaLabel={`${d.name} with ${h.name}: ${plural(h.films.length, "film")}`} />
                    </div>
                  </FocusRow>
                );
              })}
              <div className="hidden grid-cols-[220px_130px_minmax(0,1fr)] gap-x-4 px-1 pt-1 sm:grid" aria-hidden>
                <span />
                <span />
                <SpineAxis start={2000} end={end} />
              </div>
            </div>
          </section>
        )}
      </FocusProvider>

      <section aria-labelledby="films" className="mt-24">
        <SectionTitle id="films" title="Films" finding={`Newest first. ${d.judged < films.length ? "Films too recent to judge, direct to OTT or with no reported result do not count towards the hit rate." : ""}`} />
        <div className="frame scroll-x">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead>
              <tr className="border-b border-rule bg-surface-2 text-left">
                <th scope="col" className="label sticky left-0 z-[1] bg-surface-2 px-4 py-2.5">
                  Film
                </th>
                <th scope="col" className="label px-3 py-2.5">
                  Released
                </th>
                <th scope="col" className="label px-3 py-2.5">
                  Heroes
                </th>
                <th scope="col" className="label px-3 py-2.5">
                  Result
                </th>
                <th scope="col" className="label px-4 py-2.5 text-right">
                  Reported gross
                </th>
              </tr>
            </thead>
            <tbody>
              {newest.map((f) => (
                <tr key={f.slug} className="border-b border-rule last:border-0 hover:bg-surface-2/60">
                  <th scope="row" className="sticky left-0 z-[1] bg-surface px-4 py-2.5 text-left font-normal">
                    <FilmToken slug={f.slug} title={f.title} showYear={false} />
                  </th>
                  <td className="tabular whitespace-nowrap px-3 py-2.5 text-ink-2">{f.date ? date(f.date) : f.year}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      {f.heroes.map((h) => (
                        <HeroToken key={h.slug} slug={h.slug} name={h.name} />
                      ))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className={`inline-flex items-center gap-2 ${isJudged(f) ? "text-ink" : "text-muted"}`}>
                      <MiniMark o={f.outcome} />
                      {f.verdict ? (VERDICT_LABEL[f.verdict] ?? OUTCOME_LABEL[f.outcome]) : OUTCOME_LABEL[f.outcome]}
                    </span>
                  </td>
                  <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink-2">{f.gross !== null ? inr(f.gross) : <span className="text-faint">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-muted">
          Telugu films (bilinguals included) since 2000 with one of the {int(ledger.byHero.size)} heroes we track as lead; dubbed films are left out. A hit is a hit, super hit or
          blockbuster. Grosses are worldwide, as reported; where reports differ we take the lower figure.
        </p>
      </section>
    </div>
  );
}
