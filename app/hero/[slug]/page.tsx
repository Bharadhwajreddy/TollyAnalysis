import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { HeroYearChart } from "@/components/hero/hero-year-chart";
import { HeroFilmsTable, type FilmRowView } from "@/components/hero/hero-films-table";
import { DemoBadge } from "@/components/ui/badges";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { FAMILY_GROUPS, groupOf } from "@/lib/constants/groups";
import { formatMetric, METRICS } from "@/lib/constants/metrics";
import { HERO_PHOTOS } from "@/lib/constants/photos";
import { socialHandles } from "@/lib/data/real/load";
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
  { title: "Audience and popularity", keys: ["avgRating", "xFollowers", "igFollowers"] },
  { title: "Combined scores (formula-based)", keys: ["hpi", "filmSuccess", "consistency", "momentum", "socialReach"] },
];

const COMPARE: HeroMetricKey[] = ["overallSuccessRatio", "hits", "totalGross", "topGross", "bigFilms", "films", "peakFilms", "releaseGap", "recentSuccessRatio", "xFollowers", "hpi"];

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

  const rows: FilmRowView[] = films.map((f) => ({
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
    verdict: f.scoringStatus === "not_yet_final" ? "recent" : (f.commercial.label ?? "unknown"),
    // Show the sentence only when the verdict was read from it; otherwise the calculation.
    verdictWhy: f.commercial.basis === "trade_verdict" ? (f.details?.verdictSentence ?? f.commercial.reason) : f.commercial.reason,
    billing: f.details?.billing ?? null,
    coLeads: f.coLeads,
    rating: f.audience?.rating ?? null,
    wiki: f.details?.wikiArticle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(f.details.wikiArticle.replace(/ /g, "_"))}` : null,
    wikidata: f.details?.wikidataId ? `https://www.wikidata.org/wiki/${f.details.wikidataId}` : null,
    isDemo: f.isDemo,
  }));

  const count = (v: string) => rows.filter((r) => r.verdict === v).length;
  const verdicts = [
    { key: "blockbuster", label: "Blockbusters", n: count("blockbuster"), color: "#1f7a3d" },
    { key: "hit", label: "Hits", n: count("hit"), color: "#6aa84f" },
    { key: "average", label: "Average", n: count("average"), color: "#d9a441" },
    { key: "flop", label: "Flops", n: count("flop"), color: "#c0504d" },
    { key: "unknown", label: "Result unknown", n: count("unknown") + count("recent"), color: "#d8d0c6" },
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

  const biggest = [...rows].filter((r) => r.gross).sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0))[0];
  const bestMultiple = [...rows].filter((r) => r.multiple).sort((a, b) => (b.multiple ?? 0) - (a.multiple ?? 0))[0];
  const latest = rows[0];
  const first = rows[rows.length - 1];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="pt-5">
        <Link href="/" className="text-sm font-medium text-wine hover:underline">
          ← All heroes
        </Link>
      </div>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <HeroAvatar name={hero.name} photo={hero.photo} industry={hero.industry} color={color} size={120} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">{hero.name}</h1>
            {data.mode === "demo" && <DemoBadge />}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[12.5px]">
            <Chip>{hero.eligible} films as lead since 2000</Chip>
            {hero.debutYear && <Chip>First lead role: {hero.debutYear}</Chip>}
            {hero.firstYear && <Chip>Counted films: {hero.firstYear}–{hero.lastYear}</Chip>}
            {family && family.key !== "other" && <Chip color={family.color}>{family.label}</Chip>}
            {hero.isEmerging && <Chip>Newcomer</Chip>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
            {handles?.x?.username && (
              <a href={`https://x.com/${handles.x.username}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wine">
                X @{handles.x.username}
                {handles.x.followers ? ` · ${(handles.x.followers / 1e6).toFixed(1)}M followers (${handles.x.date})` : ""}
              </a>
            )}
            {handles?.instagram?.username && (
              <a href={`https://www.instagram.com/${handles.instagram.username}/`} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wine">
                Instagram @{handles.instagram.username}
                {handles.instagram.followers ? ` · ${(handles.instagram.followers / 1e6).toFixed(1)}M` : ""}
              </a>
            )}
            {person.wikiArticle && (
              <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(person.wikiArticle.replace(/ /g, "_"))}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wine">
                Wikipedia
              </a>
            )}
          </div>
          {credit && (
            <p className="mt-1 text-[11px] text-muted">
              Photo: {credit.author}, {credit.license === "See file page" ? "free licence" : credit.license},{" "}
              <a href={credit.page} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                Wikimedia Commons
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Highlights */}
      <section aria-label="Highlights" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Highlight label="Biggest film" main={biggest ? formatMetric("topGross", biggest.gross) : "—"} sub={biggest?.title ?? "no reported gross"} />
        <Highlight label="Best return on budget" main={bestMultiple ? `${bestMultiple.multiple}× budget` : "—"} sub={bestMultiple?.title ?? "needs budget and gross"} />
        <Highlight label="Latest film" main={latest?.title ?? "—"} sub={latest?.releaseDate ?? ""} small />
        <Highlight label="First counted film" main={first?.title ?? "—"} sub={first?.releaseDate ?? ""} small />
      </section>

      {/* All statistics */}
      <section aria-labelledby="stats" className="mt-6">
        <h2 id="stats" className="text-xl font-semibold text-ink">All statistics</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">Rank is out of all heroes with enough data for that number. “—” means not enough data (never zero).</p>
        <div className="mt-3 space-y-4">
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <h3 className="eyebrow mb-2">{sec.title}</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {sec.keys.map((k) => {
                  const r = rankOf(k);
                  const mv = hero.m[k];
                  return (
                    <div key={k} className="card p-3 sm:p-4" title={METRICS[k].definition}>
                      <p className="text-xs font-medium text-ink-2">{METRICS[k].label}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatMetric(k, mv.v)}</p>
                      <p className="text-xs text-muted">{r ? `#${r.rank} of ${r.of} heroes` : mv.v === null ? "not enough data" : "too few films to rank"}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">{mv.e}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Verdicts */}
        <section className="card p-4 sm:p-5" aria-labelledby="verdicts">
          <h2 id="verdicts" className="text-lg font-semibold text-ink">Box-office results</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Blockbuster = 3× budget or more · Hit = 2–3× · Average = 1–2× · Flop = under 1× (or as reported).</p>
          <div className="mt-4 flex h-6 overflow-hidden rounded-md" role="img" aria-label={verdicts.map((v) => `${v.label}: ${v.n}`).join(", ")}>
            {verdicts.filter((v) => v.n).map((v) => (
              <div key={v.key} style={{ width: `${(v.n / Math.max(1, rows.length)) * 100}%`, background: v.color }} className="border-r-2 border-surface last:border-0" />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
            {verdicts.map((v) => (
              <li key={v.key} className="flex items-center gap-2">
                <span aria-hidden className="h-3 w-3 rounded-sm" style={{ background: v.color }} />
                <span className="text-ink-2">{v.label}</span>
                <span className="tabular ml-auto font-semibold text-ink">{v.n}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Year by year */}
        <section className="card p-4 sm:p-5" aria-labelledby="yby">
          <h2 id="yby" className="text-lg font-semibold text-ink">Year by year</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Films released each year and how many were hits.</p>
          <div className="mt-3">
            <HeroYearChart rows={yearRows} name={hero.name} />
          </div>
        </section>
      </div>

      {/* Compared with others */}
      <section className="card mt-4 p-4 sm:p-5" aria-labelledby="vs">
        <h2 id="vs" className="text-lg font-semibold text-ink">Compared with other heroes</h2>
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
                <span className="text-[13px] leading-tight text-ink-2" title={meta.definition}>{meta.label}</span>
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

      {/* Every film */}
      <section className="card mt-4 p-4 sm:p-5" aria-labelledby="films">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="films" className="text-lg font-semibold text-ink">Every film ({rows.length})</h2>
          <span className="text-xs text-muted">Tap a column to sort · scroll sideways for more columns</span>
        </div>
        <HeroFilmsTable rows={rows} heroName={hero.name} />
      </section>

      {excluded.length > 0 && (
        <details className="card mt-4 p-4 sm:p-5">
          <summary className="cursor-pointer text-[15px] font-semibold text-ink">Appearances not counted ({excluded.length})</summary>
          <p className="mt-1 text-[13px] text-ink-2">Cameos, supporting roles, other-language and unreleased films are listed here but do not count in any number.</p>
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
      <p className={`mt-1 font-semibold tracking-tight text-ink ${small ? "line-clamp-2 text-lg" : "text-2xl"}`}>{main}</p>
      <p className="truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
