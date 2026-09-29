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
import { MetricPicker } from "@/components/ui/metric-picker";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { HeroTable } from "./hero-table";
import { GroupLegend, MetricTooltip, rankable, rankBy } from "./shared";

const WINDOWS: FilterWindow[] = ["all_time", "last_5_years", "last_10_films"];

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
  const [leaderMetric, setLeaderMetric] = useState<HeroMetricKey>("overallSuccessRatio");
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
    (heroes: HeroView[], key: HeroMetricKey): BarDatum[] =>
      heroes.map((h) => ({
        id: h.slug,
        label: h.name,
        value: h.m[key].v as number,
        display: formatMetric(key, h.m[key].v, METRICS[key].unit === "%" || METRICS[key].unit === " mo"),
        color: colorOf(h),
        photo: h.photo,
        industry: h.industry,
        selected: h.slug === selected,
        lowSample: h.m[key].s === "low_sample",
        tooltip: <MetricTooltip hero={h} metric={key} color={colorOf(h)} />,
      })),
    [selected, colorOf],
  );

  const kpi = (key: HeroMetricKey) => rankBy(visible, key)[0] ?? null;
  const leaderRanked = rankBy(visible, leaderMetric);
  const TOP = 15;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Heading */}
      <div className="pt-6 sm:pt-8">
        <h1 className="font-serif text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Telugu cinema heroes, compared
        </h1>
        <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
          Who delivers the most hits, the biggest box office and the most films. Telugu heroes, films released from 2000 onwards.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          {data.mode === "demo" ? (
            <DemoBadge />
          ) : (
            <span className="rounded border border-[#b9dcc4] bg-[#eef7f1] px-2 py-0.5 font-mono text-[11px] font-medium text-good">
              {data.mode === "real" ? "REAL DATA · WIKIPEDIA + WIKIDATA" : "LIVE"}
            </span>
          )}
          <span>Updated {fmtDate(data.calculatedAt)}</span>
          <span aria-hidden>·</span>
          <a href="#how" className="font-medium text-wine underline-offset-2 hover:underline">How we calculate</a>
        </div>
        {data.mode === "demo" && (
          <p className="mt-2 max-w-3xl text-xs text-muted">
            Demo data: names and photos are real, but every film and number is made up so the charts can be checked. Nothing here is a factual claim yet.
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="card mt-5 flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
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
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-muted sm:w-52"
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

      {/* Headline numbers */}
      <section aria-label="Headline numbers" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Heroes compared" value={String(visible.length)} note={includeEmerging ? "including newcomers" : "with 3 or more films"} />
        <KpiHero label="Best success ratio" hero={kpi("overallSuccessRatio")} metric="overallSuccessRatio" onOpen={open} />
        <KpiHero label="Most hits" hero={kpi("hits")} metric="hits" onOpen={open} />
        <KpiHero label="Biggest box-office total" hero={kpi("totalGross")} metric="totalGross" onOpen={open} />
      </section>

      <p className="mt-4 rounded-lg bg-wine-soft px-3 py-2 text-[13px] text-wine">
        <strong>Tip:</strong> tap a hero&apos;s photo or bar to highlight him in every chart. <strong>Double-tap</strong> (or double-click) to open his own page.
      </p>

      <div className="mt-4 space-y-4">
        {/* Leaderboard */}
        <ChartCard
          id="leaderboard"
          title={`${METRICS[leaderMetric].label}${METRICS[leaderMetric].unit === "%" ? " (%)" : ""}`}
          subtitle={
            <>
              {METRICS[leaderMetric].definition}{" "}
              <strong className="font-semibold">{METRICS[leaderMetric].higherIsBetter ? "Higher is better." : "Lower is better."}</strong>
              {METRICS[leaderMetric].minSample ? ` ${MIN_SAMPLE_NOTE(METRICS[leaderMetric].minSample!)}` : ""}
            </>
          }
          count={`${leaderAll ? leaderRanked.length : Math.min(TOP, leaderRanked.length)} of ${visible.length} heroes`}
          controls={
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <MetricPicker
                label="What to rank by"
                value={leaderMetric}
                onChange={setLeaderMetric}
                options={LEADERBOARD_METRICS.filter(hasData).map((k) => ({ value: k, label: METRICS[k].short }))}
              />
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
          }
          legend={
            <GroupLegend
              groups={groups}
              hidden={hiddenGroups}
              onToggle={toggleGroup}
              note={colourBy === "era" ? "Colour = when the hero got his first lead role. Tap a colour to hide it." : "Colour = film family. Tap a colour to hide it."}
            />
          }
        >
          <RankedBars
            data={toBars(leaderAll ? leaderRanked : leaderRanked.slice(0, TOP), leaderMetric)}
            ariaLabel={`${METRICS[leaderMetric].label} ranking`}
            domainMax={METRICS[leaderMetric].domainMax}
            orientation={leaderAll && leaderRanked.length > 30 ? "horizontal" : "auto"}
            onActivate={activate}
          />
        </ChartCard>

        {/* Side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SmallRanking title="Most hit films" metric="hits" heroes={visible} toBars={toBars} onActivate={activate} />
          <SmallRanking title="Total box office (₹ crore)" metric="totalGross" heroes={visible} toBars={toBars} onActivate={activate} />
        </div>

        <ParetoCard id="pareto-1" heroes={visible} selected={selected} colorOf={colorOf} onActivate={activate} initialX="films" initialY="overallSuccessRatio" title="More films vs. more success" />

        <div className="grid gap-4 lg:grid-cols-2">
          <SmallRanking title="Most ₹100-crore films" metric="bigFilms" heroes={visible} toBars={toBars} onActivate={activate} />
          <SmallRanking title="Biggest single film (₹ crore)" metric="topGross" heroes={visible} toBars={toBars} onActivate={activate} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SmallRanking title="Most films in a single year" metric="peakFilms" heroes={visible} toBars={toBars} onActivate={activate} />
          <SmallRanking title="Shortest gap between films (months)" metric="releaseGap" heroes={visible} toBars={toBars} onActivate={activate} />
        </div>

        <ParetoCard id="pareto-2" heroes={visible} selected={selected} colorOf={colorOf} onActivate={activate} initialX="avgGross" initialY="overallSuccessRatio" title="Bigger films vs. more hits" />

        <div className="grid gap-4 lg:grid-cols-2">
          <SmallRanking title="Best recent success (last 5 films, %)" metric="recentSuccessRatio" heroes={visible} toBars={toBars} onActivate={activate} domainMax={100} />
          <SmallRanking title="Most blockbusters" metric="blockbusters" heroes={visible} toBars={toBars} onActivate={activate} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SmallRanking title="Most films as lead hero (since 2000)" metric="films" heroes={visible} toBars={toBars} onActivate={activate} />
          {hasData("xFollowers") && <SmallRanking title="X (Twitter) followers (millions)" metric="xFollowers" heroes={visible} toBars={toBars} onActivate={activate} />}
          {hasData("avgRating") && <SmallRanking title="Best audience rating (out of 10)" metric="avgRating" heroes={visible} toBars={toBars} onActivate={activate} domainMax={10} />}
        </div>

        {/* Table */}
        <ChartCard id="table" title="All heroes" subtitle={`${WINDOW_LABEL[period]} · every number in one table`} count={`${visible.length} heroes`}>
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
                {formatMetric("films", selectedHero.m.films.v)} films · {formatMetric("hits", selectedHero.m.hits.v)} hits · {formatMetric("overallSuccessRatio", selectedHero.m.overallSuccessRatio.v)} success
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

function SmallRanking({
  title,
  metric,
  heroes,
  toBars,
  onActivate,
  domainMax,
}: {
  title: string;
  metric: HeroMetricKey;
  heroes: HeroView[];
  toBars: (h: HeroView[], k: HeroMetricKey) => BarDatum[];
  onActivate: (id: string) => void;
  domainMax?: number;
}) {
  const ranked = rankBy(heroes, metric).slice(0, 10);
  if (!ranked.length) return null;
  return (
    <ChartCard
      title={title}
      subtitle={
        <>
          {METRICS[metric].definition} <strong className="font-semibold">{METRICS[metric].higherIsBetter ? "Higher is better." : "Lower is better."}</strong>
          {METRICS[metric].minSample ? ` ${MIN_SAMPLE_NOTE(METRICS[metric].minSample!)}` : ""}
        </>
      }
      count="Top 10"
    >
      <RankedBars data={toBars(ranked, metric)} ariaLabel={title} orientation="horizontal" domainMax={domainMax} onActivate={onActivate} />
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
  const points = useMemo(() => {
    const withBoth = heroes.filter((h) => rankable(h, x) && rankable(h, y));
    const order = new Map(rankBy(withBoth, y).map((h, i) => [h.slug, i]));
    return withBoth.map((h) => ({
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
  }, [heroes, x, y, selected, colorOf]);

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
      subtitle="Each photo is a hero. The red line joins the heroes nobody beats on both at once — the best trade-off (Pareto) line."
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
            ⇄ Swap
          </button>
        </div>
      }
      footer={
        <>
          Across: {METRICS[x].definition} Up: {METRICS[y].definition} Names are shown for heroes on the line and the leaders; tap any photo to see who it is.
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
    </ChartCard>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{note}</p>
    </div>
  );
}

function KpiHero({ label, hero, metric, onOpen }: { label: string; hero: HeroView | null; metric: HeroMetricKey; onOpen: (slug: string) => void }) {
  // Ring colour here is neutral: headline tiles are independent of the colour-by setting.
  if (!hero) return <Kpi label={label} value="—" note="not enough data" />;
  return (
    <button type="button" onClick={() => onOpen(hero.slug)} className="card flex items-center gap-3 p-3 text-left transition-shadow hover:shadow-md sm:p-4">
      <HeroAvatar name={hero.name} photo={hero.photo} industry={hero.industry} size={44} />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-ink-2">{label}</span>
        <span className="block text-xl font-semibold tracking-tight text-wine sm:text-2xl">{formatMetric(metric, hero.m[metric].v)}</span>
        <span className="block truncate text-xs text-muted">{hero.name}</span>
      </span>
    </button>
  );
}
