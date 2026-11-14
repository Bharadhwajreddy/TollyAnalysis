"use client";

import type { ColourBy } from "@/lib/constants/groups";

/** "Colour by: Debut era | Film family" switch used wherever heroes are coloured. */
export function ColourBySwitch({ id, value, onChange }: { id: string; value: ColourBy; onChange: (v: ColourBy) => void }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-2">
      <span id={id}>Colour by</span>
      <div role="radiogroup" aria-labelledby={id} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
        {(["era", "family"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            onClick={() => onChange(k)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${value === k ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink"}`}
          >
            {k === "era" ? "Debut era" : "Film family"}
          </button>
        ))}
      </div>
    </div>
  );
}
