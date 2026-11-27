import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { FocusProvider } from "@/components/charts/focus";
import { FilmToken, MiniMark } from "@/components/entity/tokens";
import { CareerReel, type ReelDirector } from "@/components/hero/career-reel";
import { FactorTable, type FactorRow } from "@/components/hero/factor-table";
import { FilmsTable, type HeroFilmRow } from "@/components/hero/films-table";
import { Ext, HeroAbout, type AboutRow } from "@/components/hero/hero-about";
import { HeroHeader } from "@/components/hero/hero-header";
import { Partners, type PartnerDirector, type PartnerHero } from "@/components/hero/partners";
import { SectionBar } from "@/components/hero/section-bar";
import { Standing, type StandingPillar } from "@/components/hero/standing";
import { SectionTitle } from "@/components/layout/page-header";
import { GROUPS, groupFact, groupValue, kpiFact, type GroupKey } from "@/components/tolly/tolly-parts";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { HERO_PHOTOS } from "@/lib/constants/photos";
import { compactCount, formatDay, heroFacts, latestFollowers, yearsBetween, type FollowerCount } from "@/lib/data/real/hero-facts";
import { socialHandles } from "@/lib/data/real/load";
import { REPORTED_INSTAGRAM } from "@/lib/data/real/reported-social";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled } from "@/lib/features";
import { getFilmFacts } from "@/lib/film-facts";
import { date, inr, plural } from "@/lib/format";
import { getLedger, isHit, isJudged, longestStreak, toDot, type FilmAtom } from "@/lib/ledger";
import { getHeroSummaries, nextFilm, spineEnd } from "@/lib/ledger-rows";
import { OUTCOME_LABEL, VERDICT_LABEL, type Outcome } from "@/lib/ledger-types";
import { getPerson } from "@/lib/repositories";
import { HERO_FACTORS } from "@/lib/tolly";
import { getTollyHero, getTollyRanking, tollyMeta } from "@/lib/tolly/view";

const real = () => DATA_MODE === "real" && tollyIndexEnabled();

export async function generateMetadata(props: PageProps<"/hero/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPerson(slug);
  if (!p) return { title: "Hero not found" };
  const t = real() ? getTollyHero(slug) : null;
  const films = (await getLedger()).byHero.get(slug) ?? [];
  const title = t?.index != null && t.rank ? `${p.displayName} — Tolly Index ${t.index.toFixed(1)} (#${t.rank})` : p.displayName;
  const first = films[0]?.year;
  return {
    title: { absolute: `${title} · Tollywood Analysis` },
    description: `${p.displayName}: all ${films.length} films as lead${first ? ` since ${first}` : ""} on one timeline, with results, reported grosses and where he stands among Telugu heroes.`,
  };
}

/** Plain-language names for the five pillars and the 15 numbers (labels only: the weights stay private). */
const PILLAR_COPY: Record<GroupKey, { label: string; question: string }> = {
  audience: { label: "Audience", question: "How much people love his films, and keep coming back to them" },
  boxoffice: { label: "Box office", question: "How often his films hit, and how big" },
  recent: { label: "Recent form", question: "How his latest films have done" },
  fame: { label: "Fame", question: "How many people follow him" },
  career: { label: "Career", question: "How long, steady and busy his career is" },
};
const FACTOR_LABEL: Record<string, string> = {
  audience: "Audience score of his films",
  success: "Hit rate",
  hits: "Hit films",
  blockbusters: "Blockbusters",
  bigFilms: "₹100-crore films",
  totalGross: "Total box office",
  topGross: "Biggest film",
  avgGross: "Box office per film",
  recent: "Hit rate, latest films",
  fame: "Followers",
  consistency: "Consistency",
  films: "Films as lead",
  years: "Years active",
  peak: "Busiest year",
  gap: "Release pace",
};

const INDUSTRY: Record<string, string> = { tamil: "Tamil", malayalam: "Malayalam", kannada: "Kannada", hindi: "Hindi" };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

function resultLabel(f: FilmAtom): string {
  if (f.outcome === "unknown") return "Not reported";
  if (f.outcome === "recent") return "Too recent";
  return f.verdict ? (VERDICT_LABEL[f.verdict] ?? OUTCOME_LABEL[f.outcome]) : OUTCOME_LABEL[f.outcome];
}

export default async function HeroPage(props: PageProps<"/hero/[slug]">) {
  const { slug } = await props.params;
  const person = await getPerson(slug);
  if (!person) notFound();
  const [summaries, ledger, upcoming] = await Promise.all([getHeroSummaries(), getLedger(), nextFilm(slug)]);
  const me = summaries.find((s) => s.slug === slug);
  if (!me) notFound();
  const films = ledger.byHero.get(slug) ?? [];
  const facts = await Promise.all(films.map((f) => getFilmFacts(f)));
  const tolly = real() ? getTollyHero(slug) : null;
  const ranked = real() ? getTollyRanking().ranked : [];
  const { end, partialFrom } = spineEnd();

  const name = person.displayName;
  const rank = tolly?.rank ?? null;
  const at = ranked.findIndex((h) => h.slug === slug);
  const neighbour = (i: number) => (i >= 0 && i < ranked.length ? { slug: ranked[i].slug, name: ranked[i].name, rank: ranked[i].rank as number } : null);
  const prev = at >= 0 ? neighbour(at - 1) : null;
  const next = at >= 0 ? neighbour(at + 1) : null;

  // ── Header facts ──
  const judged = films.filter(isJudged);
  const hits = judged.filter(isHit);
  const gross = films.reduce((s, f) => s + (f.gross ?? 0), 0);
  const first = films[0];
  const last = films[films.length - 1];
  const intro = [
    me.industry === "telugu" ? "Telugu film hero" : `${INDUSTRY[me.industry] ?? "Indian"} film hero, counted for his films released in Telugu`,
    plural(films.length, "film") + " as lead",
  ]
    .filter(Boolean)
    .join(" · ");
  const headFacts = [
    judged.length ? { big: `${hits.length} hits`, small: `of ${judged.length} judged` } : { big: "No results", small: "reported yet" },
    ...(gross > 0 ? [{ big: inr(gross), small: "reported gross" }] : []),
    ...(first && last ? [{ big: `${first.year}–${last.year}`, small: "active" }] : []),
  ];
  const outside = rank === null ? (tolly?.reason ? sentence(tolly.reason) : me.industry !== "telugu" ? "The index ranks heroes whose films are mostly Telugu originals with full results." : "Not enough of his films have a complete score yet.") : null;

  // ── Career reel ──
  const dots = films.map(toDot);
  const start = first ? Math.floor(first.year) - 0.15 : 2000;
  const byDirector = new Map<string, { slug: string | null; name: string; films: FilmAtom[] }>();
  for (const f of films) {
    if (!f.director) continue;
    const k = f.director.slug ?? f.director.name;
    const e = byDirector.get(k) ?? { slug: f.director.slug, name: f.director.name, films: [] };
    e.films.push(f);
    byDirector.set(k, e);
  }
  const directorList = [...byDirector.entries()]
    .map(([key, d]) => ({ key, ...d, hits: d.films.filter(isHit).length, judged: d.films.filter(isJudged).length }))
    .sort((a, b) => b.films.length - a.films.length || b.hits - a.hits || a.films[0].year - b.films[0].year);
  const reelDirectors: ReelDirector[] = directorList.map((d) => ({ key: d.key, name: d.name, films: d.films.length, hits: d.hits, marks: d.films.map((f) => f.outcome) }));

  const streak = longestStreak(films);
  const biggest = [...films].filter((f) => f.gross).sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0))[0];
  const firstHit = films.find(isHit);
  const latest = [...films].reverse().find((f) => !f.date || f.date <= new Date().toISOString().slice(0, 10)) ?? last;
  const counts = new Map<Outcome, number>();
  for (const f of films) {
    const k: Outcome = f.outcome === "disaster" ? "flop" : f.outcome === "recent" || f.outcome === "ott" ? "unknown" : f.outcome;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const reelFinding = judged.length
    ? `${hits.length} of his ${judged.length} films with a known result were hits${streak.length >= 2 && streak.from && streak.to ? `; the longest run was ${streak.length} in a row, ${streak.from.title} to ${streak.to.title}` : ""}.`
    : `${plural(films.length, "film")} on one timeline; no box-office results have been reported yet.`;

  // ── Where he stands ──
  const pillars: StandingPillar[] =
    tolly?.factors && ranked.length
      ? GROUPS.map((g) => {
          const field = ranked.map((h) => ({ slug: h.slug, name: h.name, v: groupValue(h, g.key).value })).filter((d): d is { slug: string; name: string; v: number } => d.v !== null);
          const v = groupValue(tolly, g.key).value;
          return {
            key: g.key,
            label: PILLAR_COPY[g.key].label,
            question: PILLAR_COPY[g.key].question,
            value: v,
            rank: v === null || rank === null ? null : 1 + field.filter((d) => d.v > v).length,
            of: field.length,
            fact: groupFact(tolly, g.key, compactCount),
            median: median(field.map((d) => d.v)),
            field,
          };
        })
      : [];
  const rankedPillars = pillars.filter((p) => p.rank !== null).sort((a, b) => (a.rank as number) - (b.rank as number));
  const best = rankedPillars[0];
  const worst = rankedPillars[rankedPillars.length - 1];
  const standFinding =
    best && worst && best !== worst
      ? `Strongest on ${best.label.toLowerCase()} (${best.rank === 1 ? "best" : `${ord(best.rank as number)}`} of ${best.of}), weakest on ${worst.label.toLowerCase()} (${ord(worst.rank as number)}). Each dot is a ranked hero; ${name} is in colour.`
      : `Each dot is a ranked hero; ${name} is in colour.`;
  const factorRows: FactorRow[] = tolly?.factors
    ? HERO_FACTORS.map((f) => ({
        key: f.key,
        group: PILLAR_COPY[f.group as GroupKey].label,
        label: FACTOR_LABEL[f.key] ?? f.label,
        value: tolly.factors?.[f.key].value ?? null,
        median: median(ranked.map((h) => h.factors?.[f.key].value).filter((x): x is number => x !== null && x !== undefined)),
        fact: kpiFact(tolly, f.key, compactCount),
      }))
    : [];

  // ── Films ──
  const rows: HeroFilmRow[] = films.map((f, i) => ({
    dot: dots[i],
    slug: f.slug,
    title: f.title,
    year: f.year,
    date: f.date,
    o: f.outcome,
    result: resultLabel(f),
    score: f.score,
    gross: f.gross,
    grossText: facts[i].grossText,
    budget: f.budget,
    budgetText: facts[i].budgetText,
    multiple: facts[i].multiple,
    director: f.director,
    coLeads: f.heroes.filter((h) => h.slug !== slug),
    why: facts[i].why,
    source: facts[i].source,
    language: f.language,
  }));

  // ── Partners ──
  const partnerDirectors: PartnerDirector[] = directorList.map((d) => ({ slug: d.slug, name: d.name, films: d.films.map(toDot), hits: d.hits, judged: d.judged }));
  const coLeads = new Map<string, PartnerHero>();
  for (const f of films)
    for (const h of f.heroes) {
      if (h.slug === slug) continue;
      const e = coLeads.get(h.slug) ?? { slug: h.slug, name: h.name, films: [] };
      e.films.push({ slug: f.slug, title: f.title, year: f.year, o: f.outcome });
      coLeads.set(h.slug, e);
    }
  const partnerHeroes = [...coLeads.values()].sort((a, b) => b.films.length - a.films.length || a.name.localeCompare(b.name));
  const compare = at >= 0 ? [at - 2, at - 1, at + 1, at + 2].map(neighbour).filter((x): x is NonNullable<typeof x> => !!x) : [];
  const topDir = directorList.find((d) => d.films.length >= 2);
  const partnerFinding = topDir
    ? `${topDir.name} directed him ${topDir.films.length === 2 ? "twice" : `${topDir.films.length} times`}${topDir.judged ? `, ${topDir.hits === topDir.judged ? (topDir.judged === 1 ? "a hit" : "all hits") : `${topDir.hits} of them hits`}` : ""}. ${directorList.length} directors in all.`
    : `${plural(directorList.length, "director")}, never the same one twice.`;

  // ── About ──
  const about = aboutRows(slug, person.wikiArticle ?? null);

  const sections = [
    { id: "reel", label: "Career reel" },
    ...(pillars.length ? [{ id: "standing", label: "Where he stands" }] : []),
    { id: "films", label: "Films" },
    { id: "partners", label: "Partners" },
    ...(about.rows.length ? [{ id: "about", label: "About" }] : []),
  ];

  return (
    <ViewTransition key={slug} enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }} exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }} default="none">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 sm:px-6 lg:px-8">
        <HeroHeader
          slug={slug}
          name={name}
          intro={intro}
          index={tolly?.index ?? null}
          band={tolly?.band ?? null}
          rank={rank}
          of={ranked.length}
          outside={outside}
          provisional={rank !== null && me.industry !== "telugu"}
          facts={headFacts}
          field={ranked.map((h) => h.index as number)}
          prev={prev}
          next={next}
        />

        <SectionBar
          sections={sections}
          aside={
            <Link href={`/compare?heroes=${slug}`} className="text-[13px] font-medium text-accent hover:underline">
              Compare {name} →
            </Link>
          }
        />

        <FocusProvider>
          <div className="mt-8">
            <ChartFrame
              id="reel"
              title="Career reel"
              finding={reelFinding}
              legend={
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {(["blockbuster", "hit", "average", "flop", "unknown"] as Outcome[])
                    .filter((o) => counts.get(o))
                    .map((o) => (
                      <span key={o} className="inline-flex items-center gap-1.5">
                        <MiniMark o={o} />
                        <b className="tabular font-semibold text-ink-2">{counts.get(o)}</b>
                        {o === "unknown" ? "not reported" : o === "flop" ? "flop or disaster" : OUTCOME_LABEL[o].toLowerCase()}
                      </span>
                    ))}
                  <span className="text-faint">· taller = bigger reported gross (log scale)</span>
                </span>
              }
              source={<Source>Results and grosses as reported · data as of {date(tollyMeta.asOf)}</Source>}
            >
              <CareerReel name={name} films={dots} start={start} end={end} partialFrom={partialFrom} upcoming={upcoming} directors={reelDirectors} />
              <ul className="mt-6 grid gap-x-8 gap-y-5 border-t border-rule pb-3 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                {streak.length >= 2 && streak.from && streak.to && (
                  <Note k="Longest run of hits" big={`${streak.length} in a row`}>
                    <FilmToken slug={streak.from.slug} title={streak.from.title} year={streak.from.year} o={streak.from.outcome} /> <span className="text-muted">to</span>{" "}
                    <FilmToken slug={streak.to.slug} title={streak.to.title} year={streak.to.year} o={streak.to.outcome} />
                  </Note>
                )}
                {biggest && (
                  <Note k="Biggest film" big={inr(biggest.gross)}>
                    <FilmToken slug={biggest.slug} title={biggest.title} year={biggest.year} o={biggest.outcome} />
                  </Note>
                )}
                {firstHit && (
                  <Note k="First hit" big={firstHit === first ? "His debut" : `Film ${films.indexOf(firstHit) + 1}`}>
                    <FilmToken slug={firstHit.slug} title={firstHit.title} year={firstHit.year} o={firstHit.outcome} />
                  </Note>
                )}
                {latest && (
                  <Note k="Latest film" big={resultLabel(latest)}>
                    <FilmToken slug={latest.slug} title={latest.title} year={latest.year} o={latest.outcome} />
                    {upcoming && (
                      <span className="mt-1 block text-[12.5px] text-muted">
                        Next: <span className="text-ink-2">{upcoming.title}</span> ({upcoming.year}), shown as <span className="tabular">?</span>
                      </span>
                    )}
                  </Note>
                )}
              </ul>
            </ChartFrame>
          </div>

          {pillars.length > 0 && tolly && (
            <section aria-labelledby="standing" className="mt-24">
              <SectionTitle id="standing" title="Where he stands" finding={standFinding} />
              <Standing pillars={pillars} slug={slug} name={name} />
              <details className="group mt-6">
                <summary className="inline-flex min-h-10 items-center gap-2 rounded-md text-[14px] font-medium text-ink hover:text-accent">
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="transition-transform duration-[var(--dur-2)] group-open:rotate-90">
                    <path d="M3.5 1.5 7 5l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="when-closed">All 15 numbers</span>
                  <span className="when-open">Hide the 15 numbers</span>
                </summary>
                <div className="pop-in mt-4 max-w-4xl">
                  <p className="mb-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
                    Each number is out of 100 and says where {name} sits among the {ranked.length} ranked heroes: 100 is the best of them. The five pillars above are built from these.{" "}
                    <Link href="/methodology" className="link">
                      How the index works
                    </Link>
                  </p>
                  <FactorTable rows={factorRows} name={name} />
                </div>
              </details>
            </section>
          )}

          <section aria-labelledby="films" className="mt-24">
            <SectionTitle id="films" title="Films" finding={`Every film as lead${first ? ` since ${first.year}` : ""}. Open a row for the reported result and where it comes from.`} />
            <FilmsTable rows={rows} />
            <p className="mt-3 text-[12px] text-muted">Grosses are reported worldwide figures across all languages, not audited. Film score is our 0–100 score from how audiences rate, find and keep returning to a film.</p>
          </section>

          <section aria-labelledby="partners" className="mt-24">
            <SectionTitle id="partners" title="Partners" finding={partnerFinding} />
            <Partners directors={partnerDirectors} heroes={partnerHeroes} start={start} end={end} partialFrom={partialFrom} compare={compare} slug={slug} />
          </section>
        </FocusProvider>

        {about.rows.length > 0 && (
          <section aria-labelledby="about" className="mt-24">
            <SectionTitle id="about" title="About" finding="Background from Wikidata and official profiles. None of it counts towards any score." />
            <div className="max-w-4xl">
              <HeroAbout rows={about.rows} />
            </div>
          </section>
        )}
      </div>
    </ViewTransition>
  );
}

function Note({ k, big, children }: { k: string; big: string; children: ReactNode }) {
  return (
    <li className="min-w-0">
      <p className="label">{k}</p>
      <p className="num mt-1 text-[19px] font-semibold leading-tight text-ink">{big}</p>
      <div className="mt-1 text-[13.5px] leading-relaxed">{children}</div>
    </li>
  );
}

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** "19 of 23 films complete (83%, needs 90%)" → a sentence a reader can follow. */
function sentence(reason: string): string {
  const m = /^(\d+) of (\d+) films complete \((\d+)%, needs (\d+)%\)$/.exec(reason);
  if (m) return `Not ranked yet: ${m[1]} of his ${m[2]} films have a complete film score, and the index needs ${m[4]}%.`;
  const n = /^only (\d+) complete films? \(needs (\d+)\)$/.exec(reason);
  if (n) return `Not ranked yet: only ${n[1]} of his films have a complete film score, and the index needs ${n[2]}.`;
  return `Not ranked yet: ${reason}.`;
}

function aboutRows(slug: string, wikiArticle: string | null): { rows: AboutRow[] } {
  if (DATA_MODE !== "real") return { rows: [] };
  const f = heroFacts(slug);
  const handles = socialHandles(slug);
  const igUrl = handles?.instagram?.username ? `https://www.instagram.com/${handles.instagram.username}/` : null;
  const xUrl = handles?.x?.username ? `https://x.com/${handles.x.username}` : null;
  const igReported = REPORTED_INSTAGRAM.followers[slug];
  const followers = latestFollowers(slug, [
    ...(handles?.x?.followers && handles.x.date ? [{ platform: "x", followers: handles.x.followers, date: handles.x.date, url: xUrl, source: "Wikidata" } as FollowerCount] : []),
    ...(igReported ? [{ platform: "instagram", followers: igReported, date: REPORTED_INSTAGRAM.date, url: igUrl, source: "press report" } as FollowerCount] : []),
  ]);
  const platform: Record<FollowerCount["platform"], string> = { instagram: "Instagram", x: "X", youtube: "YouTube", facebook: "Facebook" };
  const credit = HERO_PHOTOS[slug];
  const rows: AboutRow[] = [];
  if (f?.birthDate)
    rows.push({
      k: f.deathDate ? "Lived" : "Born",
      v: f.deathDate
        ? `${formatDay(f.birthDate)} – ${formatDay(f.deathDate)} (aged ${yearsBetween(f.birthDate, f.deathDate)})${f.birthPlace ? `, ${f.birthPlace}` : ""}`
        : `${formatDay(f.birthDate)}${f.birthPlace ? `, ${f.birthPlace}` : ""} · age ${yearsBetween(f.birthDate)}`,
    });
  else if (f?.birthPlace) rows.push({ k: "Born", v: f.birthPlace });
  const family = [
    f?.father && `father ${f.father}`,
    f?.mother && `mother ${f.mother}`,
    f?.spouse?.length && `married to ${f.spouse.join(", ")}`,
    f?.siblings?.length && `siblings ${f.siblings.join(", ")}`,
    f?.children?.length && `children ${f.children.join(", ")}`,
    f?.relatives?.length && `relatives ${f.relatives.join(", ")}`,
  ].filter(Boolean) as string[];
  if (family.length) rows.push({ k: "Family", v: family.join("; ").replace(/^./, (c) => c.toUpperCase()) });
  if (f?.awards?.length) rows.push({ k: "Awards", v: f.awards.join(", ") });
  if (f?.education?.length) rows.push({ k: "Education", v: f.education.join(", ") });
  if (f?.party?.length || f?.offices?.length) rows.push({ k: "Politics", v: [...(f?.party ?? []), ...(f?.offices ?? [])].join(", ") });
  if (followers.length)
    rows.push({
      k: "Followers",
      v: (
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          {followers.map((c) => (
            <span key={c.platform} title={`${c.followers.toLocaleString("en-IN")} on ${formatDay(c.date)} (${c.source})`}>
              {platform[c.platform]} <b className="tabular font-semibold text-ink">{compactCount(c.followers)}</b>
              <span className="text-muted"> · {formatDay(c.date)}</span>
            </span>
          ))}
        </span>
      ),
    });
  const links = [
    wikiArticle && { href: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiArticle.replace(/ /g, "_"))}`, label: "Wikipedia" },
    igUrl && { href: igUrl, label: "Instagram" },
    xUrl && { href: xUrl, label: "X" },
    f?.website && { href: f.website, label: "Official website" },
  ].filter(Boolean) as { href: string; label: string }[];
  if (links.length)
    rows.push({
      k: "Links",
      v: (
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((l) => (
            <Ext key={l.label} href={l.href}>
              {l.label}
            </Ext>
          ))}
        </span>
      ),
    });
  if (credit)
    rows.push({
      k: "Photo",
      v: (
        <span className="text-[13px]">
          {credit.author}, {credit.license === "See file page" ? "free licence" : credit.license} · <Ext href={credit.page}>Wikimedia Commons</Ext>
        </span>
      ),
    });
  return { rows };
}
