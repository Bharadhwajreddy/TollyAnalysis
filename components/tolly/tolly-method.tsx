import { PILLARS } from "./tolly-parts";
import type { TollyMeta } from "@/lib/tolly/view";

const RULES = [
  ["No money", "Box office depends on ticket prices and inflation, so no rupee figure enters the index."],
  ["Same era only", "Votes and readers grow with the internet, so a film is only compared with films released within a year of it."],
  ["No data, no score", "A film with any input missing is not scored, and its hero's page says exactly what is missing."],
] as const;

const STEPS = [
  ["Collect", "IMDb ratings and votes, Wikidata facts, Wikipedia readers (English + Telugu)"],
  ["Match", "One record per film, checked to be the same film in every source"],
  ["Check", "Every input present, or the film waits and the gap is named"],
  ["Score each film", "Three questions, each judged against films of its time"],
  ["Score each hero", "Average of his films, weighted by how many people rated each"],
] as const;

/** How the Tolly Index is made: the rules, the three questions and the steps. Shown on the "How it works" page. */
export function TollyMethod({ m }: { m: TollyMeta }) {
  return (
      <section aria-labelledby="tolly-method" className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 sm:p-5">
          <h2 id="tolly-method" className="eyebrow">
            Three rules keep it fair
          </h2>
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
        <div className="card p-4 sm:p-5">
          <h2 className="eyebrow">Three questions make a film&apos;s score</h2>
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
          <p className="mt-2 text-[12px] text-muted">
            {m.fame.applied
              ? `Then fame: a hero's score is ${Math.round((1 - m.fame.weight) * 100)}% his films and ${Math.round(m.fame.weight * 100)}% his followers on Instagram and X. A hero with no official account is scored on films alone.`
              : `Fame, from each hero's official followers, will add ${Math.round(m.fame.weight * 100)}% once every ranked hero has a recent count.`}
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <h2 className="eyebrow">Five steps, rerun automatically</h2>
          <ol className="mt-2 space-y-2 text-[13.5px]">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-2.5">
                <span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line text-[11px] font-semibold text-wine">{i + 1}</span>
                <span>
                  <span className="font-semibold text-ink">{t}:</span> <span className="text-ink-2">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
  );
}
