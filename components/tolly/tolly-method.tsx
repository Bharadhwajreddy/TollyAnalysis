import { FACTORS, PILLARS } from "./tolly-parts";
import type { TollyMeta } from "@/lib/tolly/view";

const FACTOR_HOW: Record<(typeof FACTORS)[number]["key"], string> = {
  audience: "The average score of his films (next box), weighted by how many people rated each.",
  success: "Hits ÷ films with a known result. Short records are pulled toward the typical hero, so 2 hits from 2 films is not 100%.",
  fame: "Followers on his official Instagram and X accounts, on a scale where 10 thousand is 0 and 100 million is 100.",
  recent: "The same hit rate, for his latest films only.",
  career: "Films as lead hero since 2000; 40 or more is full marks.",
};

const RULES = [
  ["No rupee figures", "Ticket prices and inflation make money unfair across years, so box office counts only as hit or flop."],
  ["Same era only", "Votes and readers grow with the internet, so a film is only compared with films released within a year of it."],
  ["No data, no guess", "A film with an input missing is not scored. A factor a hero has no data for is left out, and the others count for more."],
] as const;

/** How the Tolly Index is made: the five factors, the audience score and the rules. Shown on the "How it works" page. */
export function TollyMethod({ m }: { m: TollyMeta }) {
  return (
    <section aria-labelledby="tolly-method" className="grid gap-4 lg:grid-cols-3">
      <div className="card p-4 sm:p-5">
        <h2 id="tolly-method" className="eyebrow">
          Five things make a hero&apos;s score
        </h2>
        <ul className="mt-2 space-y-2.5 text-[13.5px]">
          {FACTORS.map((f) => (
            <li key={f.key} className="flex gap-3">
              <span className="tabular w-11 shrink-0 font-semibold" style={{ color: f.color }}>
                {Math.round(m.heroWeights[f.key] * 100)}%
              </span>
              <span>
                <span className="font-semibold text-ink">{f.label}.</span> <span className="text-ink-2">{FACTOR_HOW[f.key]}</span>
              </span>
            </li>
          ))}
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
