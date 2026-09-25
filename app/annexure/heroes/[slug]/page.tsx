import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilmographyTable } from "@/components/annexure/filmography-table";
import { ConfidenceBadge, DemoBadge } from "@/components/ui/badges";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { formatMetric, INDUSTRY_LABEL, METRICS } from "@/lib/constants/metrics";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { getHeroFilms, getHeroSnapshots, getMeta, getPerson } from "@/lib/repositories";

export async function generateMetadata(props: PageProps<"/annexure/heroes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPerson(slug);
  return { title: p ? `${p.displayName} · Annexure` : "Hero not found" };
}

const KEYS: HeroMetricKey[] = ["hpi", "filmSuccess", "overallSuccessRatio", "audienceIndex", "consistency", "socialReach", "momentum", "releaseGap", "peakFilms", "filmsPerYear"];

export default async function HeroDetailPage(props: PageProps<"/annexure/heroes/[slug]">) {
  const { slug } = await props.params;
  const person = await getPerson(slug);
  if (!person) notFound();
  const [films, snapshots, meta] = await Promise.all([getHeroFilms(slug), getHeroSnapshots("all_time", true), getMeta()]);
  const snap = snapshots.find((s) => s.slug === slug) ?? null;

  return (
    <div>
      <p className="text-xs text-muted">
        <Link href="/annexure/heroes" className="hover:text-wine">Hero detail</Link> / {person.displayName}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span aria-hidden className="h-4 w-4 rounded-full" style={{ background: INDUSTRY_COLOR[person.industry] }} />
        <h1 className="font-serif text-3xl font-bold text-ink">{person.displayName}</h1>
        {meta.mode === "demo" && <DemoBadge />}
      </div>
      <p className="mt-1 text-sm text-ink-2">
        {INDUSTRY_LABEL[person.industry]} · {person.status.replace("_", " ")} · {films.length} eligible lead films
        {snap?.isEmerging ? " · emerging" : ""}
      </p>

      {snap && (
        <section aria-labelledby="hero-metrics" className="card mt-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="hero-metrics" className="text-base font-semibold text-ink">All-time metrics with evidence coverage</h2>
            <ConfidenceBadge grade={snap.confidence} />
          </div>
          <div className="scroll-x mt-3">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead className="text-left text-[11px] uppercase tracking-wide text-ink-2">
                <tr className="border-b border-line">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Metric</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Value</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Coverage</th>
                  <th scope="col" className="py-1.5 font-semibold">Derivation</th>
                </tr>
              </thead>
              <tbody>
                {KEYS.map((k) => {
                  const r = snap.metrics[k];
                  return (
                    <tr key={k} className="border-b border-line last:border-0 align-top">
                      <th scope="row" className="py-1.5 pr-3 text-left font-medium text-ink">{METRICS[k].label}</th>
                      <td className="tabular py-1.5 pr-3 text-right font-semibold">{formatMetric(k, r.value)}</td>
                      <td className="tabular whitespace-nowrap py-1.5 pr-3 text-right text-ink-2">
                        {r.coverage.numerator}/{r.coverage.denominator}
                        {r.status !== "ok" && <span className="ml-1 text-[11px] text-warn">{r.status.replace("_", " ")}</span>}
                      </td>
                      <td className="py-1.5 text-xs text-ink-2">{r.explanation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Methodology {snap.methodologyVersion} · calculated {snap.calculatedAt.slice(0, 10)} · social snapshot {snap.socialSnapshotAt ?? "none"}
          </p>
        </section>
      )}

      <section aria-labelledby="films" className="mt-6">
        <h2 id="films" className="mb-3 text-lg font-semibold text-ink">Filmography and film-level evidence</h2>
        {meta.mode === "demo" && (
          <p className="mb-3 text-xs text-muted">
            Demo mode: every title below is a fictional placeholder with synthetic evidence, generated only to verify the layout and
            calculations.
          </p>
        )}
        <FilmographyTable rows={films} />
      </section>
      <p className="mt-4 text-xs text-muted">
        Spotted an error? <Link href={`/annexure/corrections?hero=${encodeURIComponent(person.displayName)}`} className="text-wine underline">Suggest a correction</Link>.
      </p>
    </div>
  );
}
