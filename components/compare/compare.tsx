"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { formatMetric, INDUSTRY_LABEL, METRICS, WINDOW_LABEL } from "@/lib/constants/metrics";
import type { FilterWindow } from "@/lib/domain/types";
import type { DashboardData, HeroView } from "@/lib/view-models";
import { ConfidenceBadge } from "@/components/ui/badges";
import { Segmented } from "@/components/ui/segmented";

/** Validated 4-slot palette (CVD-safe adjacent separation, ≥3:1 on surface). */
const SLOT_COLORS = ["#a3284f", "#00879e", "#b98200", "#4a3aa7"];
const METRIC_ORDER: HeroMetricKey[] = [
  "starScore",
  "filmSuccess",
  "overallSuccessRatio",
  "audienceIndex",
  "consistency",
  "socialReach",
  "momentum",
  "releaseGap",
  "peakFilms",
  "filmsPerYear",
];

export function Compare({ data, initial }: { data: DashboardData; initial: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [period, setPeriod] = useState<FilterWindow>("all_time");
  // Each hero keeps its colour slot while others are added or removed.
  const [slots, setSlots] = useState<(string | null)[]>(() => {
    const valid = initial.filter((s) => data.windows.all_time.some((h) => h.slug === s)).slice(0, 4);
    return [0, 1, 2, 3].map((i) => valid[i] ?? null);
  });

  const heroesBySlug = useMemo(() => new Map(data.windows[period].map((h) => [h.slug, h])), [data, period]);
  const chosen = slots
    .map((slug, i) => (slug ? { slug, color: SLOT_COLORS[i], hero: heroesBySlug.get(slug) ?? null } : null))
    .filter((x): x is { slug: string; color: string; hero: HeroView | null } => x !== null);

  const sync = (next: (string | null)[]) => {
    setSlots(next);
    const q = next.filter(Boolean).join(",");
    router.replace(q ? `${pathname}?heroes=${q}` : pathname, { scroll: false });
  };
  const add = (slug: string) => {
    const i = slots.indexOf(null);
    if (i === -1 || slots.includes(slug)) return;
    const next = [...slots];
    next[i] = slug;
    sync(next);
  };
  const remove = (slug: string) => sync(slots.map((s) => (s === slug ? null : s)));

  const available = data.windows.all_time.filter((h) => !slots.includes(h.slug)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mt-5 space-y-4">
      <div className="card flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {chosen.map((c) => (
            <span key={c.slug} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-2.5 pr-1 text-[13px] font-medium">
              <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: c.color }} />
              {c.hero?.name ?? data.windows.all_time.find((h) => h.slug === c.slug)?.name ?? c.slug}
              <button
                type="button"
                onClick={() => remove(c.slug)}
                aria-label={`Remove ${c.hero?.name ?? c.slug}`}
                className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
          {chosen.length < 4 && (
            <label className="inline-flex items-center">
              <span className="sr-only">Add a hero to compare</span>
              <select
                value=""
                onChange={(e) => e.target.value && add(e.target.value)}
                className="rounded-full border border-dashed border-ink-2 bg-surface px-3 py-1.5 text-[13px] font-medium text-ink"
              >
                <option value="">+ Add hero ({4 - chosen.length} left)</option>
                {available.map((h) => (
                  <option key={h.slug} value={h.slug}>
                    {h.name}
                    {h.isEmerging ? " (emerging)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <Segmented
          label="Period"
          value={period}
          onChange={setPeriod}
          options={(Object.keys(WINDOW_LABEL) as FilterWindow[]).map((w) => ({ value: w, label: WINDOW_LABEL[w] }))}
        />
      </div>

      {chosen.length < 2 ? (
        <div className="card p-8 text-center">
          <p className="text-[15px] font-medium text-ink">Pick 2–4 heroes to compare side by side.</p>
          <p className="mt-1 text-sm text-muted">
            Use “Add hero” above, or tick heroes in the <Link href="/#table" className="text-wine underline">dashboard table</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {METRIC_ORDER.map((k) => {
              const meta = METRICS[k];
              const vals = chosen.map((c) => c.hero?.m[k].v ?? null);
              const present = vals.filter((v): v is number => v !== null);
              const max = meta.domainMax ?? Math.max(1, ...present) * 1.15;
              const best = present.length ? (meta.higherIsBetter ? Math.max(...present) : Math.min(...present)) : null;
              return (
                <section key={k} className="card p-4" aria-label={meta.label}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink" title={meta.definition}>
                      {meta.label}
                    </h3>
                    <span className="text-[11px] text-muted">{meta.higherIsBetter ? "higher is better" : "lower is better"}</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {chosen.map((c, i) => {
                      const v = vals[i];
                      return (
                        <li key={c.slug} className="grid grid-cols-[96px_1fr_56px] items-center gap-2">
                          <span className="truncate text-[12px] text-ink-2">{c.hero?.name ?? c.slug}</span>
                          <span className="relative h-4">
                            {v !== null && (
                              <span
                                className="chart-mark absolute inset-y-0 left-0 rounded-r-[4px]"
                                style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: c.color }}
                              />
                            )}
                          </span>
                          <span className={`tabular text-right text-[12px] ${v === best ? "font-bold text-ink" : "text-ink-2"}`}>
                            {formatMetric(k, v)}
                            {v === best && present.length > 1 && <span className="sr-only"> (best)</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <section className="card p-4" aria-labelledby="cmp-table">
            <h2 id="cmp-table" className="text-base font-semibold text-ink">
              Side-by-side detail
            </h2>
            <div className="scroll-x mt-3">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-2">
                    <th scope="col" className="py-2 pr-3 font-semibold">Metric</th>
                    {chosen.map((c) => (
                      <th key={c.slug} scope="col" className="py-2 pr-3 text-right font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                          {c.hero?.name ?? c.slug}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular">
                  <Row label="Industry" cells={chosen.map((c) => (c.hero ? INDUSTRY_LABEL[c.hero.industry] : "—"))} />
                  <Row label="Lead films (window)" cells={chosen.map((c) => String(c.hero?.eligible ?? "—"))} />
                  <Row label="Active span" cells={chosen.map((c) => (c.hero ? `${c.hero.firstYear}–${c.hero.lastYear}` : "—"))} />
                  <Row label="Co-lead titles" cells={chosen.map((c) => String(c.hero?.coLead ?? "—"))} />
                  <Row label="Telugu-dubbed titles" cells={chosen.map((c) => String(c.hero?.dubbed ?? "—"))} />
                  <Row label="Direct-to-OTT titles" cells={chosen.map((c) => String(c.hero?.ott ?? "—"))} />
                  {METRIC_ORDER.map((k) => (
                    <Row key={k} label={METRICS[k].label} cells={chosen.map((c) => formatMetric(k, c.hero?.m[k].v))} />
                  ))}
                  <tr className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-2">Evidence / confidence</th>
                    {chosen.map((c) => (
                      <td key={c.slug} className="py-2 pr-3 text-right">
                        {c.hero ? (
                          <span className="inline-flex items-center gap-1.5">
                            {c.hero.coverage}% <ConfidenceBadge grade={c.hero.confidence} compact />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              “—” means not enough evidence in this period (never zero). Bold marks the best value in each metric card.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-b border-line last:border-0">
      <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-2">
        {label}
      </th>
      {cells.map((c, i) => (
        <td key={i} className="py-2 pr-3 text-right text-ink">
          {c}
        </td>
      ))}
    </tr>
  );
}
