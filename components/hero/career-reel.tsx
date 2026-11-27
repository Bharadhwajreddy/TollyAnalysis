"use client";

import { useState } from "react";
import { FilmStrip } from "@/components/charts/film-strip";
import { FocusChip, useFocus, useFocusTrigger } from "@/components/charts/focus";
import { DirectorMono, MiniMark } from "@/components/entity/tokens";
import type { FilmDot, Outcome } from "@/lib/ledger-types";

export interface ReelDirector {
  key: string;
  name: string;
  films: number;
  hits: number;
  /** One mini mark per film, in release order. */
  marks: Outcome[];
}

/**
 * The hero moment of a hero page: every film of his career on one strip, biggest films labelled, and a row
 * of the directors he worked with. Hovering a director lights only that director's films; clicking pins it.
 */
export function CareerReel({
  name,
  films,
  start,
  end,
  partialFrom,
  upcoming,
  directors,
}: {
  name: string;
  films: FilmDot[];
  start: number;
  end: number;
  partialFrom: number | null;
  upcoming: { title: string; year: number } | null;
  directors: ReelDirector[];
}) {
  const [all, setAll] = useState(false);
  const FEW = 8;
  return (
    <div>
      <FilmStrip
        films={films}
        start={start}
        end={end}
        height={120}
        axis
        labels={8}
        partialFrom={partialFrom}
        upcoming={upcoming}
        ariaLabel={`${name}'s career: ${films.length} films from ${Math.floor(start + 0.5)}. Use the arrow keys to move between films and Enter to open one.`}
      />
      {directors.length > 0 && (
        <div className="mt-6 border-t border-rule pt-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-2">
              <span className="font-semibold text-ink">{directors.length === 1 ? "1 director" : `${directors.length} directors`}.</span> Point at or tap one to light his films in the reel.
            </p>
            <FocusChip />
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {directors.map((d, i) => (
              <li key={d.key} className={!all && i >= FEW ? "max-sm:hidden" : ""}>
                <DirectorChip d={d} />
              </li>
            ))}
            {directors.length > FEW && (
              <li className="sm:hidden">
                <button type="button" onClick={() => setAll((a) => !a)} aria-expanded={all} className="inline-flex min-h-8 items-center rounded-full px-2.5 text-[12.5px] font-medium text-accent">
                  {all ? "Fewer" : `+${directors.length - FEW} more`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function DirectorChip({ d }: { d: ReelDirector }) {
  const trigger = useFocusTrigger({ kind: "director", key: d.key, label: d.name });
  const { focus } = useFocus();
  const on = focus?.kind === "director" && focus.key === d.key;
  const dim = !!focus && focus.kind === "director" && !on;
  return (
    <button
      type="button"
      {...trigger}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border py-[3px] pl-[4px] pr-2.5 text-[12.5px] transition-[background-color,border-color,opacity] duration-[var(--dur-1)] ${
        on ? "border-accent/50 bg-accent-wash text-ink" : "border-rule bg-surface text-ink-2 hover:border-field-2 hover:text-ink"
      } ${dim ? "opacity-55" : ""}`}
    >
      <DirectorMono name={d.name} size={22} />
      <span className="font-medium">{d.name}</span>
      <span className="ml-0.5 inline-flex items-center gap-[2px]" aria-label={`${d.films} film${d.films === 1 ? "" : "s"}, ${d.hits} hit${d.hits === 1 ? "" : "s"}`}>
        {d.marks.map((o, i) => (
          <MiniMark key={i} o={o} />
        ))}
      </span>
    </button>
  );
}
