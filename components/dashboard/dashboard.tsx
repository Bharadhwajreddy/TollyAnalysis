"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import {
  BUBBLE_METRICS,
  CADENCE_METRICS,
  formatMetric,
  LEADERBOARD_METRICS,
  METRICS,
  WINDOW_LABEL,
} from "@/lib/constants/metrics";
import type { FilterWindow, Industry } from "@/lib/domain/types";
import type { DashboardData, HeroView } from "@/lib/view-models";
import { RankedBars, type BarDatum } from "@/components/charts/ranked-bars";
import { LabelledScatter } from "@/components/charts/labelled-scatter";
import { ChartCard } from "@/components/ui/chart-card";
import { MetricPicker } from "@/components/ui/metric-picker";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { DemoBadge } from "@/components/ui/badges";
import { HeroTable } from "./hero-table";
import { IndustryLegend, MetricTooltip, rankBy } from "./shared";
import { SelectedHero } from "./selected-hero";

const WINDOWS: FilterWindow[] = ["all_time", "last_5_years", "last_10_films"];
const SECTIONS = [
  ["leaderboard", "Leaderboard"],
  ["output", "Release output"],
  ["audience", "Audience"],
  ["momentum", "Momentum"],
  ["dimensions", "Dimensions"],
  ["table", "Table"],
  ["selected", "Selected hero"],
] as const;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function Dashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [period, setPeriod] = useState<FilterWindow>("all_time");
  const [includeEmerging, setIncludeEmerging] = useState(false);
  const [search, setSearch] = useState("");
  const [hiddenIndustries, setHiddenIndustries] = useState<Set<Industry>>(new Set());
  const [leaderMetric, setLeaderMetric] = useState<HeroMetricKey>("hpi");
  const [leaderAll, setLeaderAll] = useState(false);
  const [cadenceMetric, setCadenceMetric] = useState<HeroMetricKey>("peakFilms");
  const [bubbleMetric, setBubbleMetric] = useState<HeroMetricKey>("overallSuccessRatio");
  const [compare, setCompare] = useState<string[]>([]);

  const all = data.windows[period];
  const roster = useMemo(() => all.filter((h) => includeEmerging || !h.isEmerging), [all, includeEmerging]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((h) => !hiddenIndustries.has(h.industry) && (!q || h.name.toLowerCase().includes(q)));
  }, [roster, hiddenIndustries, search]);

  const [selectedRaw, setSelected] = useState<string | null>(null);
  const byHpi = useMemo(() => rankBy(visible, "hpi"), [visible]);
  const selected = selectedRaw && visible.some((h) => h.slug === selectedRaw) ? selectedRaw : (byHpi[0]?.slug ?? null);
  const selectedHero = visible.find((h) => h.slug === selected) ?? null;

  const [userSelected, setUserSelected] = useState(false);
  const select = useCallback((slug: string) => {
    setSelected(slug);
    setUserSelected(true);
  }, []);
  const toggleCompare = useCallback(
    (slug: string) =>
      setCompare((c) => (c.includes(slug) ? c.filter((s) => s !== slug) : c.length >= 4 ? c : [...c, slug])),
    [],
  );

  const industries = useMemo(() => {
    const order: Industry[] = ["telugu", "tamil", "malayalam", "kannada", "hindi"];
    const present = new Set(roster.map((h) => h.industry));
    return order.filter((i) => present.has(i));
  }, [roster]);

  const toBars = useCallback(
    (heroes: HeroView[], key: HeroMetricKey): BarDatum[] =>
      heroes.map((h) => ({
        id: h.slug,
        label: h.name,
        value: h.m[key].v as number,
        display: formatMetric(key, h.m[key].v, key === "releaseGap"),
        color: INDUSTRY_COLOR[h.industry],
        selected: h.slug === selected,
        lowSample: h.m[key].s === "low_sample",
        tooltip: <MetricTooltip hero={h} metric={key} />,
      })),
    [selected],
  );

  // KPIs — all derived from the active filters.
  const kpis = useMemo(() => {
    const med = (v: number[]) => {
      const s = [...v].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
    };
    const ratios = visible.map((h) => h.m.overallSuccessRatio.v).filter((v): v is number => v !== null);
    const aud = visible.map((h) => h.m.audienceIndex.v).filter((v): v is number => v !== null);
    const top = byHpi[0];
    return {
      heroes: visible.length,
      credits: visible.reduce((a, h) => a + h.eligible, 0),
      medianRatio: med(ratios),
      top,
      avgAudience: aud.length ? aud.reduce((a, b) => a + b, 0) / aud.length : null,
      highCoverage: visible.filter((h) => h.confidence === "high").length,
    };
  }, [visible, byHpi]);

  const leaderRanked = rankBy(visible, leaderMetric);
  const leaderData = toBars(leaderAll ? leaderRanked : leaderRanked.slice(0, 12), leaderMetric);
  const cadenceRanked = rankBy(visible, cadenceMetric);
  const audienceRanked = rankBy(visible, "audienceIndex").slice(0, 12);
  const momentumRanked = rankBy(visible, "momentum").slice(0, 12);
  const missing = (key: HeroMetricKey) => visible.filter((h) => h.m[key].v === null).length;

  const scatterData = useMemo(() => {
    const rankOf = new Map(byHpi.map((h, i) => [h.slug, i]));
    return visible
      .filter((h) => h.m.audienceIndex.v !== null && h.m.consistency.v !== null)
      .map((h) => ({
        id: h.slug,
        label: h.name,
        x: h.m.audienceIndex.v as number,
        y: h.m.consistency.v as number,
        size: h.m[bubbleMetric].v,
        color: INDUSTRY_COLOR[h.industry],
        selected: h.slug === selected,
        priority: rankOf.get(h.slug) ?? 999,
        tooltip: (
          <div className="space-y-1">
            <MetricTooltip hero={h} metric={bubbleMetric} />
            <p className="tabular border-t border-line pt-1 text-ink-2">
              Audience {formatMetric("audienceIndex", h.m.audienceIndex.v)} · Consistency {formatMetric("consistency", h.m.consistency.v)}
            </p>
          </div>
        ),
      }));
  }, [visible, bubbleMetric, selected, byHpi]);

  const sizeVals = scatterData.map((d) => d.size).filter((v): v is number => v !== null);
  const sizeDomain: [number, number] = sizeVals.length ? [Math.min(...sizeVals), Math.max(...sizeVals)] : [0, 1];

  const totalRoster = data.windows[period].length;
  const countLabel = `${visible.length} of ${totalRoster} heroes`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* 1. Heading */}
      <div className="pt-6 sm:pt-8">
        <h1 className="font-serif text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Telugu cinema heroes, benchmarked
        </h1>
        <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
          Lead actors across Telugu-release feature films since 2000 — overall performance, audience reception, consistency,
          momentum and release cadence.
        </p>
        {/* 2. Status */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          {data.mode === "demo" ? <DemoBadge /> : <span className="rounded bg-teal-soft px-2 py-0.5 font-mono text-[11px] text-[#00596a]">LIVE</span>}
          <span>Methodology {data.methodologyName}</span>
          <span aria-hidden>·</span>
          <span>Calculated {fmtDate(data.calculatedAt)}</span>
          <span aria-hidden>·</span>
          <Link href="/methodology" className="font-medium text-wine underline-offset-2 hover:underline">
            How scores work
          </Link>
        </div>
        {data.mode === "demo" && (
          <p className="mt-2 max-w-3xl text-xs text-muted">
            Demo mode: hero names are real, but every film, rating, outcome and reach value is synthetic placeholder data for
            layout verification. Nothing here is a factual claim.
          </p>
        )}
      </div>

      {/* Section anchors */}
      <nav aria-label="Dashboard sections" className="sticky top-14 z-30 -mx-4 mt-5 border-b border-line bg-bg/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <ul className="scroll-x flex gap-1 py-2 text-[13px]">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block whitespace-nowrap rounded-md px-2.5 py-1 font-medium text-ink-2 hover:bg-surface hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 3. Filters */}
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
              placeholder="Search hero"
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-muted sm:w-52"
            />
          </label>
          <Segmented
            label="Period"
            value={period}
            onChange={setPeriod}
            options={WINDOWS.map((w) => ({ value: w, label: WINDOW_LABEL[w] }))}
          />
          <Toggle checked={includeEmerging} onChange={setIncludeEmerging} label="Include emerging heroes" />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="tabular">{countLabel}</span>
          {compare.length > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/compare?heroes=${compare.join(",")}`)}
              className="rounded-md bg-wine px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-wine-hover"
            >
              Compare {compare.length}
            </button>
          )}
        </div>
      </div>

      {/* 4. KPI cards */}
      <section aria-label="Key figures" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Eligible heroes" value={String(kpis.heroes)} note={includeEmerging ? "Incl. emerging" : "3+ lead films"} />
        <Kpi label="Lead-film credits mapped" value={kpis.credits.toLocaleString("en-IN")} note="Co-lead titles count per hero" />
        <Kpi label="Median success ratio" value={kpis.medianRatio === null ? "—" : `${Math.round(kpis.medianRatio)}%`} note="FSS ≥ 60, scored films" />
        <Kpi
          label="Highest HPI"
          value={kpis.top ? formatMetric("hpi", kpis.top.m.hpi.v) : "—"}
          note={kpis.top?.name ?? "—"}
          accent
        />
        <Kpi label="Avg audience index" value={kpis.avgAudience === null ? "—" : kpis.avgAudience.toFixed(1)} note="Confidence-adjusted" />
        <Kpi label="High evidence coverage" value={String(kpis.highCoverage)} note={`of ${kpis.heroes} heroes`} />
      </section>

      <div className="mt-4 space-y-4">
        {/* 5. Leaderboard */}
        <ChartCard
          id="leaderboard"
          title={`Hero leaderboard: ${METRICS[leaderMetric].label}`}
          subtitle={
            METRICS[leaderMetric].higherIsBetter
              ? `${WINDOW_LABEL[period]} · Higher is better`
              : `${WINDOW_LABEL[period]} · Lower is better — shortest median gap between releases ranks first`
          }
          count={`${leaderAll ? leaderRanked.length : Math.min(12, leaderRanked.length)} of ${visible.length} heroes`}
          controls={
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <MetricPicker
                label="Leaderboard metric"
                value={leaderMetric}
                onChange={setLeaderMetric}
                options={LEADERBOARD_METRICS.map((k) => ({ value: k, label: METRICS[k].short === "HPI" ? "Performance Index" : METRICS[k].short }))}
              />
              <Segmented
                label="How many heroes"
                value={leaderAll ? "all" : "top"}
                onChange={(v) => setLeaderAll(v === "all")}
                options={[
                  { value: "top", label: "Top 12" },
                  { value: "all", label: "All" },
                ]}
              />
            </div>
          }
          legend={<IndustryLegend present={industries} hidden={hiddenIndustries} onToggle={(i) => setHiddenIndustries((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />}
          footer={
            <>
              <strong className="font-semibold text-ink-2">{METRICS[leaderMetric].label}:</strong> {METRICS[leaderMetric].definition}{" "}
              Hatched bar ends mark small samples. {missing(leaderMetric) > 0 && `${missing(leaderMetric)} hero(es) hidden for insufficient evidence. `}
              <Link href="/methodology" className="text-wine hover:underline">Methodology</Link>
            </>
          }
        >
          <RankedBars
            data={leaderData}
            ariaLabel={`${METRICS[leaderMetric].label} ranking`}
            domainMax={METRICS[leaderMetric].domainMax}
            onSelect={select}
          />
        </ChartCard>

        {/* 6. Release cadence / output */}
        <ChartCard
          id="output"
          title={`Release output: ${METRICS[cadenceMetric].label}`}
          subtitle={
            METRICS[cadenceMetric].higherIsBetter
              ? "Higher means more eligible lead releases"
              : "Lower is better — fewer months between consecutive eligible releases"
          }
          count={`${cadenceRanked.length} of ${visible.length} heroes`}
          controls={
            <MetricPicker
              label="Output metric"
              value={cadenceMetric}
              onChange={setCadenceMetric}
              options={CADENCE_METRICS.map((k) => ({ value: k, label: METRICS[k].label }))}
            />
          }
          footer={<>{METRICS[cadenceMetric].definition} Calculated from eligible Telugu release dates; co-lead titles count for each lead.</>}
        >
          <RankedBars
            data={toBars(cadenceRanked.slice(0, leaderAll ? undefined : 15), cadenceMetric)}
            ariaLabel={`${METRICS[cadenceMetric].label} ranking`}
            orientation="horizontal"
            onSelect={select}
          />
        </ChartCard>

        {/* 7. Audience & momentum */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            id="audience"
            title="Audience reception leaders"
            subtitle="Audience Reception Index · Higher is better"
            count={`Top ${audienceRanked.length}`}
            footer={<>{METRICS.audienceIndex.definition}</>}
          >
            <RankedBars data={toBars(audienceRanked, "audienceIndex")} ariaLabel="Audience Reception Index ranking" orientation="horizontal" domainMax={100} onSelect={select} />
          </ChartCard>
          <ChartCard
            id="momentum"
            title="Recent career momentum"
            subtitle="Latest five scored titles vs career baseline · 50 = on baseline"
            count={`Top ${momentumRanked.length}`}
            footer={<>{METRICS.momentum.definition} Hatched = fewer than five scored recent titles.</>}
          >
            <RankedBars data={toBars(momentumRanked, "momentum")} ariaLabel="Recent Career Momentum ranking" orientation="horizontal" domainMax={100} onSelect={select} />
          </ChartCard>
        </div>

        {/* 8. Scatter */}
        <ChartCard
          id="dimensions"
          title="Performance dimensions: Audience Reception vs Consistency"
          subtitle="Up and to the right is better. Bubble size shows the selected metric. Dashed lines are roster medians."
          count={`${scatterData.length} heroes`}
          controls={
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
              <span className="text-xs font-medium text-muted">Bubble size</span>
              <MetricPicker
                label="Bubble size metric"
                value={bubbleMetric}
                onChange={setBubbleMetric}
                options={BUBBLE_METRICS.map((k) => ({ value: k, label: METRICS[k].short }))}
              />
            </div>
          }
          legend={<IndustryLegend present={industries} />}
          footer={
            <>
              X: {METRICS.audienceIndex.definition} Y: {METRICS.consistency.definition} On small screens only the top-ranked and
              selected heroes are labelled — tap a dot to reveal its name.
            </>
          }
        >
          <LabelledScatter
            data={scatterData}
            xLabel="Audience Reception Index"
            yLabel="Consistency Index"
            quadrantLabel="High reception · high consistency"
            sizeDomain={sizeDomain}
            onSelect={select}
            ariaLabel="Scatter of Audience Reception Index against Consistency Index"
          />
        </ChartCard>

        {/* 9. Table */}
        <ChartCard id="table" title="All heroes" subtitle={`${WINDOW_LABEL[period]} · sortable`} count={countLabel}>
          <HeroTable
            heroes={visible}
            selected={selected}
            onSelect={select}
            compare={compare}
            onToggleCompare={toggleCompare}
            csvMeta={{ mode: data.mode, methodologyId: data.methodologyId, window: period }}
          />
        </ChartCard>

        {/* 10. Selected hero */}
        <ChartCard id="selected" title="Selected hero" subtitle="Summary for the hero selected in any chart or table">
          <SelectedHero
            hero={selectedHero}
            cohort={visible}
            rank={selectedHero ? byHpi.findIndex((h) => h.slug === selectedHero.slug) + 1 || null : null}
            inCompare={!!selected && compare.includes(selected)}
            onToggleCompare={() => selected && toggleCompare(selected)}
            compareFull={compare.length >= 4}
          />
        </ChartCard>
      </div>

      {/* Sticky selection / compare tray */}
      {selectedHero && (userSelected || compare.length > 0) && (
        <div className="pointer-events-none sticky bottom-3 z-30 mt-4 flex justify-center lg:justify-end">
          <div className="pointer-events-auto flex max-w-full items-center gap-3 overflow-x-auto rounded-full border border-line bg-surface/95 py-1.5 pl-4 pr-1.5 text-[13px] shadow-lg backdrop-blur">
            <span className="whitespace-nowrap">
              <span className="hidden text-muted sm:inline">Selected </span>
              <a href="#selected" className="font-semibold text-wine hover:underline">{selectedHero.name}</a>
              <span className="tabular hidden text-muted sm:inline"> · HPI {formatMetric("hpi", selectedHero.m.hpi.v)}</span>
            </span>
            <button
              type="button"
              onClick={() => toggleCompare(selectedHero.slug)}
              disabled={!compare.includes(selectedHero.slug) && compare.length >= 4}
              className="whitespace-nowrap rounded-full border border-line px-3 py-1 font-medium text-ink hover:border-ink-2 disabled:opacity-50"
            >
              {compare.includes(selectedHero.slug) ? "− Compare" : "+ Compare"}
            </button>
            {compare.length > 0 && (
              <button
                type="button"
                onClick={() => router.push(`/compare?heroes=${compare.join(",")}`)}
                className="whitespace-nowrap rounded-full bg-wine px-3 py-1 font-semibold text-white hover:bg-wine-hover"
              >
                Compare {compare.length} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className={`card p-3 sm:p-4 ${accent ? "ring-1 ring-wine/25" : ""}`}>
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight sm:text-[28px] ${accent ? "text-wine" : "text-ink"}`}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted" title={note}>{note}</p>
    </div>
  );
}
