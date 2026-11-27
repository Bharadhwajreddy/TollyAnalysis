"use client";

import { prefetchSearch, usePalette } from "@/components/search/command-palette";

/** A large search field that opens the command palette (so search behaves the same everywhere). */
export function SearchField({ placeholder = "Find a hero, a film or a director", className = "" }: { placeholder?: string; className?: string }) {
  const { open } = usePalette();
  return (
    <button
      type="button"
      onClick={() => open()}
      onMouseEnter={prefetchSearch}
      onFocus={prefetchSearch}
      className={`group flex h-12 w-full max-w-md items-center gap-3 rounded-xl border border-rule bg-surface px-4 text-left text-[15px] text-muted shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-150 hover:border-field-2 hover:shadow-[0_4px_16px_rgb(27_22_19/0.06)] ${className}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" strokeLinecap="round" />
      </svg>
      <span className="flex-1 truncate">{placeholder}</span>
      <kbd className="hidden rounded-md border border-rule bg-surface-2 px-1.5 py-px font-sans text-[11px] sm:inline">/</kbd>
    </button>
  );
}
