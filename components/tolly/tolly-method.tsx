import { HERO_FACTORS } from "@/lib/tolly";
import { GROUPS, PILLARS } from "./tolly-parts";
import type { TollyMeta } from "@/lib/tolly/view";

const RULES = [
  ["Fair comparisons", "Films are only compared with films of their time, and heroes are compared with each other as percentiles, so ticket prices and inflation do not decide the ranking."],
  ["Same era only", "Votes and readers grow with the internet, so a film is only compared with films released within a year of it."],
  ["No data, no guess", "A film with an input missing is not scored. A number a hero has no data for (for example no reported box office) is left out, and the others count for more."],
] as const;

/** How the Tolly Index is made: the five factors, the audience score and the rules. Shown on the "How it works" page. */
export function TollyMethod({ m }: { m: TollyMeta }) {
  return (
    <section aria-labelledby="tolly-method" className="grid gap-4 lg:grid-cols-3">
      <div className="card p-4 sm:p-5">
        <h2 id="tolly-method" className="eyebrow">
          Fifteen numbers make a hero&apos;s score
        </h2>
        <ul className="mt-2 space-y-3 text-[13.5px]">
          {GROUPS.map((g) => {
            const parts = HERO_FACTORS.filter((f) => f.group === g.key);
            const total = parts.reduce((a, f) => a + m.heroWeights[f.key], 0);
            return (
              <li key={g.key}>
                <span className="flex gap-3">
                  <span className="tabular w-11 shrink-0 font-semibold" style={{ color: g.color }}>
                    {total}%
                  </span>
                  <span className="font-semibold text-ink">{g.label}</span>
                </span>
                <ul className="ml-14 mt-1 space-y-0.5 text-[12.5px] text-ink-2">
                  {parts.map((f) => (
                    <li key={f.key}>
                      <span className="tabular font-semibold text-ink">{m.heroWeights[f.key]}%</span> {f.label}: {f.how}.
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        {!m.fame.applied && <p className="mt-2 text-[12px] text-muted">Fame is counted once every ranked hero has a recent follower count.</p>}
      </div>
      <div className="card p-4 sm:p-5">
        <h2 className="eyebrow">Inside the audience score: three questions per film</h2>
        <ul className="mt-2 space-y-2.5 text-[13.5px]">
          {PILLARS.map((p) => (
            <li key={p.key} className="flex gap-3">
              <span className="tabular w-11 shrink-0 font-semibold" style={{ color: p.color }}>
                {p.weight}
              </span>
              <span>
                <span className="font-semibold text-ink">{p.question.replace("his films", "it")}</span>{" "}
                <span className="text-ink-2">
                  {p.key === "rating"
                    ? "IMDb audience rating; with few voters it is pulled toward the average of its time."
                    : p.key === "reach"
                      ? "Number of voters, and how many Wikipedia languages cover it."
                      : "How many people read about it on Wikipedia today."}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-4 sm:p-5">
        <h2 className="eyebrow">Three rules keep it fair</h2>
        <ol className="mt-2 space-y-2.5 text-[13.5px]">
          {RULES.map(([t, d], i) => (
            <li key={t}>
              <span className="font-semibold text-ink">
                {i + 1}. {t}.
              </span>{" "}
              <span className="text-ink-2">{d}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
