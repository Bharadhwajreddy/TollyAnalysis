import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { FilmStrip } from "@/components/charts/film-strip";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { ScoreByYear, type YearScore } from "@/components/charts/score-by-year";
import { WeekLegend, WeekStrip, type Week } from "@/components/charts/week-strip";
import { YearColumns, YearLegend } from "@/components/charts/year-columns";
import { DirectorToken, FilmToken, HeroToken } from "@/components/entity/tokens";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { SegmentedLinks } from "@/components/releases/segmented-links";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { directorSlug, getDirectors } from "@/lib/directors";
import { date, int, plural } from "@/lib/format";
import { getLedger, isHit, isJudged, toDot, type FilmAtom } from "@/lib/ledger";
import { getHeroSummaries } from "@/lib/ledger-rows";
import { yearPos } from "@/lib/timeline";
import { KIND_LABEL, releaseCounts, releasesAsOf, releasesOf, type Release, type ReleaseKind } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Years",
  description: "Every Telugu film released since 2000, year by year: in theatres, straight to OTT and dubbed into Telugu, week by week, with every tracked hero's film.",
};

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const KIND_SHORT: Record<ReleaseKind, string> = { theatrical: "Theatres", ott: "Direct to OTT", dubbed: "Dubbed" };
const KIND_VAR: Record<ReleaseKind, string> = { theatrical: "var(--k-theatrical)", ott: "var(--k-ott)", dubbed: "var(--k-dubbed)" };

/** "5–11 Feb", or "29 Jan – 4 Feb" across a month end. */
function weekRange(start: string) {
  const end = new Date(Date.parse(`${start}T00:00:00Z`) + 6 * 864e5).toISOString().slice(0, 10);
  return start.slice(5, 7) === end.slice(5, 7) ? `${Number(start.slice(8, 10))}–${date(end, { year: false })}` : `${date(start, { year: false })} – ${date(end, { year: false })}`;
}

/** Title key for matching a release to a ledger film (same rule as the ledger's own de-duplication). */
const titleKey = (t: string) =>
  t
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "");
/** Person key: drop "(actor)"-style notes, keep letters and digits. */
const stripNote = (n: string) => n.replace(/\s*\(.*?\)\s*/g, " ").trim();
const personKey = (n: string) => stripNote(n).toLowerCase().replace(/[^a-z0-9]+/g, "");

type Person = { slug: string; name: string };
interface Row {
  r: Release;
  film: FilmAtom | null;
  heroes: Person[];
  others: string[];
  director: { slug: string | null; name: string } | null;
}

function Kind({ r, className = "" }: { r: Release; className?: string }) {
  if (r.kind === "theatrical") return null;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-ink-2 ${className}`}>
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: KIND_VAR[r.kind] }} />
      {KIND_SHORT[r.kind]}
      {r.kind === "dubbed" && r.language ? ` from ${r.language}` : ""}
    </span>
  );
}

/** One release: a single dense line on desktop (date · film · cast · director · kind), two lines on a phone. */
function ReleaseRow({ row }: { row: Row }) {
  const { r, film, heroes, others, director } = row;
  const wiki = r.wiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(r.wiki.replace(/ /g, "_"))}` : null;
  return (
    <li className="grid grid-cols-[46px_minmax(0,1fr)] gap-x-3 py-2.5 lg:min-h-11 lg:grid-cols-[52px_minmax(0,1.15fr)_minmax(0,1.5fr)_minmax(0,0.85fr)_150px] lg:items-center lg:gap-x-5 lg:py-1.5">
      <span className="tabular pt-px text-[12.5px] text-muted lg:pt-0">{r.date ? date(r.date, { year: false }) : "—"}</span>
      <span className="min-w-0 truncate text-[14.5px]">
        {film ? (
          <FilmToken slug={film.slug} title={film.title} o={film.outcome} showYear={false} />
        ) : wiki ? (
          <a href={wiki} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-2 decoration-rule underline-offset-[3px] hover:text-ink hover:underline">
            {r.title}
          </a>
        ) : (
          <span className="font-medium text-ink-2">{r.title}</span>
        )}
      </span>
      <span className="col-start-2 mt-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted lg:col-start-auto lg:mt-0 lg:flex-nowrap lg:overflow-hidden lg:whitespace-nowrap">
        {heroes.map((h) => (
          <HeroToken key={h.slug} slug={h.slug} name={h.name} size={18} className="shrink-0 text-[13px]" />
        ))}
        {others.length > 0 && <span className="min-w-0 truncate text-ink-2">{others.join(", ")}</span>}
        {director && (
          <DirectorToken slug={director.slug} name={director.name} mono className="font-normal text-ink-2 lg:hidden" />
        )}
        <Kind r={r} className="lg:hidden" />
      </span>
      <span className="hidden min-w-0 truncate text-[13px] lg:block">{director ? <DirectorToken slug={director.slug} name={director.name} mono className="font-normal text-ink-2" /> : null}</span>
      <span className="hidden lg:block">
        <Kind r={r} />
      </span>
    </li>
  );
}

function MonthList({ m, rows }: { m: number; rows: Row[] }) {
  return (
    <section id={`m-${m}`} aria-labelledby={`m-${m}-t`} className="grid scroll-mt-24 gap-x-8 lg:grid-cols-[150px_minmax(0,1fr)]">
      <div className="border-b border-ink/70 pb-2 lg:border-0 lg:pb-0">
        <div className="flex items-baseline justify-between lg:sticky lg:top-24 lg:block lg:border-t lg:border-ink/70 lg:pt-2.5">
          <h3 id={`m-${m}-t`} className="text-[15px] font-semibold text-ink">
            {MONTH[m] ?? "Date not known"}
          </h3>
          <p className="tabular text-[12.5px] text-muted lg:mt-0.5">{plural(rows.length, "film")}</p>
        </div>
      </div>
      <ul className="divide-y divide-rule lg:border-t lg:border-rule">
        {rows.map((row) => (
          <ReleaseRow key={`${row.r.title}|${row.r.date}`} row={row} />
        ))}
      </ul>
    </section>
  );
}

export default async function ReleasesPage(props: PageProps<"/releases">) {
  const sp = await props.searchParams;
  const counts = releaseCounts();
  const thisYear = counts[counts.length - 1].year;
  const first = counts[0].year;
  const year = Math.min(thisYear, Math.max(first, Number(typeof sp.year === "string" ? sp.year : thisYear) || thisYear));
  const kind = typeof sp.type === "string" && sp.type in KIND_LABEL ? (sp.type as ReleaseKind) : null;
  const [ledger, summaries, directors] = await Promise.all([getLedger(), getHeroSummaries(), getDirectors()]);

  const { released, upcoming } = releasesOf(year);
  const list = kind ? released.filter((r) => r.kind === kind) : released;
  const cur = counts.find((c) => c.year === year)!;
  const full = counts.filter((c) => !c.partial);
  const peak = full.reduce((a, b) => (b.total > a.total ? b : a));
  const low = full.reduce((a, b) => (b.total < a.total ? b : a));
  const all = counts.reduce((s, c) => s + c.total, 0);

  // Annotate only real extremes: the lowest and highest full years, and 2020 if it dipped below both neighbours.
  const notes: Record<number, string> = { [low.year]: "low", [peak.year]: "peak" };
  const c2020 = counts.findIndex((c) => c.year === 2020);
  if (c2020 > 0 && c2020 < counts.length - 1 && counts[c2020].total < counts[c2020 - 1].total && counts[c2020].total < counts[c2020 + 1].total) notes[2020] = "lockdown";

  // Match each release to the ledger (for its outcome mark and film page) and its cast to tracked heroes.
  const filmsOfYear = ledger.films.filter((f) => f.year === year);
  const byTitle = new Map(filmsOfYear.map((f) => [titleKey(f.title), f]));
  const heroByKey = new Map(summaries.map((h) => [personKey(h.name), { slug: h.slug, name: h.name }]));
  const directorPages = new Set(directors.map((d) => d.slug));
  const directorName = new Map(directors.map((d) => [d.slug, d.name]));
  const toRow = (r: Release): Row => {
    const film = byTitle.get(titleKey(r.title)) ?? null;
    const heroes: Person[] = [];
    const others: string[] = [];
    const seen = new Set<string>();
    for (const c of r.cast) {
      const k = personKey(c);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      let h = heroByKey.get(k);
      // On a ledger film, also accept a variant spelling of one of its lead heroes ("Ram Charan Teja", "Sudeepa").
      if (!h && film && k.length >= 5)
        h = film.heroes.find((fh) => {
          const hk = personKey(fh.name);
          return hk.startsWith(k) || k.startsWith(hk) || hk.includes(k.slice(0, 6));
        });
      if (h) {
        if (!heroes.some((x) => x.slug === h.slug)) heroes.push(h);
      } else others.push(stripNote(c));
    }
    for (const fh of film?.heroes ?? []) if (!heroes.some((x) => x.slug === fh.slug)) heroes.unshift(fh);
    const ds = directorSlug(r.director);
    return {
      r,
      film,
      heroes,
      others: others.slice(0, Math.max(1, 3 - heroes.length)),
      director: r.director ? { slug: ds && directorPages.has(ds) ? ds : null, name: (ds && directorName.get(ds)) || r.director } : null,
    };
  };
  const rows = list.map(toRow);

  // Months, newest first; the three latest are open, the rest behind "Show all months".
  const byMonth = new Map<number, Row[]>();
  for (const row of rows) {
    const m = row.r.date ? Number(row.r.date.slice(5, 7)) - 1 : 12;
    byMonth.set(m, [...(byMonth.get(m) ?? []), row]);
  }
  const months = [...byMonth.entries()];
  // Open the latest months until about two dozen films are showing (at most three months), so a phone page stays short.
  let open = 0;
  for (let n = 0; open < Math.min(3, months.length) && (open === 0 || n < 24); open++) n += months[open][1].length;
  const openMonths = months.slice(0, open);
  const moreMonths = months.slice(open);

  // 52 weeks from 1 January (the last cell takes the year's final one or two days).
  const jan1 = Date.parse(`${year}-01-01T00:00:00Z`);
  const weeks: Week[] = Array.from({ length: 52 }, (_, i) => {
    const start = new Date(jan1 + i * 7 * 864e5).toISOString().slice(0, 10);
    return { start, m: Number(start.slice(5, 7)) - 1, films: [], future: start > releasesAsOf };
  });
  for (const row of rows) {
    if (!row.r.date) continue;
    const i = Math.min(51, Math.floor((Date.parse(`${row.r.date}T00:00:00Z`) - jan1) / (7 * 864e5)));
    weeks[i].films.push({ t: row.r.title, k: row.r.kind, o: row.film?.outcome });
  }
  for (const w of weeks) w.films.reverse(); // oldest first within the week
  const busiest = weeks.reduce((a, b) => (b.films.length > a.films.length ? b : a), weeks[0]);
  const weekMax = Math.max(1, ...weeks.map((w) => w.films.length));
  const undated = rows.filter((r) => !r.r.date).length;

  // Films with a tracked hero this year, on the year's own spine.
  const tracked = filmsOfYear.filter((f) => (f.date ? f.date <= releasesAsOf : year < thisYear));
  const trackedJudged = tracked.filter(isJudged);
  const trackedHits = trackedJudged.filter(isHit).length;
  // The running year is hatched from the data date on: those weeks have not happened yet.
  const partialFrom = year === thisYear ? yearPos(releasesAsOf, year) : null;

  // Average film score per year (Telugu films with a complete score), from the same ledger.
  const scores = new Map<number, number[]>();
  for (const f of ledger.films) if (f.score !== null && f.language === "te") scores.set(f.year, [...(scores.get(f.year) ?? []), f.score]);
  const scoreData: YearScore[] = [...scores]
    .filter(([, v]) => v.length >= 15)
    .map(([y, v]) => ({ year: y, avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }))
    .sort((a, b) => a.year - b.year);
  const best = scoreData.length ? scoreData.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
  const worst = scoreData.length ? scoreData.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;

  const href = (y: number, t: ReleaseKind | null) => `/releases?year=${y}${t ? `&type=${t}` : ""}#list`;
  const asOfShort = date(releasesAsOf, { year: false });

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 lg:px-8">
      <PageHeader
        title="Years"
        subtitle={
          <>
            Every Telugu film released since {first}, {int(all)} in all: in theatres, straight to OTT, and films dubbed into Telugu. Releases nearly
            quadrupled, from {low.total} in {low.year} to {peak.total} in {peak.year}.
          </>
        }
        aside={<span className="tabular">Updated {date(releasesAsOf)}</span>}
      />

      <ChartFrame
        id="per-year"
        className="mt-10"
        title="Telugu releases per year"
        finding={`${thisYear} so far: ${counts[counts.length - 1].total} releases up to ${asOfShort}. Click a year to open its films.`}
        legend={<YearLegend />}
        source={<Source>Wikipedia year lists, our film data and films added by hand</Source>}
      >
        <YearColumns data={counts} height={300} hrefFor="/releases?year={y}#list" selected={year} notes={notes} asOfLabel={`to ${asOfShort}`} />
      </ChartFrame>

      <ViewTransition key={year} default="swap">
        <section id="list" aria-labelledby="list-title" className="mt-24 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-rule pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
              <nav aria-label="Year" className="flex items-center gap-1">
                {year > first ? (
                  <Link href={href(year - 1, kind)} scroll={false} aria-label={`Previous year, ${year - 1}`} className="grid h-10 w-10 place-items-center rounded-full border border-rule text-ink-2 transition-colors hover:border-ink-2 hover:text-ink">
                    <span aria-hidden>◀</span>
                  </Link>
                ) : (
                  <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full border border-rule text-faint">
                    ◀
                  </span>
                )}
                <h2 id="list-title" className="num px-2 text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[56px]">
                  {year}
                </h2>
                {year < thisYear ? (
                  <Link href={href(year + 1, kind)} scroll={false} aria-label={`Next year, ${year + 1}`} className="grid h-10 w-10 place-items-center rounded-full border border-rule text-ink-2 transition-colors hover:border-ink-2 hover:text-ink">
                    <span aria-hidden>▶</span>
                  </Link>
                ) : (
                  <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full border border-rule text-faint">
                    ▶
                  </span>
                )}
              </nav>
              <div className="pb-1">
                <p className="text-[15px] text-ink">
                  <span className="num font-semibold">{cur.total}</span> releases{cur.partial ? ` up to ${asOfShort}` : ""}
                </p>
                <p className="tabular mt-0.5 text-[13px] text-muted">
                  {cur.theatrical} in theatres · {cur.ott} direct to OTT · {cur.dubbed} dubbed
                </p>
              </div>
            </div>
            <SegmentedLinks
              label="Type of release"
              value={kind ?? "all"}
              options={[
                { value: "all", label: "All", href: href(year, null), count: cur.total },
                { value: "theatrical", label: "Theatres", href: href(year, "theatrical"), count: cur.theatrical },
                { value: "ott", label: (<><span className="sm:hidden">OTT</span><span className="max-sm:hidden">Direct to OTT</span></>), href: href(year, "ott"), count: cur.ott },
                { value: "dubbed", label: "Dubbed", href: href(year, "dubbed"), count: cur.dubbed },
              ]}
            />
          </div>

          <ChartFrame
            id="weeks"
            className="mt-8"
            title={`${year}, week by week`}
            finding={
              busiest.films.length ? (
                <>
                  Busiest week: {weekRange(busiest.start)}, with {plural(busiest.films.length, kind ? "film" : "release")}. Below it, every film with a hero we
                  track: {plural(tracked.length, "film")}
                  {trackedJudged.length ? `, ${trackedHits} of ${trackedJudged.length} with a result were hits` : ""}.
                </>
              ) : (
                `No dated ${kind ? KIND_SHORT[kind].toLowerCase() : ""} releases in ${year}.`
              )
            }
            legend={
              <span className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <WeekLegend max={weekMax} />
                <OutcomeLegend height={false} />
              </span>
            }
            source={undated ? <Source method={false}>{plural(undated, "film")} without a known date are listed below only</Source> : undefined}
          >
            <WeekStrip weeks={weeks} year={year} label={`${year}: releases per week, busiest ${busiest.films.length} in the week of ${date(busiest.start)}`} />
            {tracked.length > 0 && (
              <div className="mt-6 border-t border-rule pt-1">
                <FilmStrip films={tracked.map(toDot)} start={year} end={year + 1} height={64} labels={8} partialFrom={partialFrom} ariaLabel={`${plural(tracked.length, "film")} with a tracked hero in ${year}`} />
              </div>
            )}
          </ChartFrame>

          {rows.length === 0 ? (
            <p className="mt-10 text-[15px] text-ink-2">No films of this type in {year}.</p>
          ) : (
            <div className="mt-12" data-testid="release-list">
              <div className="space-y-12">
                {openMonths.map(([m, list]) => (
                  <MonthList key={m} m={m} rows={list} />
                ))}
              </div>
              {moreMonths.length > 0 && (
                <details className="group mt-10">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[10px] border border-rule bg-surface px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-ink-2 [&::-webkit-details-marker]:hidden">
                    <span className="when-closed">
                      Show all months · {moreMonths.length} more, {plural(moreMonths.reduce((s, [, l]) => s + l.length, 0), "film")}
                    </span>
                    <span className="when-open">Show fewer months</span>
                    <span aria-hidden className="text-muted transition-transform duration-[var(--dur-2)] group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="mt-12 space-y-12">
                    {moreMonths.map(([m, list]) => (
                      <MonthList key={m} m={m} rows={list} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {upcoming.length > 0 && (
            <details className="group mt-10 border-t border-rule pt-5">
              <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink hover:text-accent [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="mr-2 inline-block text-muted transition-transform duration-[var(--dur-2)] group-open:rotate-90">
                  ›
                </span>
                Coming up later in {year}: {plural(upcoming.length, "film")} announced
              </summary>
              <ul className="mt-3 divide-y divide-rule">
                {upcoming.map((r) => (
                  <ReleaseRow key={`${r.title}|${r.date}`} row={toRow(r)} />
                ))}
              </ul>
            </details>
          )}
        </section>
      </ViewTransition>

      {scoreData.length > 2 && best && worst && (
        <ChartFrame
          id="score"
          className="mt-24"
          title="Average film score by year"
          finding={
            <>
              Films with a tracked hero, on our 0–100 film score. Highest in {best.year} ({best.avg.toFixed(1)}), lowest in {worst.year} ({worst.avg.toFixed(1)}). Years
              with fewer than 15 scored films are left out, so the latest years appear once their films are scored.
            </>
          }
          source={<Source>Telugu films with a complete film score</Source>}
        >
          <ScoreByYear data={scoreData} selected={year} hrefFor="/releases?year={y}#list" />
        </ChartFrame>
      )}

      <section aria-labelledby="sources" className="mt-24">
        <SectionTitle id="sources" title="How the count is made" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <p className="max-w-xl text-[14px] leading-relaxed text-ink-2">
            We start from Wikipedia&apos;s list of Telugu films for each year (CC BY-SA 4.0), add the Telugu films that list misses from our own film data and
            by hand, and add films dubbed into Telugu. Older years and dubbed films are less complete: small releases are sometimes not recorded anywhere.
            Direct-to-OTT films are marked when the source says so. Spotted a missing film?{" "}
            <Link href="/contact" className="link">
              Tell us
            </Link>
            .
          </p>
          <details className="frame group self-start" data-testid="release-check">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[15px] font-semibold text-ink sm:px-5 [&::-webkit-details-marker]:hidden">
              How the total adds up, year by year
              <span aria-hidden className="text-muted transition-transform duration-[var(--dur-2)] group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="scroll-x border-t border-rule">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="border-b border-rule bg-surface-2 text-left">
                    <th scope="col" className="label sticky left-0 bg-surface-2 px-4 py-2">
                      Year
                    </th>
                    <th scope="col" className="label px-3 py-2 text-right">
                      Wikipedia list
                    </th>
                    <th scope="col" className="label px-3 py-2 text-right">
                      + Telugu films it misses
                    </th>
                    <th scope="col" className="label px-3 py-2 text-right">
                      + Dubbed into Telugu
                    </th>
                    <th scope="col" className="label px-4 py-2 text-right">
                      = All releases
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {[...counts].reverse().map((c) => (
                    <tr key={c.year} className={`border-b border-rule ${c.year === year ? "bg-accent-wash/50" : ""}`}>
                      <th scope="row" className="sticky left-0 bg-surface px-4 py-1.5 text-left font-normal">
                        <Link href={href(c.year, null)} scroll={false} className="link">
                          {c.year}
                        </Link>
                        {c.partial && <span className="text-muted"> (so far)</span>}
                      </th>
                      <td className="px-3 py-1.5 text-right">{c.wikipedia}</td>
                      <td className="px-3 py-1.5 text-right text-ink-2">{c.extra ? `+${c.extra}` : "—"}</td>
                      <td className="px-3 py-1.5 text-right text-ink-2">{c.dubbed ? `+${c.dubbed}` : "—"}</td>
                      <td className="px-4 py-1.5 text-right font-semibold text-ink">{c.total}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold text-ink">
                    <th scope="row" className="sticky left-0 bg-surface px-4 py-2 text-left">
                      Since {first}
                    </th>
                    <td className="px-3 py-2 text-right">{int(counts.reduce((s, c) => s + c.wikipedia, 0))}</td>
                    <td className="px-3 py-2 text-right">+{int(counts.reduce((s, c) => s + c.extra, 0))}</td>
                    <td className="px-3 py-2 text-right">+{int(counts.reduce((s, c) => s + c.dubbed, 0))}</td>
                    <td className="px-4 py-2 text-right">{int(all)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="px-4 py-3 text-[12px] text-muted">A film listed twice on one year&apos;s Wikipedia page is counted once here.</p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
