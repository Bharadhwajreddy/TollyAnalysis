import Link from "next/link";
import type { TollyHeroView, TollyMeta } from "@/lib/tolly/view";
import { IndexValue, PILLARS, PillarBar } from "./tolly-parts";

/** The hero page's Tolly Index section: score, band, pillar profile, coverage and the films holding him back. */
export function TollyHeroCard({ hero, rankedCount, meta }: { hero: TollyHeroView; rankedCount: number; meta: TollyMeta }) {
  const share = hero.judged ? Math.round((hero.complete / hero.judged) * 100) : 0;
  return (
    <section id="tolly" className="card mt-5 scroll-mt-32 p-4 sm:p-6" aria-labelledby="tolly-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-kicker">What audiences think, not box office</p>
          <h2 id="tolly-title" className="mt-1 font-serif text-[24px] font-semibold text-ink">
            Tolly Index
          </h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-ink-2">
            Each film is scored on three questions, always against films released within a year of it. His index is the average of his films, weighted by how
            many people rated each. No money is used.
          </p>
        </div>
        <Link href="/tolly-index" className="text-[13px] font-medium text-wine hover:underline">
          Full ranking and method →
        </Link>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="rounded-xl border border-line bg-surface p-4">
          {hero.qualified ? (
            <>
              <IndexValue hero={hero} />
              <p className="mt-2 text-[13px] font-semibold text-ink">
                #{hero.rank} of {rankedCount} ranked heroes
              </p>
              <p className="mt-1 text-[12px] text-muted">± is the 95% range: heroes whose ranges overlap are about level.</p>
            </>
          ) : (
            <>
              <p className="text-[28px] font-semibold leading-none text-muted">Not ranked yet</p>
              <p className="mt-2 text-[13px] text-ink-2">
                {hero.complete >= 5 && hero.judged > 0 ? `Only ${share}% of his films have every input; he needs 90%.` : `Needs at least 5 complete films; he has ${hero.complete}.`}
              </p>
              <p className="mt-1 text-[12px] text-muted">A hero is ranked once at least 5 films, and 90% of his films, have every input. We never guess a missing one.</p>
            </>
          )}
          <p className="tabular mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
            {hero.complete} of {hero.judged} films complete ({share}%)
            {hero.provisional ? ` · ${hero.provisional} under 2 years old, not counted yet` : ""}
          </p>
        </div>

        <div className="space-y-4">
          {hero.pillars ? (
            <div className="space-y-2.5">
              {PILLARS.map((p) => (
                <PillarBar key={p.key} label={`${p.label} · ${p.weight}`} sub={p.question} value={hero.pillars?.[p.key] ?? null} color={p.color} />
              ))}
              <p className="text-[11.5px] text-muted">0–100; the tick marks 50. Reach and Staying power are percentiles against films of the same years.</p>
            </div>
          ) : (
            <p className="text-[13px] text-muted">No complete films yet, so no pillar profile.</p>
          )}
          {hero.best.length > 0 && (
            <div>
              <h3 className="eyebrow mb-1.5">Best films by Tolly Index</h3>
              <ol className="grid gap-2 sm:grid-cols-3">
                {hero.best.map((b, i) => (
                  <li key={b.title + b.year} className="rounded-lg border border-line bg-surface px-3 py-2">
                    <span className="text-[11px] text-muted">#{i + 1}</span>
                    <p className="font-medium leading-tight text-ink">{b.title}</p>
                    <p className="tabular text-[12px] text-ink-2">
                      {b.year} · <strong className="text-wine">{b.index.toFixed(1)}</strong>
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {hero.missing.length > 0 && (
        <details className="mt-4 rounded-lg border border-line bg-surface-2/50 px-3 py-2">
          <summary className="cursor-pointer text-[13.5px] font-semibold text-ink">Films holding him back ({hero.missing.length})</summary>
          <p className="mt-1 text-[12.5px] text-ink-2">These films are not scored because an input is missing in every free source we can reach. Know where to find it? Suggest a correction.</p>
          <ul className="mt-2 divide-y divide-line text-[12.5px]">
            {hero.missing.map((m) => (
              <li key={m.title + m.year} className="flex flex-wrap gap-x-3 py-1.5">
                <span className="tabular w-10 text-muted">{m.year}</span>
                <span className="font-medium text-ink">{m.title}</span>
                <span className="text-muted">missing: {m.missing.join(", ")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-3 text-[11px] text-muted">
        Data as of {meta.asOf}: IMDb ratings and votes, Wikidata, and Wikipedia readers (English + Telugu). Method {meta.version}.
      </p>
    </section>
  );
}
