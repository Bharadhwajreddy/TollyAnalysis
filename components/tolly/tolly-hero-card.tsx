import Link from "next/link";
import { compactCount } from "@/lib/data/real/hero-facts";
import type { TollyHeroView, TollyMeta } from "@/lib/tolly/view";
import { IndexValue, PILLARS, PillarBar } from "./tolly-parts";

/** The hero page's Tolly Index section: score, band, pillar profile, coverage and the films holding him back. */
export function TollyHeroCard({ hero, rankedCount, meta }: { hero: TollyHeroView; rankedCount: number; meta: TollyMeta }) {
  const share = hero.judged ? Math.round((hero.complete / hero.judged) * 100) : 0;
  return (
    <section id="tolly" className="card mt-5 scroll-mt-32 p-4 sm:p-6" aria-labelledby="tolly-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tolly-title" className="font-serif text-[24px] font-semibold text-ink">
            Tolly Index
          </h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-ink-2">What audiences think of his films, out of 100.</p>
        </div>
        <Link href="/tolly-index" className="text-[13px] font-medium text-wine hover:underline">
          Full ranking →
        </Link>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="rounded-xl border border-line bg-surface p-4">
          {hero.qualified ? (
            <>
              <IndexValue hero={hero} />
              <p className="mt-2 text-[13px] font-semibold text-ink">
                #{hero.rank} of {rankedCount} heroes
              </p>
              <p className="mt-1 text-[12px] text-muted">± shows how sure we are.</p>
            </>
          ) : (
            <>
              <p className="text-[28px] font-semibold leading-none text-muted">Not ranked yet</p>
              <p className="mt-2 text-[13px] text-ink-2">
                {hero.complete >= 5 && hero.judged > 0 ? `Only ${share}% of his films have audience ratings so far; he needs 90%.` : `He needs at least 5 rated films; he has ${hero.complete}.`}
              </p>
            </>
          )}
          {hero.fame !== null && hero.followers && (
            <p className="tabular mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
              Fame <b className="text-ink">{hero.fame.toFixed(1)}</b> from {compactCount(hero.followers.total)} official followers (counted by {hero.followers.asOf}).{" "}
              {meta.fame.applied && hero.filmIndex !== null
                ? `Films ${hero.filmIndex.toFixed(1)} × ${(1 - meta.fame.weight).toFixed(2)} + fame × ${meta.fame.weight.toFixed(2)}.`
                : `Fame joins the index at ${Math.round(meta.fame.weight * 100)}% once every ranked hero has a recent count.`}
            </p>
          )}
          <p className="tabular mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
            Based on {hero.complete} of {hero.judged} films
            {hero.provisional ? ` · ${hero.provisional} too new to count` : ""}
          </p>
        </div>

        <div className="space-y-4">
          {hero.pillars ? (
            <div className="space-y-2.5">
              {PILLARS.map((p) => (
                <PillarBar key={p.key} label={`${p.label} · ${p.weight}`} sub={p.question} value={hero.pillars?.[p.key] ?? null} color={p.color} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted">No rated films yet.</p>
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
          <summary className="cursor-pointer text-[13.5px] font-semibold text-ink">Films without a score ({hero.missing.length})</summary>
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
    </section>
  );
}
