import Link from "next/link";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import type { TollyHeroView, TollyMeta } from "@/lib/tolly/view";

/**
 * Home page: says plainly that the site ranks heroes two ways, and shows the Tolly Index top 10
 * (the Star Score already has the rest of the page).
 */
export function TollyHomePanel({ ranked, meta, photos }: { ranked: TollyHeroView[]; meta: TollyMeta; photos: Record<string, string | null> }) {
  const top = ranked.slice(0, 10);
  return (
    <section aria-labelledby="two-scores" className="card mt-4 grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_1.35fr]">
      <div>
        <p className="section-kicker">Two ways we rank heroes</p>
        <h2 id="two-scores" className="mt-1 font-serif text-[24px] font-semibold leading-tight text-ink">
          What audiences think, and what the box office says
        </h2>
        <dl className="mt-4 space-y-3 text-[13.5px]">
          <div className="rounded-xl border border-line bg-surface p-3">
            <dt className="font-semibold text-wine">Tolly Index</dt>
            <dd className="mt-0.5 text-ink-2">
              How audiences rated his films, how many people cared, and whether they still look them up, each judged against films of the same years.
              {meta.fame.applied ? ` Fame (his followers) adds ${Math.round(meta.fame.weight * 100)}%.` : ""} No money is used.
            </dd>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <dt className="font-semibold text-ink">Star Score</dt>
            <dd className="mt-0.5 text-ink-2">Box-office success and reach: hits, blockbusters, reported grosses and social media. It is the measure the charts below use.</dd>
          </div>
        </dl>
        <p className="mt-3 text-[12px] text-muted">
          They answer different questions, so they can disagree. Data as of {meta.asOf}; {meta.heroes.qualified} of {meta.heroes.total} heroes have enough complete
          films to be ranked on the Tolly Index.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="eyebrow">Tolly Index · top 10</h3>
          <Link href="/tolly-index" className="text-[13px] font-medium text-wine hover:underline">
            Full ranking →
          </Link>
        </div>
        <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {top.map((h) => (
            <li key={h.slug}>
              <Link href={`/hero/${h.slug}#tolly`} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-2.5 py-2 hover:border-wine/40">
                <span className="tabular w-5 text-right text-[12px] text-muted">{h.rank}</span>
                <HeroAvatar name={h.name} photo={photos[h.slug] ?? null} industry="telugu" color="#7a1f3d" size={30} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{h.name}</span>
                <span className="tabular text-[14px] font-semibold text-wine">
                  {h.index?.toFixed(1)}
                  {h.band !== null && <span className="ml-1 text-[11px] font-normal text-muted">±{h.band.toFixed(1)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
