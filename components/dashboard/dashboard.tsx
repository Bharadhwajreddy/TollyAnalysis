"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { ERA_GROUPS, FAMILY_GROUPS, groupOf, type ColourBy } from "@/lib/constants/groups";
import { AXIS_METRICS, axisLabel, formatMetric, LEADERBOARD_METRICS, METRICS, MIN_SAMPLE_NOTE, WINDOW_LABEL } from "@/lib/constants/metrics";
import type { FilterWindow } from "@/lib/domain/types";
import type { DashboardData, HeroView } from "@/lib/view-models";
import { ParetoChart } from "@/components/charts/pareto-chart";
import { RankedBars, type BarDatum } from "@/components/charts/ranked-bars";
import { useHeroActivate } from "@/components/charts/use-hero-activate";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { DemoBadge } from "@/components/ui/badges";
import { ChartCard } from "@/components/ui/chart-card";
import { Collapsible } from "@/components/ui/collapsible";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { HeroTable } from "./hero-table";
import { GroupLegend, MetricTooltip, competitionRanks, rankable, rankBy } from "./shared";
import { StarWeights } from "./star-breakdown";

const WINDOWS: FilterWindow[] = ["all_time", "last_5_years", "last_10_films"];
/** Measures offered as buttons; the rest sit in "More measures". */
const PRIMARY: HeroMetricKey[] = ["starScore", "overallSuccessRatio", "hits", "blockbusters", "totalGross"];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function Dashboard({ data, children }: { data: DashboardData; children?: ReactNode }) {
  const router = useRouter();
  const [period, setPeriod] = useState<FilterWindow>("all_time");
  const [includeEmerging, setIncludeEmerging] = useState(false);
  const [search, setSearch] = useState("");
  const [colourBy, setColourBy] = useState<ColourBy>("era");
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const colorOf = useCallback((h: HeroView) => groupOf(h, colourBy).color, [colourBy]);
  const [leaderMetric, setLeaderMetric] = useState<HeroMetricKey>("starScore");
  const [leaderAll, setLeaderAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const open = useCallback((slug: string) => router.push(`/hero/${slug}`), [router]);
  const activate = useHeroActivate(setSelected, open);

  const roster = useMemo(() => data.windows[period].filter((h) => includeEmerging || !h.isEmerging), [data, period, includeEmerging]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((h) => !hiddenGroups.has(groupOf(h, colourBy).key) && (!q || h.name.toLowerCase().includes(q)));
  }, [roster, hiddenGroups, colourBy, search]);
  const selectedHero = visible.find((h) => h.slug === selected) ?? null;

  const groups = useMemo(() => {
    const present = new Set(roster.map((h) => groupOf(h, colourBy).key));
    return (colourBy === "era" ? ERA_GROUPS : FAMILY_GROUPS).filter((g) => present.has(g.key));
  }, [roster, colourBy]);
  const toggleGroup = (k: string) =>
    setHiddenGroups((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const hasData = (k: HeroMetricKey) => visible.some((h) => h.m[k].v !== null);

  const toBars = useCallback(
    (heroes: HeroView[], key: HeroMetricKey, ranks?: Map<string, { label: string }>): BarDatum[] =>
      heroes.map((h) => ({
        id: h.slug,
        label: h.name,
        value: h.m[key].v as number,
        display: formatMetric(key, h.m[key].v, METRICS[key].unit !== "/100"),
        color: colorOf(h),
        photo: h.photo,
        industry: h.industry,
        selected: h.slug === selected,
        lowSample: h.m[key].s === "low_sample",
        rank: ranks?.get(h.slug)?.label,
        tooltip: <MetricTooltip hero={h} metric={key} color={colorOf(h)} />,
      })),
    [selected, colorOf],
  );

  const kpi = (key: HeroMetricKey) => rankBy(visible, key)[0] ?? null;
  const leaderRanked = rankBy(visible, leaderMetric);
  const leaderRanks = competitionRanks(leaderRanked, leaderMetric);
  const TOP = 10;
  const featured = rankBy(data.windows.all_time.filter((h) => h.photo && !h.isEmerging), "starScore").slice(0, 3);
  const moreMeasures = LEADERBOARD_METRICS.filter((k) => !PRIMARY.includes(k) && hasData(k));
  const leaderTitle = `${METRICS[leaderMetric].label}${METRICS[leaderMetric].unit === "%" ? " (%)" : ""}`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Banner */}
      <section className="cinema relative mt-4 overflow-hidden rounded-2xl px-5 py-8 sm:mt-6 sm:px-9 sm:py-11">
        <div className="relative z-[1] grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c79c]">Telugu cinema · The career benchmark</p>
            <h1 className="mt-3 font-serif text-[34px] font-bold leading-[1.05] tracking-tight text-white sm:text-[52px]">Compare Telugu cinema careers</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#e6d9cf]">
              Hits, flops, box office, release pace and social reach for {data.windows.all_time.filter((h) => !h.isEmerging).length} Telugu heroes. Films
              from 2000 onwards, every number linked to its source.
            </p>
          </div>
          {featured.length > 0 && (
            <ul className="flex justify-center gap-3 sm:gap-4 lg:justify-end" aria-label="Top heroes by Star Score">
              {featured.map((h, i) => (
                <li key={h.slug} className={i === 1 ? "z-[2] -translate-y-2" : i === 0 ? "rotate-[-4deg]" : "rotate-[4deg]"}>
                  <Link
                    href={`/hero/${h.slug}`}
                    className="group block w-[104px] overflow-hidden rounded-xl border-2 border-[#8a5a4a] bg-night-2 shadow-2xl transition-transform hover:-translate-y-1 sm:w-[150px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.photo!} alt="" className="aspect-[4/5] w-full object-cover object-top" />
                    <span className="block px-2 py-2 text-center">
                      <span className="block truncate text-[13px] font-semibold text-white">{h.name} ↗</span>
                      <span className="tabular block text-[11px] text-[#e8c79c]">Star Score {formatMetric("starScore", h.m.starScore.v, false)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Filters */}
      <div className="card mt-4 flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative block">
            <span className="sr-only">Search hero by name</span>
            <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a hero"
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-muted sm:w-56"
            />
          </label>
          <Segmented label="Period" value={period} onChange={setPeriod} options={WINDOWS.map((w) => ({ value: w, label: WINDOW_LABEL[w] }))} />
          <Toggle checked={includeEmerging} onChange={setIncludeEmerging} label="Include newcomers (1–2 films)" />
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
            Colour by
            <Segmented
              label="Colour bars by"
              value={colourBy}
              onChange={(v) => {
                setColourBy(v);
                setHiddenGroups(new Set());
              }}
              options={[
                { value: "era", label: "Debut era" },
                { value: "family", label: "Film family" },
              ]}
            />
          </label>
        </div>
        <span className="tabular text-xs text-muted">
          {visible.length} of {data.windows[period].length} heroes
        </span>
      </div>

      {/* Snapshot line */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-3 text-xs text-muted">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {data.mode === "demo" ? (
            <DemoBadge />
          ) : (
            <span className="rounded-full border border-[#b9dcc4] bg-[#eef7f1] px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-good">
              {data.mode === "real" ? "PUBLIC-SOURCE SNAPSHOT" : "LIVE"}
            </span>
          )}
          <span>Snapshot {fmtDate(data.calculatedAt)}</span>
          <a href="#how" className="font-semibold text-wine underline underline-offset-2">How we calculate</a>
        </span>
        <nav aria-label="On this page" className="flex gap-4 text-[13px] text-ink-2">
          <a href="#leaderboard" className="hover:text-wine">Rankings</a>
          <a href="#deep-dive" className="hover:text-wine">Career patterns</a>
          <a href="#table" className="hover:text-wine">All the numbers</a>
        </nav>
      </div>
      {data.mode === "demo" && (
        <p className="mt-2 max-w-3xl text-xs text-muted">
          Demo data: names and photos are real, but every film and number is made up so the charts can be checked. Nothing here is a factual claim yet.
        </p>
      )}

      {/* Headline numbers */}
      <section aria-label="Headline numbers" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Heroes compared" value={String(visible.length)} note={includeEmerging ? "including newcomers" : "with 3 or more films"} accent="#a3846f" />
        <KpiHero label="Top Star Score" hero={kpi("starScore")} metric="starScore" onOpen={open} accent="#7a1f3d" />
        <KpiHero label="Most hit films" hero={kpi("hits")} metric="hits" onOpen={open} accent="#2a78d6" />
        <KpiHero label="Largest reported gross" hero={kpi("totalGross")} metric="totalGross" onOpen={open} accent="#eb6834" note="reported gross" />
      </section>

      <p className="mt-4 rounded-lg bg-wine-soft px-3 py-2 text-[13px] text-wine">
        <strong>Tip:</strong> tap a hero&apos;s photo or bar to highlight him in every chart. <strong>Double-tap</strong> (or double-click) to open his own page.
      </p>

      <div className="mt-4 space-y-4">
        {/* Leaderboard */}
        <ChartCard
          id="leaderboard"
          title={leaderTitle}
          subtitle={
            <>
              {METRICS[leaderMetric].definition}{" "}
              <strong className="font-semibold">{METRICS[leaderMetric].higherIsBetter ? "Higher is better." : "Lower is better."}</strong>
              {METRICS[leaderMetric].minSample ? ` ${MIN_SAMPLE_NOTE(METRICS[leaderMetric].minSample!)}` : ""}
            </>
          }
          count={`${leaderAll ? leaderRanked.length : Math.min(TOP, leaderRanked.length)} of ${visible.length} heroes`}
          controls={
            <div className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="What to rank by">
                  {PRIMARY.filter(hasData).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={leaderMetric === k}
                      onClick={() => setLeaderMetric(k)}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                        leaderMetric === k ? "border-wine bg-wine text-white" : "border-line bg-surface text-ink hover:border-ink-2"
                      }`}
                    >
                      {METRICS[k].short}
                    </button>
                  ))}
                  <label className="relative">
                    <span className="sr-only">More measures</span>
                    <select
                      value={PRIMARY.includes(leaderMetric) ? "" : leaderMetric}
                      onChange={(e) => e.target.value && setLeaderMetric(e.target.value as HeroMetricKey)}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${
                        PRIMARY.includes(leaderMetric) ? "border-line bg-surface text-ink" : "border-wine bg-wine text-white"
                      }`}
                    >
                      <option value="">More measures…</option>
                      {moreMeasures.map((k) => (
                        <option key={k} value={k}>
                          {METRICS[k].short}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Segmented
                  label="How many heroes"
                  value={leaderAll ? "all" : "top"}
                  onChange={(v) => setLeaderAll(v === "all")}
                  options={[
                    { value: "top", label: `Top ${TOP}` },
                    { value: "all", label: "All" },
                  ]}
                />
              </div>
              {leaderMetric === "starScore" && (
                <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                  <p className="mb-2 text-[12px] font-semibold text-ink-2">What goes into the Star Score</p>
                  <StarWeights />
                </div>
              )}
            </div>
          }
          legend={
            <>
              <p className="mb-2 text-xs text-muted">Tied ranks share a place; the next rank skips the tied entries.</p>
              <GroupLegend
                groups={groups}
                hidden={hiddenGroups}
                onToggle={toggleGroup}
                note={colourBy === "era" ? "Colour shows when the hero got his first lead role. Tap a colour to hide it." : "Colour shows the film family. Tap a colour to hide it."}
              />
            </>
          }
        >
          <RankedBars
            data={toBars(leaderAll ? leaderRanked : leaderRanked.slice(0, TOP), leaderMetric, leaderRanks)}
            ariaLabel={`${METRICS[leaderMetric].label} ranking`}
            domainMax={METRICS[leaderMetric].domainMax}
            orientation={leaderAll && leaderRanked.length > 30 ? "horizontal" : "auto"}
            onActivate={activate}
          />
        </ChartCard>

        {/* Side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TopList title="Most hit films" metric="hits" heroes={visible} toBars={toBars} onActivate={activate} />
          <TopList title="Total reported box office" metric="totalGross" heroes={visible} toBars={toBars} onActivate={activate} />
        </div>

        {/* Career atlas */}
        <section className="rounded-2xl border border-line bg-[linear-gradient(100deg,#f6e9ed,#faf6ef_55%,#f3eadf)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="section-kicker">01 / Career atlas</p>
              <h2 className="mt-1 font-serif text-[21px] font-semibold text-ink">Start with a career</h2>
              <p className="text-[13px] text-ink-2">Open any hero for every film, every number and its source.</p>
            </div>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {featured.map((h) => (
                <li key={h.slug}>
                  <Link href={`/hero/${h.slug}`} className="flex items-center gap-2 text-[14px] font-semibold text-ink hover:text-wine">
                    <HeroAvatar name={h.name} photo={h.photo} industry={h.industry} size={38} />
                    {h.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/heroes" className="self-start whitespace-nowrap rounded-full bg-wine px-4 py-2 text-[14px] font-semibold text-white hover:bg-wine-hover md:self-auto">
              Explore all heroes
            </Link>
          </div>
        </section>

        {/* Go deeper */}
        <section id="deep-dive" className="scroll-mt-24 space-y-4 pt-4">
          <div>
            <p className="section-kicker">02 / Go deeper</p>
            <h2 className="mt-1 font-serif text-[26px] font-semibold text-ink sm:text-[30px]">What makes a career stand out?</h2>
            <p className="text-[14px] text-ink-2">Trade-offs, box office, release pace and recent form.</p>
          </div>

          <ParetoCard id="pareto-1" heroes={visible} selected={selected} colorOf={colorOf} onActivate={activate} initialX="films" initialY="overallSuccessRatio" title="More films vs. more success" />

          <Collapsible title="Box office scale" subtitle="₹100-crore films and biggest reported gross">
            <div className="grid gap-4 lg:grid-cols-2">
              <SmallRanking title="Most ₹100-crore films" metric="bigFilms" heroes={visible} toBars={toBars} onActivate={activate} bare />
              <SmallRanking title="Biggest single film (₹ crore)" metric="topGross" heroes={visible} toBars={toBars} onActivate={activate} bare />
            </div>
          </Collapsible>

          <Collapsible title="Release pace" subtitle="Peak year and shortest gap between releases">
            <div className="grid gap-4 lg:grid-cols-2">
              <SmallRanking title="Most films in a single year" metric="peakFilms" heroes={visible} toBars={toBars} onActivate={activate} bare />
              <SmallRanking title="Shortest gap between films (months)" metric="releaseGap" heroes={visible} toBars={toBars} onActivate={activate} bare />
            </div>
          </Collapsible>

          <ParetoCard id="pareto-2" heroes={visible} selected={selected} colorOf={colorOf} onActivate={activate} initialX="avgGross" initialY="overallSuccessRatio" title="Bigger films vs. more hits" />

          <Collapsible title="Recent form" subtitle="Success across the latest five films and blockbuster count">
            <div className="grid gap-4 lg:grid-cols-2">
              <SmallRanking title="Best recent success (last 5 films, %)" metric="recentSuccessRatio" heroes={visible} toBars={toBars} onActivate={activate} domainMax={100} bare />
              <SmallRanking title="Most blockbusters" metric="blockbusters" heroes={visible} toBars={toBars} onActivate={activate} bare />
            </div>
          </Collapsible>

          <Collapsible title="Career reach" subtitle="Lead films and social media followers">
            <div className="grid gap-4 lg:grid-cols-2">
              <SmallRanking title="Most films as lead hero (since 2000)" metric="films" heroes={visible} toBars={toBars} onActivate={activate} bare />
              {hasData("xFollowers") && <SmallRanking title="X (Twitter) followers (millions)" metric="xFollowers" heroes={visible} toBars={toBars} onActivate={activate} bare />}
              {hasData("igFollowers") && <SmallRanking title="Instagram followers (millions)" metric="igFollowers" heroes={visible} toBars={toBars} onActivate={activate} bare />}
              {hasData("socialReach") && <SmallRanking title="Social media reach (out of 100)" metric="socialReach" heroes={visible} toBars={toBars} onActivate={activate} domainMax={100} bare />}
              {hasData("avgRating") && <SmallRanking title="Best audience rating (out of 10)" metric="avgRating" heroes={visible} toBars={toBars} onActivate={activate} domainMax={10} bare />}
            </div>
          </Collapsible>
        </section>

        {/* Table */}
        <ChartCard id="table" title="Every hero, every metric" subtitle={`${WINDOW_LABEL[period]} · the full comparison`} count={`${visible.length} heroes`}>
          <HeroTable heroes={visible} selected={selected} colorOf={colorOf} onActivate={activate} csvMeta={{ mode: data.mode, methodologyId: data.methodologyId, window: period }} />
        </ChartCard>

        {children}
      </div>

      {/* Selection bar */}
      {selectedHero && (
        <div className="pointer-events-none sticky bottom-3 z-30 mt-4 flex justify-center">
          <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-line bg-surface/95 py-1.5 pl-1.5 pr-1.5 text-[13px] shadow-lg backdrop-blur">
            <HeroAvatar name={selectedHero.name} photo={selectedHero.photo} industry={selectedHero.industry} color={colorOf(selectedHero)} size={34} />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{selectedHero.name}</span>
              <span className="tabular block truncate text-[11.5px] text-muted">
                Star Score {formatMetric("starScore", selectedHero.m.starScore.v, false)} · {formatMetric("hits", selectedHero.m.hits.v)} hits ·{" "}
                {formatMetric("overallSuccessRatio", selectedHero.m.overallSuccessRatio.v)} success
              </span>
            </span>
            <Link href={`/hero/${selectedHero.slug}`} className="whitespace-nowrap rounded-full bg-wine px-3 py-1.5 font-semibold text-white hover:bg-wine-hover">
              Open page →
            </Link>
            <button type="button" onClick={() => setSelected(null)} aria-label="Clear selection" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type ToBars = (h: HeroView[], k: HeroMetricKey, ranks?: Map<string, { label: string }>) => BarDatum[];

/** Top five with photos; "View all" opens the full ranked list. */
function TopList({ title, metric, heroes, toBars, onActivate }: { title: string; metric: HeroMetricKey; heroes: HeroView[]; toBars: ToBars; onActivate: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const ranked = rankBy(heroes, metric);
  if (!ranked.length) return null;
  const ranks = competitionRanks(ranked, metric);
  return (
    <ChartCard
      title={title}
      subtitle={
        <>
          {METRICS[metric].definition} <strong className="font-semibold">{METRICS[metric].higherIsBetter ? "Higher is better." : "Lower is better."}</strong>
        </>
      }
      count={`${all ? ranked.length : Math.min(5, ranked.length)} of ${ranked.length}`}
      footer={
        ranked.length > 5 ? (
          <button type="button" onClick={() => setAll((v) => !v)} className="border-b-2 border-wine pb-0.5 text-[14px] font-semibold text-wine">
            {all ? "Show top 5" : `View all ${ranked.length}`}
          </button>
        ) : undefined
      }
    >
      <RankedBars data={toBars(all ? ranked : ranked.slice(0, 5), metric, ranks)} ariaLabel={title} orientation="horizontal" onActivate={onActivate} />
    </ChartCard>
  );
}

function SmallRanking({
  title,
  metric,
  heroes,
  toBars,
  onActivate,
  domainMax,
  bare = false,
}: {
  title: string;
  metric: HeroMetricKey;
  heroes: HeroView[];
  toBars: ToBars;
  onActivate: (id: string) => void;
  domainMax?: number;
  bare?: boolean;
}) {
  const ranked = rankBy(heroes, metric).slice(0, 10);
  if (!ranked.length) return null;
  const ranks = competitionRanks(ranked, metric);
  const subtitle = (
    <>
      {METRICS[metric].definition} <strong className="font-semibold">{METRICS[metric].higherIsBetter ? "Higher is better." : "Lower is better."}</strong>
      {METRICS[metric].minSample ? ` ${MIN_SAMPLE_NOTE(METRICS[metric].minSample!)}` : ""}
    </>
  );
  const chart = <RankedBars data={toBars(ranked, metric, ranks)} ariaLabel={title} orientation="horizontal" domainMax={domainMax} onActivate={onActivate} />;
  if (bare)
    return (
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mb-3 mt-0.5 text-[12.5px] text-ink-2">{subtitle}</p>
        {chart}
      </div>
    );
  return (
    <ChartCard title={title} subtitle={subtitle} count="Top 10">
      {chart}
    </ChartCard>
  );
}

function ParetoCard({
  id,
  title,
  heroes,
  selected,
  colorOf,
  onActivate,
  initialX,
  initialY,
}: {
  id: string;
  title: string;
  heroes: HeroView[];
  selected: string | null;
  colorOf: (h: HeroView) => string;
  onActivate: (id: string) => void;
  initialX: HeroMetricKey;
  initialY: HeroMetricKey;
}) {
  const [x, setX] = useState<HeroMetricKey>(initialX);
  const [y, setY] = useState<HeroMetricKey>(initialY);
  const [find, setFind] = useState("");
  const plotted = useMemo(() => heroes.filter((h) => rankable(h, x) && rankable(h, y)), [heroes, x, y]);
  const points = useMemo(() => {
    const order = new Map(rankBy(plotted, y).map((h, i) => [h.slug, i]));
    return plotted.map((h) => ({
      id: h.slug,
      label: h.name,
      photo: h.photo,
      x: h.m[x].v as number,
      y: h.m[y].v as number,
      color: colorOf(h),
      selected: h.slug === selected,
      priority: order.get(h.slug) ?? 999,
      tooltip: (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <HeroAvatar name={h.name} photo={h.photo} industry={h.industry} color={colorOf(h)} size={34} />
            <span className="font-semibold text-ink">{h.name}</span>
          </div>
          <p className="tabular flex justify-between gap-3 text-ink-2"><span>{METRICS[x].label}</span><strong className="text-ink">{formatMetric(x, h.m[x].v)}</strong></p>
          <p className="tabular flex justify-between gap-3 text-ink-2"><span>{METRICS[y].label}</span><strong className="text-ink">{formatMetric(y, h.m[y].v)}</strong></p>
          <p className="font-medium text-wine">Double-tap to open his page</p>
        </div>
      ),
    }));
  }, [plotted, x, y, selected, colorOf]);
  const found = plotted.filter((h) => !find.trim() || h.name.toLowerCase().includes(find.trim().toLowerCase()));

  const axisOptions = AXIS_METRICS.filter((k) => heroes.some((h) => h.m[k].v !== null)).map((k) => ({ value: k, label: METRICS[k].label }));
  const select = (label: string, value: HeroMetricKey, onChange: (v: HeroMetricKey) => void) => (
    <label className="flex min-w-0 items-center gap-2 text-[13px] text-ink-2 md:w-[300px]">
      <span className="w-12 shrink-0 font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as HeroMetricKey)}
        className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] font-medium text-ink"
      >
        {axisOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ChartCard
      id={id}
      title={title}
      subtitle="Each photo is a hero. The line joins the heroes nobody beats on both measures at once — the best trade-off (Pareto) line."
      count={`${points.length} heroes`}
      controls={
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          {select("Across", x, setX)}
          {select("Up", y, setY)}
          <button
            type="button"
            onClick={() => {
              setX(y);
              setY(x);
            }}
            className="shrink-0 rounded-md border border-line px-3 py-1.5 text-[13px] font-medium text-ink hover:border-ink-2"
            aria-label="Swap axes"
          >
            ⇄ Swap axes
          </button>
        </div>
      }
      footer={
        <>
          Across: {METRICS[x].definition} Up: {METRICS[y].definition} A few leaders are labelled; search below to find every plotted hero.
          {[x, y].some((k) => METRICS[k].minSample) && ` Heroes with too few films to judge are left out.`}
        </>
      }
    >
      <ParetoChart
        data={points}
        xLabel={`${axisLabel(x)} →`}
        yLabel={`${axisLabel(y)} →`}
        xMax={METRICS[x].domainMax}
        yMax={METRICS[y].domainMax}
        xHigherIsBetter={METRICS[x].higherIsBetter}
        yHigherIsBetter={METRICS[y].higherIsBetter}
        onActivate={onActivate}
        ariaLabel={`${METRICS[x].label} against ${METRICS[y].label}`}
      />
      <details className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2">
        <summary className="text-[13px] font-semibold text-ink">Find a hero · values for both measures</summary>
        <input
          type="search"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="Search plotted heroes"
          aria-label="Search plotted heroes"
          className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm"
        />
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
          {found.map((h) => (
            <li key={h.slug}>
              <Link href={`/hero/${h.slug}`} className="font-medium text-ink hover:text-wine">{h.name}</Link>{" "}
              <span className="tabular text-[12px] text-muted">
                {METRICS[x].short}: {formatMetric(x, h.m[x].v)} · {METRICS[y].short}: {formatMetric(y, h.m[y].v)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </ChartCard>
  );
}

function Kpi({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <div className="card border-l-4 p-3 sm:p-4" style={{ borderLeftColor: accent }}>
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{note}</p>
    </div>
  );
}

function KpiHero({
  label,
  hero,
  metric,
  onOpen,
  accent,
  note,
}: {
  label: string;
  hero: HeroView | null;
  metric: HeroMetricKey;
  onOpen: (slug: string) => void;
  accent: string;
  note?: string;
}) {
  if (!hero) return <Kpi label={label} value="—" note="not enough data" accent={accent} />;
  return (
    <button
      type="button"
      onClick={() => onOpen(hero.slug)}
      className="card flex items-center gap-3 border-l-4 p-3 text-left transition-shadow hover:shadow-md sm:p-4"
      style={{ borderLeftColor: accent }}
    >
      <HeroAvatar name={hero.name} photo={hero.photo} industry={hero.industry} size={44} />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-ink-2">{label}</span>
        <span className="block text-xl font-semibold tracking-tight text-wine sm:text-2xl">{formatMetric(metric, hero.m[metric].v)}</span>
        <span className="block truncate text-xs text-muted">
          {hero.name}
          {note ? ` · ${note}` : ""}
        </span>
      </span>
    </button>
  );
}
