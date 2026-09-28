import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroYearChart } from "@/components/hero/hero-year-chart";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { DemoBadge } from "@/components/ui/badges";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { formatMetric, INDUSTRY_LABEL, METRICS } from "@/lib/constants/metrics";
import { HERO_PHOTOS } from "@/lib/constants/photos";
import { getDashboardData, getHeroFilms, getMethodology, getPerson } from "@/lib/repositories";

export async function generateMetadata(props: PageProps<"/hero/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPerson(slug);
  return { title: p ? p.displayName : "Hero not found" };
}

const TILES: HeroMetricKey[] = ["films", "hits", "overallSuccessRatio", "avgRating", "recentSuccessRatio", "peakFilms", "releaseGap", "hpi"];
const COMPARE: HeroMetricKey[] = [
  "overallSuccessRatio",
  "hits",
  "films",
  "avgRating",
  "recentSuccessRatio",
  "peakFilms",
  "filmsPerYear",
  "releaseGap",
  "consistency",
  "socialReach",
  "hpi",
];

const RESULT: Record<string, { label: string; cls: string }> = {
  hit: { label: "Hit", cls: "bg-[#eef7f1] text-good" },
  miss: { label: "Not a hit", cls: "bg-surface-2 text-ink-2" },
  unknown: { label: "Not enough data", cls: "bg-surface-2 text-muted" },
  recent: { label: "Too recent", cls: "bg-teal-soft text-[#00596a]" },
};

export default async function HeroPage(props: PageProps<"/hero/[slug]">) {
  const { slug } = await props.params;
  const person = await getPerson(slug);
  if (!person) notFound();
  const [data, films, m] = await Promise.all([getDashboardData(), getHeroFilms(slug), getMethodology()]);
  const hero = data.windows.all_time.find((h) => h.slug === slug);
  if (!hero) notFound();
  const cohort = data.windows.all_time.filter((h) => !h.isEmerging || h.slug === slug);

  const rankOf = (key: HeroMetricKey) => {
    const meta = METRICS[key];
    const vals = cohort.filter((h) => h.m[key].v !== null);
    const v = hero.m[key].v;
    if (v === null) return null;
    const better = vals.filter((h) => (meta.higherIsBetter ? (h.m[key].v as number) > v : (h.m[key].v as number) < v)).length;
    return { rank: better + 1, of: vals.length };
  };
  const medianOf = (key: HeroMetricKey) => {
    const v = cohort.map((h) => h.m[key].v).filter((x): x is number => x !== null).sort((a, b) => a - b);
    if (!v.length) return null;
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  };

  const resultOf = (f: (typeof films)[number]) =>
    f.scoringStatus === "not_yet_final"
      ? "recent"
      : f.filmSuccessScore === null
        ? "unknown"
        : f.filmSuccessScore >= m.successThreshold
          ? "hit"
          : "miss";

  const years = new Map<number, { year: number; hit: number; miss: number; unknown: number }>();
  for (const f of films) {
    if (!f.year) continue;
    const e = years.get(f.year) ?? { year: f.year, hit: 0, miss: 0, unknown: 0 };
    const r = resultOf(f);
    if (r === "hit") e.hit++;
    else if (r === "miss") e.miss++;
    else e.unknown++;
    years.set(f.year, e);
  }
  const yearRows = [];
  if (hero.firstYear && hero.lastYear)
    for (let y = hero.firstYear; y <= hero.lastYear; y++) yearRows.push(years.get(y) ?? { year: y, hit: 0, miss: 0, unknown: 0 });

  const credit = HERO_PHOTOS[slug];
  const color = INDUSTRY_COLOR[hero.industry];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="pt-5">
        <Link href="/" className="text-sm font-medium text-wine hover:underline">
          ← All heroes
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <HeroAvatar name={hero.name} photo={hero.photo} industry={hero.industry} size={112} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">{hero.name}</h1>
            {data.mode === "demo" && <DemoBadge />}
          </div>
          <p className="mt-1 text-[15px] text-ink-2">
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: color }} aria-hidden />
            {INDUSTRY_LABEL[hero.industry]} · {hero.firstYear ?? "—"}–{hero.lastYear ?? "—"} · {hero.eligible} films as lead
            {hero.dubbed > 0 && ` (${hero.dubbed} dubbed in Telugu)`}
            {hero.isEmerging && " · newcomer"}
          </p>
          {credit && (
            <p className="mt-1 text-[11px] text-muted">
              Photo: {credit.author}, {credit.license},{" "}
              <a href={credit.page} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                Wikimedia Commons
              </a>
            </p>
          )}
        </div>
      </div>

      <section aria-label="Key numbers" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map((k) => {
          const r = rankOf(k);
          return (
            <div key={k} className="card p-3 sm:p-4">
              <p className="text-xs font-medium text-ink-2">{METRICS[k].label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatMetric(k, hero.m[k].v)}</p>
              <p className="text-xs text-muted">{r ? `#${r.rank} of ${r.of} heroes` : "not enough data"}</p>
            </div>
          );
        })}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5" aria-labelledby="vs">
          <h2 id="vs" className="text-lg font-semibold text-ink">Compared with other heroes</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">The black tick is the middle hero (median). Green ▲ = better than most, red ▼ = worse.</p>
          <ul className="mt-4 space-y-3">
            {COMPARE.map((k) => {
              const meta = METRICS[k];
              const v = hero.m[k].v;
              const med = medianOf(k);
              const max = meta.domainMax ?? Math.max(1, ...cohort.map((h) => h.m[k].v ?? 0)) * 1.08;
              const better = v !== null && med !== null && (meta.higherIsBetter ? v >= med : v <= med);
              return (
                <li key={k} className="grid grid-cols-[130px_1fr_76px] items-center gap-3 sm:grid-cols-[170px_1fr_84px]">
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

        <section className="card p-4 sm:p-5" aria-labelledby="yby">
          <h2 id="yby" className="text-lg font-semibold text-ink">Year by year</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">How many films released each year, and how many were hits.</p>
          <div className="mt-3">
            <HeroYearChart rows={yearRows} name={hero.name} />
          </div>
        </section>
      </div>

      <section className="card mt-4 p-4 sm:p-5" aria-labelledby="films">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="films" className="text-lg font-semibold text-ink">All films ({films.length})</h2>
          <Link href={`/annexure/heroes/${slug}`} className="text-sm font-medium text-wine underline">
            Full evidence and sources →
          </Link>
        </div>
        {data.mode === "demo" && <p className="mt-1 text-xs text-muted">Demo mode: film titles below are fictional placeholders.</p>}
        <div className="scroll-x mt-3 rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-2">
              <tr>
                {["Film", "Year", "Language", "In Telugu", "Released on", "Audience rating", "Film score", "Result"].map((c) => (
                  <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {films.map((f) => {
                const r = RESULT[resultOf(f)];
                return (
                  <tr key={f.filmId} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">
                      {f.title}
                      {f.coLeads.length > 0 && <span className="block text-[11px] font-normal text-muted">with {f.coLeads.join(", ")}</span>}
                    </td>
                    <td className="tabular px-3 py-2">{f.year}</td>
                    <td className="px-3 py-2 uppercase">{f.originalLanguage}</td>
                    <td className="px-3 py-2">{f.teluguReleaseType === "dubbed" ? "Dubbed" : "Original"}</td>
                    <td className="px-3 py-2">{f.route === "ott" ? "OTT" : "Theatres"}</td>
                    <td className="tabular px-3 py-2">{f.audience ? `${f.audience.rating.toFixed(1)}/10` : "—"}</td>
                    <td className="tabular px-3 py-2">{f.filmSuccessScore ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11.5px] font-medium ${r.cls}`}>{r.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
