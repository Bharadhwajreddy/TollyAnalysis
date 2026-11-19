import Link from "next/link";
import { compactCount } from "@/lib/data/real/hero-facts";
import { HERO_FACTORS } from "@/lib/tolly";
import type { TollyHeroView, TollyMeta } from "@/lib/tolly/view";
import { GROUPS, groupValue, IndexValue, kpiFact, PILLARS, PillarBar, PROVISIONAL_TIP } from "./tolly-parts";
import { missingLabel } from "@/lib/tolly/labels";

/** The hero page's Tolly Index section: the score, its five groups, every number behind it, and the films holding him back. */
export function TollyHeroCard({ hero, rankedCount, meta, provisional = false }: { hero: TollyHeroView; rankedCount: number; meta: TollyMeta; provisional?: boolean }) {
  const share = hero.judged ? Math.round((hero.complete / hero.judged) * 100) : 0;
  return (
    <section id="tolly" className="card mt-5 scroll-mt-32 p-4 sm:p-6" aria-labelledby="tolly-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tolly-title" className="font-serif text-[24px] font-semibold text-ink">
            Tolly Index
          </h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-ink-2">His films, box office, form, fame and career in one score out of 100.</p>
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
              {provisional && <p className="mt-2 rounded-md bg-gold-soft px-2 py-1.5 text-[12px] text-warn">{PROVISIONAL_TIP}</p>}
            </>
          ) : (
            <>
              <p className="text-[28px] font-semibold leading-none text-muted">Not ranked yet</p>
              <p className="mt-2 text-[13px] text-ink-2">
                {hero.reason === "box-office record being checked"
                  ? "His box-office results for Tamil and Malayalam films are being checked against trade reports. He joins the ranking once that is done."
                  : hero.complete >= 5 && hero.judged > 0
                    ? `Only ${share}% of his films have audience ratings so far; he needs 90%.`
                    : `He needs at least 5 rated films; he has ${hero.complete}.`}
              </p>
            </>
          )}
          <p className="tabular mt-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
            Based on {hero.complete} of {hero.judged} films
            {hero.provisional ? ` · ${hero.provisional} too new to count` : ""}
          </p>
        </div>

        <div className="space-y-4">
          {hero.factors && hero.qualified ? (
            <div className="space-y-2.5">
              {GROUPS.map((g) => {
                const part = groupValue(hero, g.key);
                return (
                  <PillarBar
                    key={g.key}
                    label={`${g.label} · ${part.value === null ? "not counted" : `${Math.round(part.share)}%`}`}
                    sub={g.key === "fame" && part.value === null && !meta.fame.applied ? "not counted yet" : g.question}
                    value={part.value}
                    color={g.color}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-muted">{hero.pillars ? "His score appears once enough of his films are rated." : "No rated films yet."}</p>
          )}

          {hero.factors && hero.qualified && (
            <details className="rounded-lg border border-line bg-surface-2/50 px-3 py-2">
              <summary className="cursor-pointer text-[13px] font-semibold text-ink">All {HERO_FACTORS.length} numbers behind the score</summary>
              <div className="scroll-x mt-2">
                <table className="w-full min-w-[520px] text-[12.5px]">
                  <thead className="text-left text-[10.5px] uppercase tracking-wide text-ink-2">
                    <tr>
                      <th scope="col" className="py-1.5 pr-2">Number</th>
                      <th scope="col" className="py-1.5 pr-2">His record</th>
                      <th scope="col" className="py-1.5 pr-2 text-right">Score</th>
                      <th scope="col" className="py-1.5 text-right">Counts for</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GROUPS.map((g) => (
                      <GroupRows key={g.key} hero={hero} group={g.key} />
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {hero.pillars && (
            <details className="rounded-lg border border-line bg-surface-2/50 px-3 py-2">
              <summary className="cursor-pointer text-[13px] font-semibold text-ink">Inside the audience score</summary>
              <div className="mt-3 space-y-2.5 pb-1">
                {PILLARS.map((p) => (
                  <PillarBar key={p.key} label={`${p.label} · ${p.weight}`} sub={p.question} value={hero.pillars?.[p.key] ?? null} color={p.color} />
                ))}
              </div>
            </details>
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
                <span className="text-muted">missing: {m.missing.map(missingLabel).join(", ")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function GroupRows({ hero, group }: { hero: TollyHeroView; group: (typeof GROUPS)[number]["key"] }) {
  const g = GROUPS.find((x) => x.key === group) as (typeof GROUPS)[number];
  return (
    <>
      <tr>
        <th colSpan={4} scope="colgroup" className="pb-1 pt-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: g.color }}>
          {g.label}
        </th>
      </tr>
      {HERO_FACTORS.filter((f) => f.group === group).map((f) => {
        const part = hero.factors?.[f.key];
        return (
          <tr key={f.key} className="border-t border-line">
            <td className="py-1.5 pr-2 font-medium text-ink">{f.label}</td>
            <td className="py-1.5 pr-2 text-ink-2">{kpiFact(hero, f.key, compactCount) ?? "no data"}</td>
            <td className="tabular py-1.5 pr-2 text-right">{part?.value?.toFixed(1) ?? "—"}</td>
            <td className="tabular py-1.5 text-right text-ink-2">{part && part.value !== null ? `${part.share.toFixed(1)}%` : "left out"}</td>
          </tr>
        );
      })}
    </>
  );
}
