import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FocusProvider } from "@/components/charts/focus";
import { OutcomeLegend } from "@/components/charts/outcome-legend";
import { DirectorToken, FilmToken, HeroToken, MiniMark } from "@/components/entity/tokens";
import { WhereItSits, type SitsRow } from "@/components/film/where-it-sits";
import { SectionTitle } from "@/components/layout/page-header";
import { ChartFrame, Source } from "@/components/ui/chart-frame";
import { getFilmFacts } from "@/lib/film-facts";
import { date, inr, int, multiple, plural } from "@/lib/format";
import { getLedger, toDot, type FilmAtom } from "@/lib/ledger";
import { yearPos } from "@/lib/timeline";
import { spineEnd } from "@/lib/ledger-rows";
import { OUTCOME_LABEL, OUTCOME_VAR, VERDICT_LABEL } from "@/lib/ledger-types";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getLedger()).films.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata(props: PageProps<"/film/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const f = (await getLedger()).bySlug.get(slug);
  if (!f) return { title: "Film not found" };
  const who = f.heroes.map((h) => h.name).join(", ");
  return {
    title: `${f.title} (${f.year})`,
    description: `${f.title} (${f.year})${who ? ` starring ${who}` : ""}${f.director ? `, directed by ${f.director.name}` : ""}: result, reported gross and budget, film score, and where it sits in their careers.`,
  };
}

const LANG: Record<string, string> = { te: "Telugu", ta: "Tamil", ma: "Malayalam", ml: "Malayalam", ka: "Kannada", kn: "Kannada", hi: "Hindi", en: "English" };

function resultText(f: FilmAtom) {
  if (f.outcome === "unknown") return "Result not reported";
  return f.verdict ? (VERDICT_LABEL[f.verdict] ?? OUTCOME_LABEL[f.outcome]) : OUTCOME_LABEL[f.outcome];
}

export default async function FilmPage(props: PageProps<"/film/[slug]">) {
  const { slug } = await props.params;
  const ledger = await getLedger();
  const f = ledger.bySlug.get(slug);
  if (!f) notFound();
  const facts = await getFilmFacts(f);
  const { end, partialFrom } = spineEnd();

  const scored = ledger.films.filter((x) => x.score !== null);
  const better = f.score !== null ? scored.filter((x) => (x.score as number) < (f.score as number)).length : 0;
  const overallRank = f.score !== null ? scored.length - better - scored.filter((x) => x.score === f.score).length + 1 : 0;
  const pctBetter = f.score !== null && scored.length > 1 ? Math.min(99, Math.floor((better / (scored.length - 1)) * 100)) : null;
  const sameYear = ledger.films.filter((x) => x.year === f.year);
  const yearScored = sameYear.filter((x) => x.score !== null).sort((a, b) => (b.score as number) - (a.score as number));
  const yearRank = f.score !== null ? yearScored.findIndex((x) => x.slug === f.slug) + 1 : 0;
  const yearTop = yearScored.filter((x) => x.slug !== f.slug).slice(0, 5);

  const rows: SitsRow[] = [
    ...f.heroes.map((h) => {
      const films = ledger.byHero.get(h.slug) ?? [];
      return { key: `h-${h.slug}`, label: <HeroToken slug={h.slug} name={h.name} size={24} />, note: `${plural(films.length, "film")} as lead`, films: films.map(toDot) };
    }),
    ...(f.director?.slug
      ? [
          {
            key: "d",
            label: <DirectorToken slug={f.director.slug} name={f.director.name} mono />,
            note: `${plural((ledger.byDirector.get(f.director.slug) ?? []).length, "film")} directed`,
            films: (ledger.byDirector.get(f.director.slug) ?? []).map(toDot),
          },
        ]
      : []),
  ];

  const neighbours = f.heroes.map((h) => {
    const list = ledger.byHero.get(h.slug) ?? [];
    const i = list.findIndex((x) => x.slug === f.slug);
    return { hero: h, prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, n: i + 1, of: list.length };
  });

  const meta: ReactNode[] = [
    f.date ? <span key="d">Released {date(f.date)}</span> : <span key="d">Released {f.year}</span>,
    facts.runtime ? <span key="r" className="tabular">{facts.runtime} min</span> : null,
    facts.genres.length ? <span key="g">{facts.genres.join(", ")}</span> : null,
    f.language !== "te" ? <span key="l">{LANG[f.language] ?? f.language.toUpperCase()} film, released in Telugu</span> : null,
    f.route === "ott" ? <span key="o">Premiered on streaming</span> : null,
    facts.music ? <span key="m">Music by {facts.music}</span> : null,
  ].filter(Boolean);

  const pillars = facts.pillars
    ? [
        { k: "Audience", hint: "How much people who watched it liked it", v: facts.pillars.audience },
        { k: "Reach", hint: "How many people watched and talked about it", v: facts.pillars.reach },
        { k: "Staying power", hint: "Whether people still look it up years later", v: facts.pillars.stay },
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 pt-6 text-[13px] text-muted sm:pt-8">
        <Link href="/films" className="font-medium hover:text-ink">
          Films
        </Link>
        <span aria-hidden className="text-faint">/</span>
        <Link href={`/films?decade=${Math.floor(f.year / 10) * 10}s`} className="tabular hover:text-ink">
          {f.year}
        </Link>
      </nav>

      <header className="mt-5">
        <h1 className="max-w-4xl font-serif text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[54px]">
          {f.title} <span className="num align-baseline text-[0.5em] font-medium tracking-normal text-muted">{f.year}</span>
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[14.5px] text-ink-2">
          {f.heroes.map((h) => (
            <HeroToken key={h.slug} slug={h.slug} name={h.name} size={26} className="text-[15px]" morph />
          ))}
          {f.director && (
            <span className="inline-flex items-center gap-2">
              <span className="text-muted">Directed by</span>
              <DirectorToken slug={f.director.slug} name={f.director.name} mono />
            </span>
          )}
        </div>
        <p className="mt-2.5 flex flex-wrap gap-x-2 text-[14px] text-muted">
          {meta.map((m, i) => (
            <span key={i} className="inline-flex gap-2">
              {i > 0 && <span aria-hidden className="text-faint">·</span>}
              {m}
            </span>
          ))}
        </p>
      </header>

      {/* Three facts: separated by rules, not boxed */}
      <section aria-label="Key facts" className="mt-10 grid border-y border-rule md:grid-cols-3">
        <Fact label="Result">
          <p className="flex items-center gap-2.5">
            <span aria-hidden className="inline-block h-[26px] w-[10px] rounded-[2px]" style={markStyle(f)} />
            <span className="text-[28px] font-semibold leading-none tracking-[-0.01em]" style={{ color: f.outcome === "unknown" || f.outcome === "recent" || f.outcome === "ott" ? "var(--ink-2)" : OUTCOME_VAR[f.outcome] }}>
              {resultText(f)}
            </span>
          </p>
          {facts.why ? (
            f.outcome === "recent" || f.outcome === "ott" ? (
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{facts.why}</p>
            ) : (
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">&ldquo;{facts.why.replace(/^"|"$/g, "")}&rdquo;</p>
            )
          ) : (
            <p className="mt-3 text-[14px] leading-relaxed text-muted">No box-office verdict has been reported for this film, so it does not count towards any hit rate.</p>
          )}
          {facts.source && (
            <p className="mt-2 text-[12.5px] text-muted">
              Source:{" "}
              {facts.source.url ? (
                <a href={facts.source.url} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-rule underline-offset-2 hover:text-ink">
                  {facts.source.label} ↗
                </a>
              ) : (
                facts.source.label
              )}
            </p>
          )}
        </Fact>

        <Fact label="Film score">
          {f.score !== null ? (
            <>
              <p className="flex items-baseline gap-1.5">
                <span className="num text-[44px] font-semibold leading-none text-ink">{f.score.toFixed(1)}</span>
                <span className="text-[14px] text-muted">/ 100</span>
              </p>
              <p className="mt-1.5 text-[13.5px] text-ink-2">
                {overallRank > 0 && overallRank <= 20 ? (
                  <>
                    <b className="font-semibold text-ink">#{overallRank}</b> of all {int(scored.length)} scored films
                  </>
                ) : (
                  pctBetter !== null && <>Higher than {pctBetter}% of the {int(scored.length)} scored films</>
                )}
                {yearRank > 0 && (
                  <>
                    {" · "}
                    {yearRank === 1 ? <b className="font-semibold text-ink">best of {f.year}</b> : `#${yearRank} of ${yearScored.length} in ${f.year}`}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-[15px] leading-relaxed text-ink-2">{facts.scoreStatus === "provisional" ? "Not scored yet: the film is too new for a settled score." : "Not scored: not enough audience data for this film yet."}</p>
          )}
          {pillars.length > 0 && (
            <ul className="mt-4 space-y-2">
              {pillars.map((p) => (
                <li key={p.k} className="grid grid-cols-[104px_1fr_34px] items-center gap-3 text-[13px]" title={p.hint}>
                  <span className="text-ink-2">{p.k}</span>
                  <span className="relative h-2 rounded-full bg-surface-2" role="img" aria-label={`${p.k}: ${p.v === null ? "no data" : `${p.v.toFixed(0)} out of 100`}`}>
                    {p.v !== null && <span className="absolute inset-y-0 left-0 rounded-full bg-ink-2" style={{ width: `${Math.max(2, Math.min(100, p.v))}%` }} />}
                  </span>
                  <span className="tabular text-right font-medium text-ink">{p.v === null ? "—" : p.v.toFixed(0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Fact>

        <Fact label="Reported gross">
          <p className="num text-[44px] font-semibold leading-none text-ink">{f.gross !== null ? facts.grossText : <span className="text-[24px] font-medium tracking-normal text-muted">Not reported</span>}</p>
          <p className="mt-1.5 text-[13.5px] text-ink-2">
            {f.budget !== null ? <>Budget {facts.budgetText}</> : "Budget not reported"}
            {facts.multiple !== null && (
              <>
                {" · "}
                <b className="tabular font-semibold text-ink">{multiple(facts.multiple)}</b> {facts.multiple >= 1 ? "its budget" : "of its budget"}
              </>
            )}
          </p>
          {f.gross !== null && f.budget !== null && <MoneyBar gross={f.gross} budget={f.budget} color={OUTCOME_VAR[f.outcome]} />}
          <p className="mt-3 text-[12px] text-muted">Worldwide, all languages, as reported; not audited.</p>
        </Fact>
      </section>

      <FocusProvider>
        <div className="mt-16">
          <ChartFrame
            id="sits"
            title="Where it sits"
            finding={sitsFinding(f, neighbours[0], ledger.byDirector.get(f.director?.slug ?? "")?.length ?? 0, sameYear.length)}
            legend={<OutcomeLegend />}
            source={<Source>Every strip shares one timeline, 2000 to today · the outlined mark is this film</Source>}
          >
            <WhereItSits
              slug={f.slug}
              rows={rows}
              year={f.year}
              yearFilms={sameYear.map(toDot)}
              yearLabel={
                <div>
                  <Link href={`/releases?year=${f.year}`} className="tabular text-[15px] font-semibold text-ink hover:text-accent">
                    {f.year}
                  </Link>
                  <p className="tabular mt-0.5 text-[12px] text-muted">{plural(sameYear.length, "tracked film")}</p>
                </div>
              }
              end={end}
              partialFrom={partialFrom}
              pos={yearPos(f.date, f.year)}
            />
          </ChartFrame>
        </div>
      </FocusProvider>

      <section className="mt-20 grid gap-x-14 gap-y-12 lg:grid-cols-2">
        <div>
          <SectionTitle title={`Best of ${f.year}`} finding={yearRank > 0 ? `${f.title} ranks ${yearRank === 1 ? "first" : `#${yearRank}`} of ${yearScored.length} scored films that year.` : `The top films of ${f.year} by film score.`} />
          {yearTop.length ? (
            <ol className="divide-y divide-rule border-y border-rule">
              {yearScored.slice(0, 6).map((x, i) => (
                <li key={x.slug} className={`grid grid-cols-[28px_1fr_auto] items-center gap-3 py-2.5 ${x.slug === f.slug ? "-mx-2 rounded-md bg-accent-wash px-2" : ""}`}>
                  <span className="tabular text-[12.5px] text-muted">{i + 1}</span>
                  <span className="min-w-0">
                    {x.slug === f.slug ? (
                      <span className="inline-flex items-baseline gap-1.5 font-semibold text-ink">
                        <MiniMark o={x.outcome} className="relative top-[1px] self-center" />
                        {x.title}
                        <span className="text-[12px] font-normal text-muted max-sm:hidden">this film</span>
                      </span>
                    ) : (
                      <FilmToken slug={x.slug} title={x.title} o={x.outcome} showYear={false} className="text-[14.5px]" />
                    )}
                    <span className="block truncate text-[12.5px]">
                      {x.heroes.map((h, j) => (
                        <span key={h.slug}>
                          <HeroToken slug={h.slug} name={h.name} face={false} className="!font-normal !text-muted hover:!text-accent" />
                          {j < x.heroes.length - 1 && <span className="text-faint">, </span>}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="tabular text-[14px] font-semibold text-ink">{(x.score as number).toFixed(1)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] text-muted">No other film from {f.year} has a score yet.</p>
          )}
        </div>
        <div>
          <SectionTitle title="Before and after" finding={neighbours.length === 1 ? `Film ${neighbours[0].n} of ${neighbours[0].of} for ${neighbours[0].hero.name}.` : "The films either side of it in each lead's career."} />
          <div className="space-y-6">
            {neighbours.map((n) => (
              <div key={n.hero.slug}>
                {neighbours.length > 1 && (
                  <p className="mb-2 text-[13px] text-muted">
                    <HeroToken slug={n.hero.slug} name={n.hero.name} size={18} /> <span className="tabular">· film {n.n} of {n.of}</span>
                  </p>
                )}
                <div className="grid grid-cols-2 border-y border-rule">
                  <Neighbour f={n.prev} dir="prev" />
                  <Neighbour f={n.next} dir="next" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-16 border-t border-rule pt-4 text-[12.5px] leading-relaxed text-muted">
        <p>
          Sources: {facts.source ? <>result from {facts.source.label.replace(/^Reported gross ÷ budget \(Wikipedia\)$/, "reported gross ÷ budget")}</> : "no reported result"}
          {facts.wiki && (
            <>
              {" · "}
              <a href={facts.wiki} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-rule underline-offset-2 hover:text-ink">
                Wikipedia article ↗
              </a>
            </>
          )}
          {" · "}film score is our own 0–100 score of how audiences rate, find and keep returning to a film ·{" "}
          <Link href="/methodology" className="underline decoration-rule underline-offset-2 hover:text-ink">
            Method
          </Link>{" "}
          ·{" "}
          <Link href="/annexure/corrections" className="underline decoration-rule underline-offset-2 hover:text-ink">
            Suggest a correction
          </Link>
        </p>
      </footer>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-rule py-6 max-md:[&+&]:border-t md:px-8 md:first:pl-0 md:last:pr-0 md:[&+&]:border-l">
      <p className="label mb-3">{label}</p>
      {children}
    </div>
  );
}

function markStyle(f: FilmAtom) {
  const c = OUTCOME_VAR[f.outcome];
  if (f.outcome === "hit" || f.outcome === "blockbuster") return { background: c };
  if (f.outcome === "average") return { background: `linear-gradient(to top, ${c} 50%, transparent 50%)`, boxShadow: `inset 0 0 0 1.5px ${c}` };
  if (f.outcome === "flop" || f.outcome === "disaster") return { boxShadow: `inset 0 0 0 1.5px ${c}` };
  return { boxShadow: `inset 0 0 0 1.5px ${c}`, opacity: 0.7 };
}

/** Budget and gross on one linear scale: the budget as a dashed tick, the gross as a bar in the outcome colour. */
function MoneyBar({ gross, budget, color }: { gross: number; budget: number; color: string }) {
  const max = Math.max(gross, budget) * 1.04;
  const g = (gross / max) * 100;
  const b = (budget / max) * 100;
  return (
    <div className="mt-4" aria-hidden>
      <div className="relative h-3 rounded-[3px] bg-surface-2">
        <span className="absolute inset-y-0 left-0 rounded-[3px]" style={{ width: `${g}%`, background: color }} />
        <span className="absolute -top-1 h-5 border-l-[1.5px] border-dashed border-ink" style={{ left: `${b}%` }} />
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-muted">
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.min(88, Math.max(12, b))}%` }}>
          budget
        </span>
      </div>
    </div>
  );
}

function Neighbour({ f, dir }: { f: FilmAtom | null; dir: "prev" | "next" }) {
  return (
    <div className={`min-w-0 py-3 ${dir === "next" ? "border-l border-rule pl-4 text-right" : "pr-4"}`}>
      <p className="label mb-1">{dir === "prev" ? "← Before" : "After →"}</p>
      {f ? (
        <>
          <FilmToken slug={f.slug} title={f.title} o={f.outcome} showYear={false} className="text-[14.5px]" />
          <p className="tabular mt-0.5 text-[12px] text-muted">
            {f.date ? date(f.date) : f.year} · {resultText(f)}
            {f.gross !== null ? ` · ${inr(f.gross)}` : ""}
          </p>
        </>
      ) : (
        <p className="text-[13.5px] text-muted">{dir === "prev" ? "His first tracked film" : "His latest film"}</p>
      )}
    </div>
  );
}

function sitsFinding(f: FilmAtom, n: { hero: { name: string }; n: number; of: number } | undefined, dirFilms: number, yearCount: number) {
  const parts: string[] = [];
  if (n) parts.push(`film ${n.n} of ${n.of} for ${n.hero.name}`);
  if (f.director && dirFilms > 1) parts.push(`one of ${dirFilms} by ${f.director.name}`);
  parts.push(`one of ${yearCount} tracked films of ${f.year}`);
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
