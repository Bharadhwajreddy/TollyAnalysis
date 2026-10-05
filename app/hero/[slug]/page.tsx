import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroStarBreakdown } from "@/components/dashboard/star-breakdown";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { HeroYearChart } from "@/components/hero/hero-year-chart";
import { HeroFilmsTable, type FilmRowView } from "@/components/hero/hero-films-table";
import { DemoBadge } from "@/components/ui/badges";
import { Collapsible } from "@/components/ui/collapsible";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import type { StarPart } from "@/lib/calculations/star";
import { FAMILY_GROUPS, groupOf } from "@/lib/constants/groups";
import { formatMetric, METRICS } from "@/lib/constants/metrics";
import { HERO_PHOTOS } from "@/lib/constants/photos";
import { socialHandles } from "@/lib/data/real/load";
import { REPORTED_INSTAGRAM } from "@/lib/data/real/reported-social";
import { getDashboardData, getHeroExcluded, getHeroFilms, getPerson } from "@/lib/repositories";
import { rankable } from "@/lib/ranking";

export async function generateMetadata(props: PageProps<"/hero/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPerson(slug);
  return { title: p ? p.displayName : "Hero not found" };
}

const SECTIONS: { title: string; keys: HeroMetricKey[] }[] = [
  { title: "Box office", keys: ["hits", "overallSuccessRatio", "blockbusters", "recentSuccessRatio", "totalGross", "topGross", "avgGross", "bigFilms"] },
  { title: "Films and release pace", keys: ["films", "filmsPerYear", "peakFilms", "releaseGap", "yearsActive"] },
  { title: "Audience and popularity", keys: ["xFollowers", "igFollowers", "socialReach", "avgRating"] },
  { title: "Combined scores (formula-based)", keys: ["starScore", "consistency", "momentum", "filmSuccess"] },
];

const COMPARE: HeroMetricKey[] = ["starScore", "overallSuccessRatio", "hits", "totalGross", "topGross", "bigFilms", "films", "peakFilms", "releaseGap", "recentSuccessRatio", "xFollowers", "socialReach"];

/** Finer reported verdicts shown in the film table. */
const VERDICT_TEXT: Record<string, string> = {
  blockbuster: "Blockbuster",
  super_hit: "Super hit",
  hit: "Hit",
  above_average: "Above average",
  average: "Average",
  below_average: "Below average",
  flop: "Flop",
  disaster: "Disaster",
};
const SOURCE_TEXT: Record<string, string> = {
  "wikipedia-film": "Wikipedia film article",
  "wikipedia-hero": "Wikipedia hero article",
  "telugu-wikipedia": "Telugu Wikipedia",
  "trade-blog": "Trade blog (low confidence)",
};

export default async function HeroPage(props: PageProps<"/hero/[slug]">) {
  const { slug } = await props.params;
  const person = await getPerson(slug);
  if (!person) notFound();
  const [data, films, excluded] = await Promise.all([getDashboardData(), getHeroFilms(slug), getHeroExcluded(slug)]);
  const hero = data.windows.all_time.find((h) => h.slug === slug);
  if (!hero) notFound();
  const cohort = data.windows.all_time.filter((h) => !h.isEmerging || h.slug === slug);
  const color = groupOf(hero, "era").color;
  const family = FAMILY_GROUPS.find((g) => g.key === hero.family);
  const handles = data.mode === "real" ? socialHandles(slug) : null;
  const igReported = data.mode === "real" ? REPORTED_INSTAGRAM.followers[slug] : undefined;
  const credit = HERO_PHOTOS[slug];

  const rankOf = (key: HeroMetricKey) => {
    const meta = METRICS[key];
    if (!rankable(hero, key)) return null;
    const vals = cohort.filter((h) => rankable(h, key));
    const v = hero.m[key].v as number;
    const better = vals.filter((h) => (meta.higherIsBetter ? (h.m[key].v as number) > v : (h.m[key].v as number) < v)).length;
    return { rank: better + 1, of: vals.length };
  };
  const medianOf = (key: HeroMetricKey) => {
    const v = cohort.map((h) => h.m[key].v).filter((x): x is number => x !== null).sort((a, b) => a - b);
    if (!v.length) return null;
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  };

  const rows: FilmRowView[] = films.map((f) => {
    const recent = f.scoringStatus === "not_yet_final";
    const ott = f.route === "ott" && !f.commercial.label;
    const verdict = recent ? "recent" : ott ? "ott" : (f.commercial.label ?? "unknown");
    const src = f.details?.verdictSource ?? null;
    return {
      id: f.filmId,
      title: f.title,
      releaseDate: f.releaseDate,
      approximate: f.details?.dateApproximate ?? false,
      year: f.year,
      director: f.details?.director ?? null,
      music: f.details?.music ?? null,
      runtimeMin: f.details?.runtimeMin ?? null,
      genres: f.details?.genres ?? [],
      languages: f.details?.languages ?? [f.originalLanguage.toUpperCase()],
      budget: f.commercial.budgetCrore,
      gross: f.commercial.grossCrore,
      budgetText: f.details?.budgetText ?? null,
      grossText: f.details?.grossText ?? null,
      multiple: f.commercial.multiple,
      verdict,
      verdictText: recent ? "Too recent" : ott ? "Direct to OTT" : f.commercial.verdict ? VERDICT_TEXT[f.commercial.verdict] : f.commercial.label ? VERDICT_TEXT[f.commercial.label] : "Not reported",
      // Show the sentence only when the verdict was read from it; otherwise the calculation.
      verdictWhy: f.commercial.basis === "trade_verdict" ? (f.details?.verdictSentence ?? f.commercial.reason) : f.commercial.label ? f.commercial.reason : null,
      verdictSource: f.commercial.basis === "trade_verdict" && src ? SOURCE_TEXT[src] : f.commercial.basis === "gross_to_budget" ? "Gross ÷ budget (Wikipedia)" : null,
      verdictUrl: f.commercial.basis === "trade_verdict" ? (f.details?.verdictUrl ?? null) : null,
      billing: f.details?.billing ?? null,
      coLeads: f.coLeads,
      rating: f.audience?.rating ?? null,
      wiki: f.details?.wikiArticle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(f.details.wikiArticle.replace(/ /g, "_"))}` : null,
      wikidata: f.details?.wikidataId ? `https://www.wikidata.org/wiki/${f.details.wikidataId}` : null,
      isDemo: f.isDemo,
    };
  });

  const count = (v: string) => rows.filter((r) => r.verdict === v).length;
  const known = rows.filter((r) => ["blockbuster", "hit", "average", "flop"].includes(r.verdict)).length;
  const verdicts = [
    { key: "blockbuster", label: "Blockbuster", n: count("blockbuster"), color: "#1f7a3d" },
    { key: "hit", label: "Hit", n: count("hit"), color: "#6aa84f" },
    { key: "average", label: "Average", n: count("average"), color: "#d9a441" },
    { key: "flop", label: "Flop", n: count("flop"), color: "#c0504d" },
    { key: "ott", label: "Direct to OTT", n: count("ott"), color: "#8fb8c4" },
    { key: "unknown", label: "Not reported / too recent", n: count("unknown") + count("recent"), color: "#d8d0c6" },
  ];
  const years = new Map<number, { year: number; hit: number; miss: number; unknown: number }>();
  for (const r of rows) {
    if (!r.year) continue;
    const e = years.get(r.year) ?? { year: r.year, hit: 0, miss: 0, unknown: 0 };
    if (r.verdict === "hit" || r.verdict === "blockbuster") e.hit++;
    else if (r.verdict === "average" || r.verdict === "flop") e.miss++;
    else e.unknown++;
    years.set(r.year, e);
  }
  const yearRows = [];
  if (hero.firstYear && hero.lastYear)
    for (let y = hero.firstYear; y <= hero.lastYear; y++) yearRows.push(years.get(y) ?? { year: y, hit: 0, miss: 0, unknown: 0 });

  const dated = rows.filter((r) => r.releaseDate);
  const biggest = [...rows].filter((r) => r.gross).sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0))[0];
  const bestMultiple = [...rows].filter((r) => r.multiple).sort((a, b) => (b.multiple ?? 0) - (a.multiple ?? 0))[0];
  const latest = dated[0];
  const first = dated[dated.length - 1];
  const firstHit = [...dated].reverse().find((r) => r.verdict === "hit" || r.verdict === "blockbuster");
  const firstBlockbuster = [...dated].reverse().find((r) => r.verdict === "blockbuster");
  const milestones = [
    first && { kicker: "First counted release", film: first, note: "Earliest dated lead film since 2000." },
    firstHit && { kicker: "First hit", film: firstHit, note: "Earliest film labelled hit or blockbuster." },
    firstBlockbuster && firstBlockbuster !== firstHit && { kicker: "First blockbuster", film: firstBlockbuster, note: "Earliest film labelled blockbuster." },
    biggest && { kicker: "Highest reported gross", film: biggest, note: `${formatMetric("topGross", biggest.gross)} worldwide (all languages).` },
    latest && { kicker: "Latest counted release", film: latest, note: "Most recent dated lead film." },
  ].filter((x): x is { kicker: string; film: FilmRowView; note: string } => !!x);

  const sr = hero.m.overallSuccessRatio;
  const starRaw = (p: StarPart) => {
    if (p.raw === null) return "—";
    switch (p.key) {
      case "successRatio":
        return `${formatMetric("overallSuccessRatio", p.raw)} success`;
      case "recentSuccess":
        return `${formatMetric("recentSuccessRatio", p.raw)} of latest films`;
      case "hits":
        return `${p.raw} hits`;
      case "blockbusters":
        return `${p.raw} blockbusters`;
      case "totalGross":
        return `${formatMetric("totalGross", p.raw)} total`;
      case "topGross":
        return `${formatMetric("topGross", p.raw)} biggest`;
      case "avgGross":
        return `${formatMetric("avgGross", p.raw)} per film`;
      case "films":
        return `${p.raw} films`;
      case "socialReach":
        return `reach ${Math.round(p.raw)}/100`;
      default:
        return `${p.raw} points`;
    }
  };
  const sectionNav = [
    ["star", "Star Score"],
    ["facts", "Career facts"],
    ["milestones", "Milestones"],
    ["results", "Results by year"],
    ["peers", "Peer context"],
    ["stats", "All measures"],
    ["films", "Film evidence"],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="pt-5">
        <Link href="/heroes" className="text-sm font-medium text-wine hover:underline">
          ← All heroes
        </Link>
      </div>

      {/* Banner */}
      <section className="cinema mt-4 overflow-hidden rounded-2xl">
        <div className="grid lg:grid-cols-[1fr_300px]">
          <div className="px-5 py-7 sm:px-9 sm:py-9">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c79c]">Career atlas / Individual profile</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-[40px] font-bold leading-none tracking-tight text-white sm:text-[60px]">{hero.name}</h1>
              {data.mode === "demo" && <DemoBadge />}
            </div>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#e6d9cf]">
              {hero.eligible} lead films from {hero.firstYear ?? "—"} to {hero.lastYear ?? "—"}. {known} of them have a reported box-office result
              {hero.ott ? `, ${hero.ott} went straight to OTT` : ""}. Every film below links to the source its result was read from.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <BannerStat label="Star Score" value={formatMetric("starScore", hero.m.starScore.v)} note={hero.m.starScore.v === null ? "not enough data" : rankLabel(rankOf("starScore"))} />
              <BannerStat label="Success ratio" value={formatMetric("overallSuccessRatio", sr.v)} note={sr.v === null ? "no known results" : `${hero.m.hits.v} hits out of ${sr.n} films with a known result`} />
              <BannerStat label="Reported box office" value={formatMetric("totalGross", hero.m.totalGross.v)} note={hero.m.totalGross.v === null ? "no reported gross" : `${hero.m.totalGross.n} films with a reported gross`} />
              <BannerStat label="Blockbusters" value={formatMetric("blockbusters", hero.m.blockbusters.v)} note={hero.m.blockbusters.v === null ? "no known results" : `among ${hero.m.blockbusters.n} judged films`} />
            </div>
          </div>
          <div className="relative hidden min-h-[260px] lg:block">
            {hero.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.photo} alt={`${hero.name}`} className="absolute inset-0 h-full w-full object-cover object-top" />
            ) : (
              <div className="grid h-full place-items-center">
                <HeroAvatar name={hero.name} photo={null} industry={hero.industry} color={color} size={140} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#241a18] via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* Facts line */}
      <div id="facts" className="mt-3 flex scroll-mt-24 flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px]">
        <span className="lg:hidden">
          <HeroAvatar name={hero.name} photo={hero.photo} industry={hero.industry} color={color} size={48} />
        </span>
        {hero.debutYear && <Chip>Recorded debut: {hero.debutYear}</Chip>}
        {hero.firstYear && (
          <Chip>
            Counted releases: {hero.firstYear}–{hero.lastYear}
          </Chip>
        )}
        {family && family.key !== "other" && <Chip color={family.color}>{family.label}</Chip>}
        {hero.isEmerging && <Chip>Newcomer</Chip>}
        {handles?.x?.username && (
          <a href={`https://x.com/${handles.x.username}`} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline underline-offset-2">
            X @{handles.x.username}
            {handles.x.followers ? ` · ${(handles.x.followers / 1e6).toFixed(1)}M followers (${handles.x.date})` : ""}
          </a>
        )}
        {(handles?.instagram?.username || igReported) && (
          <a
            href={handles?.instagram?.username ? `https://www.instagram.com/${handles.instagram.username}/` : REPORTED_INSTAGRAM.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-wine underline underline-offset-2"
          >
            Instagram{handles?.instagram?.username ? ` @${handles.instagram.username}` : ""}
            {igReported ? ` · ${(igReported / 1e6).toFixed(1)}M followers (reported ${REPORTED_INSTAGRAM.date})` : ""}
          </a>
        )}
        {person.wikiArticle && (
          <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(person.wikiArticle.replace(/ /g, "_"))}`} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline underline-offset-2">
            Wikipedia ↗
          </a>
        )}
        {credit && (
          <span className="text-[11px] text-muted">
            Photo: {credit.author}, {credit.license === "See file page" ? "free licence" : credit.license} ·{" "}
            <a href={credit.page} target="_blank" rel="noopener noreferrer nofollow" className="underline">
              Wikimedia Commons
            </a>
          </span>
        )}
      </div>

      {/* Section nav */}
      <nav aria-label="Profile sections" className="scroll-x sticky top-14 z-30 mt-4 flex gap-1 border-y border-line bg-bg/95 py-1 backdrop-blur sm:top-16">
        {sectionNav.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:bg-surface hover:text-wine">
            {label}
          </a>
        ))}
        <Link href={`/compare?heroes=${slug}`} className="whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:bg-surface hover:text-wine">
          Compare ↗
        </Link>
      </nav>

      {/* Star Score breakdown */}
      <section id="star" className="card mt-5 scroll-mt-32 p-4 sm:p-6" aria-labelledby="star-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Everything in one number</p>
            <h2 id="star-title" className="mt-1 font-serif text-[24px] font-semibold text-ink">
              Star Score: <span className="text-wine">{formatMetric("starScore", hero.m.starScore.v)}</span>
            </h2>
            <p className="mt-0.5 max-w-2xl text-[13px] text-ink-2">
              Each part is scored out of 100 against the other heroes, then weighted. Parts without data are left out and their weight is shared out —
              never counted as zero. {hero.m.starScore.e}
            </p>
          </div>
          <p className="tabular text-[13px] text-muted">{rankLabel(rankOf("starScore"))}</p>
        </div>
        <div className="mt-3">
          <HeroStarBreakdown parts={hero.star} raw={starRaw} />
        </div>
      </section>

      {/* Highlights */}
      <section aria-labelledby="hl" className="mt-6">
        <p className="section-kicker">Career overview</p>
        <h2 id="hl" className="mt-1 font-serif text-[24px] font-semibold text-ink">Highlights from the record</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Highlight label="Highest reported gross" main={biggest ? formatMetric("topGross", biggest.gross) : "—"} sub={biggest?.title ?? "no reported gross"} />
          <Highlight label="Highest gross ÷ budget" main={bestMultiple ? `${bestMultiple.multiple}×` : "—"} sub={bestMultiple?.title ?? "needs budget and gross"} />
          <Highlight label="Latest dated film" main={latest?.title ?? "—"} sub={latest?.releaseDate ?? ""} small />
          <Highlight label="Earliest dated film" main={first?.title ?? "—"} sub={first?.releaseDate ?? ""} small />
        </div>
        <p className="mt-2 text-xs text-muted">Reported worldwide grosses cover all languages and may be incomplete. Gross ÷ budget is a descriptive ratio, not profit.</p>
      </section>

      {/* Milestones */}
      {milestones.length > 0 && (
        <section id="milestones" className="card mt-4 scroll-mt-32 p-4 sm:p-6" aria-labelledby="ms">
          <p className="section-kicker">Dated counted films</p>
          <h2 id="ms" className="mt-1 font-serif text-[22px] font-semibold text-ink">Career milestones</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {milestones.map((ms) => (
              <li key={ms.kicker} className="relative border-t-2 border-wine/40 pt-3">
                <span aria-hidden className="absolute -top-[7px] left-0 h-3 w-3 rounded-full border-2 border-wine bg-surface" />
                <p className="tabular text-[13px] font-semibold text-ink">{ms.film.releaseDate?.slice(0, 4)}</p>
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-wine">{ms.kicker}</p>
                <p className="mt-1 font-semibold text-ink">{ms.film.title}</p>
                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${badgeClass(ms.film.verdict)}`}>{ms.film.verdictText}</span>
                <p className="mt-1 text-[12px] text-muted">{ms.note}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div id="results" className="mt-4 grid scroll-mt-32 gap-4 lg:grid-cols-2">
        {/* Verdicts */}
        <section className="card p-4 sm:p-6" aria-labelledby="verdicts">
          <p className="section-kicker">Film result labels</p>
          <h2 id="verdicts" className="mt-1 font-serif text-[22px] font-semibold text-ink">Results across counted films</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Reported verdict first; otherwise worldwide gross ÷ budget (3× Blockbuster · 2× Hit · 1× Average · under 1× Flop).</p>
          <div className="mt-4 flex h-6 overflow-hidden rounded-md" role="img" aria-label={verdicts.map((v) => `${v.label}: ${v.n}`).join(", ")}>
            {verdicts
              .filter((v) => v.n)
              .map((v) => (
                <div key={v.key} style={{ width: `${(v.n / Math.max(1, rows.length)) * 100}%`, background: v.color }} className="border-r-2 border-surface last:border-0" />
              ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
            {verdicts.map((v) => (
              <li key={v.key} className="flex items-center gap-2">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ background: v.color }} />
                <span className="text-ink-2">{v.label}</span>
                <span className="tabular ml-auto font-semibold text-ink">{v.n}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Year by year */}
        <section className="card p-4 sm:p-6" aria-labelledby="yby">
          <p className="section-kicker">Release record</p>
          <h2 id="yby" className="mt-1 font-serif text-[22px] font-semibold text-ink">Year by year</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Films released each year and how many were hits.</p>
          <div className="mt-3">
            <HeroYearChart rows={yearRows} name={hero.name} />
          </div>
        </section>
      </div>

      {/* Compared with others */}
      <section id="peers" className="card mt-4 scroll-mt-32 p-4 sm:p-6" aria-labelledby="vs">
        <p className="section-kicker">Peer context</p>
        <h2 id="vs" className="mt-1 font-serif text-[22px] font-semibold text-ink">Compared with other heroes</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">The black tick is the middle hero (median). Green ▲ = better than most, red ▼ = worse.</p>
        <ul className="mt-4 grid gap-x-8 gap-y-3 lg:grid-cols-2">
          {COMPARE.filter((k) => cohort.some((h) => h.m[k].v !== null)).map((k) => {
            const meta = METRICS[k];
            const v = hero.m[k].v;
            const med = medianOf(k);
            const max = meta.domainMax ?? Math.max(1, ...cohort.map((h) => h.m[k].v ?? 0)) * 1.05;
            const better = v !== null && med !== null && (meta.higherIsBetter ? v >= med : v <= med);
            return (
              <li key={k} className="grid grid-cols-[130px_1fr_92px] items-center gap-3 sm:grid-cols-[170px_1fr_100px]">
                <span className="text-[13px] leading-tight text-ink-2" title={meta.definition}>
                  {meta.label}
                </span>
                <span className="relative h-3 rounded-full bg-surface-2 ring-1 ring-line">
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v === null ? 0 : Math.min(100, (v / max) * 100)}%`, background: color }} />
                  {med !== null && <span className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `calc(${Math.min(100, (med / max) * 100)}% - 1px)` }} />}
                </span>
                <span className="tabular text-right text-[13px] font-semibold text-ink">
                  {formatMetric(k, v)}
                  {v !== null && med !== null && <span className={`ml-1 text-[10px] ${better ? "text-good" : "text-bad"}`}>{better ? "▲" : "▼"}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* All statistics */}
      <div id="stats" className="mt-4 scroll-mt-32">
        <Collapsible title={`All statistics (${SECTIONS.reduce((a, s) => a + s.keys.length, 0)})`} subtitle="Every value, its rank, its definition and the sample behind it">
          <p className="text-[13px] text-ink-2">Rank is out of all heroes with enough data for that number. “—” means not enough data (never zero).</p>
          <div className="mt-3 space-y-4">
            {SECTIONS.map((sec) => (
              <div key={sec.title}>
                <h3 className="eyebrow mb-2">{sec.title}</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {sec.keys.map((k) => {
                    const r = rankOf(k);
                    const mv = hero.m[k];
                    return (
                      <div key={k} className="rounded-lg border border-line bg-surface p-3" title={METRICS[k].definition}>
                        <p className="text-xs font-medium text-ink-2">{METRICS[k].label}</p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatMetric(k, mv.v)}</p>
                        <p className="text-xs text-muted">{r ? `#${r.rank} of ${r.of} heroes` : mv.v === null ? "not enough data" : "too few films to rank"}</p>
                        <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted">{mv.e}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Collapsible>
      </div>

      {/* Every film */}
      <section id="films" className="card mt-4 scroll-mt-32 p-4 sm:p-6" aria-labelledby="films-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="section-kicker">Underlying records</p>
            <h2 id="films-title" className="mt-1 font-serif text-[24px] font-semibold text-ink">
              Every counted film ({rows.length})
            </h2>
          </div>
          <span className="text-xs text-muted">Sort a column, filter by result, or open a row for its evidence.</span>
        </div>
        <HeroFilmsTable rows={rows} heroName={hero.name} />
      </section>

      {excluded.length > 0 && (
        <details className="card mt-4 p-4 sm:p-5">
          <summary className="cursor-pointer text-[15px] font-semibold text-ink">Appearances not counted ({excluded.length})</summary>
          <p className="mt-1 text-[13px] text-ink-2">Cameos, supporting and antagonist roles, other-language and unreleased films are listed here but do not count in any number.</p>
          <ul className="mt-3 divide-y divide-line text-[13px]">
            {excluded.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 py-1.5">
                <span className="tabular w-10 text-muted">{e.year ?? "—"}</span>
                <span className="font-medium text-ink">{e.title}</span>
                <span className="text-muted">{e.reason.replace(/^Excluded: /, "")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/compare?heroes=${slug}`} className="rounded-md border border-line bg-surface px-3 py-2 font-medium text-ink hover:border-ink-2">
          Compare {hero.name} with others
        </Link>
        <Link href={`/annexure/corrections?hero=${encodeURIComponent(hero.name)}`} className="rounded-md border border-line bg-surface px-3 py-2 font-medium text-ink hover:border-ink-2">
          Suggest a correction
        </Link>
        <Link href="/#how" className="rounded-md border border-line bg-surface px-3 py-2 font-medium text-ink hover:border-ink-2">
          How these numbers are calculated
        </Link>
      </div>
    </div>
  );
}

function rankLabel(r: { rank: number; of: number } | null) {
  return r ? `#${r.rank} of ${r.of} heroes` : "too few films to rank";
}

function badgeClass(v: string) {
  return v === "blockbuster" || v === "hit"
    ? "bg-[#e3f2e6] text-good"
    : v === "average"
      ? "bg-[#fbf3e4] text-warn"
      : v === "flop"
        ? "bg-[#fcefee] text-bad"
        : "bg-surface-2 text-muted";
}

function BannerStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-3">
      <p className="text-[12px] text-[#d9c9bd]">{label}</p>
      <p className="tabular mt-1 text-[26px] font-semibold leading-none tracking-tight text-white sm:text-[30px]">{value}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-[#c9b8ab]">{note}</p>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-ink-2">
      {color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

function Highlight({ label, main, sub, small = false }: { label: string; main: string; sub: string; small?: boolean }) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className={`mt-1 font-semibold tracking-tight text-wine ${small ? "line-clamp-2 font-serif text-lg text-ink" : "text-2xl"}`}>{main}</p>
      <p className="truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
