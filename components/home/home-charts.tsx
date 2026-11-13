"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ParetoChart } from "@/components/charts/pareto-chart";
import { ERA_GROUPS, FAMILY_GROUPS, groupOf, type ColourBy } from "@/lib/constants/groups";
import { FameChart } from "./fame-chart";

export interface ChartHero {
  slug: string;
  name: string;
  thumb: string | null;
  family: string | null;
  debutYear: number | null;
  /** Tolly Index rank (decides whose names are always shown). */
  rank: number | null;
  /** Films as lead and hit rate in %, when he has enough films with a known result. */
  films: number | null;
  successRatio: number | null;
  hits: number | null;
  judged: number | null;
  /** Audience score of his films and fame, both 0–100, with the follower total as text. */
  audience: number | null;
  fame: number | null;
  followers: string | null;
}

type View = "success" | "fame";

/** The home page's chart: hit rate against number of films (or audience score against fame), coloured by era or family. */
export function HomeCharts({ heroes }: { heroes: ChartHero[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("success");
  const [by, setBy] = useState<ColourBy>("era");
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const groups = by === "era" ? ERA_GROUPS : FAMILY_GROUPS;
  const shown = useMemo(() => heroes.filter((h) => !hidden.includes(groupOf(h, by).key)), [heroes, hidden, by]);
  const present = new Set(heroes.map((h) => groupOf(h, by).key));

  const success = useMemo(
    () =>
      shown
        .filter((h) => h.films !== null && h.successRatio !== null)
        .map((h) => ({
          id: h.slug,
          label: h.name,
          photo: h.thumb,
          x: h.films as number,
          y: h.successRatio as number,
          color: groupOf(h, by).color,
          selected: h.slug === selected,
          priority: (h.rank ?? 999) - 1,
          tooltip: (
            <div className="space-y-1">
              <p className="font-semibold text-ink">{h.name}</p>
              <p className="tabular flex justify-between gap-3 text-ink-2">
                <span>Films as lead</span>
                <strong className="text-ink">{h.films}</strong>
              </p>
              <p className="tabular flex justify-between gap-3 text-ink-2">
                <span>Success ratio</span>
                <strong className="text-ink">
                  {h.successRatio?.toFixed(0)}% ({h.hits} of {h.judged})
                </strong>
              </p>
              <p className="text-ink-2">{groupOf(h, by).label}</p>
              <p className="font-medium text-wine">{h.slug === selected ? "Tap again to open his page" : "Tap twice to open his page"}</p>
            </div>
          ),
        })),
    [shown, by, selected],
  );
  const fame = useMemo(
    () =>
      shown
        .filter((h) => h.audience !== null && h.fame !== null && h.followers)
        .map((h) => ({ slug: h.slug, name: h.name, thumb: h.thumb, films: h.audience as number, fame: h.fame as number, followers: h.followers as string, color: groupOf(h, by).color })),
    [shown, by],
  );
  const hasFame = heroes.filter((h) => h.fame !== null && h.audience !== null).length >= 10;

  const pill = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${active ? "border-wine bg-wine text-white" : "border-line bg-surface text-ink hover:border-ink-2"}`;

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {hasFame ? (
          <div role="radiogroup" aria-label="Chart" className="flex flex-wrap gap-1.5">
            <button type="button" role="radio" aria-checked={view === "success"} onClick={() => setView("success")} className={pill(view === "success")}>
              Success vs. films
            </button>
            <button type="button" role="radio" aria-checked={view === "fame"} onClick={() => setView("fame")} className={pill(view === "fame")}>
              Loved vs. followed
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span id="colour-by">Colour by</span>
          <div role="radiogroup" aria-labelledby="colour-by" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
            {(["era", "family"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={by === k}
                onClick={() => {
                  setBy(k);
                  setHidden([]);
                }}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${by === k ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink"}`}
              >
                {k === "era" ? "Debut era" : "Film family"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul aria-label="Colours (tap to hide or show a group)" className="mt-3 flex flex-wrap gap-x-1.5 gap-y-1.5">
        {groups
          .filter((g) => present.has(g.key))
          .map((g) => {
            const off = hidden.includes(g.key);
            return (
              <li key={g.key}>
                <button
                  type="button"
                  aria-pressed={!off}
                  onClick={() => setHidden((h) => (off ? h.filter((k) => k !== g.key) : [...h, g.key]))}
                  className={`flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] transition-opacity ${off ? "opacity-45" : ""}`}
                >
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                  <span className={off ? "line-through" : ""}>{g.label}</span>
                </button>
              </li>
            );
          })}
      </ul>

      <div className="mt-3">
        {view === "success" || !hasFame ? (
          success.length > 0 ? (
            <ParetoChart
              data={success}
              xLabel="Films as lead hero →"
              yLabel="Success ratio (%) →"
              xHigherIsBetter
              yHigherIsBetter
              yMax={100}
              onActivate={(id) => (id === selected ? router.push(`/hero/${id}`) : setSelected(id))}
              ariaLabel="Heroes by number of films as lead and share of them that were hits"
            />
          ) : (
            <p className="py-10 text-center text-[13.5px] text-muted">Every group is hidden. Tap a colour above to show it.</p>
          )
        ) : (
          <FameChart points={fame} />
        )}
      </div>
      <p className="mt-2 text-[12.5px] text-ink-2">
        {view === "success" || !hasFame
          ? "Each photo is a hero: further right means more films, higher means more of them were hits. Heroes with at least 5 films with a known result."
          : "Each photo is a hero: further right means better-loved films, higher means more followers on Instagram and X."}
      </p>
    </div>
  );
}
