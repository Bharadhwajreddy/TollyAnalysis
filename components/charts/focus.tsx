"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { FilmDot } from "@/lib/ledger-types";

/**
 * Page-level focus: hovering a director, hero, year or film anywhere lights its films in every strip on the
 * page and dims the rest. Click pins it (shown as a chip); hover alone is transient.
 */
export type Focus = { kind: "director" | "hero" | "year" | "film"; key: string; label: string } | null;

interface Ctx {
  focus: Focus;
  pinned: Focus;
  hover: (f: Focus) => void;
  pin: (f: Focus) => void;
}
const FocusCtx = createContext<Ctx>({ focus: null, pinned: null, hover: () => {}, pin: () => {} });

export function FocusProvider({ children, initial = null }: { children: ReactNode; initial?: Focus }) {
  const [hovered, setHovered] = useState<Focus>(null);
  const [pinned, setPinned] = useState<Focus>(initial);
  const value = useMemo(() => ({ focus: hovered ?? pinned, pinned, hover: setHovered, pin: setPinned }), [hovered, pinned]);
  return <FocusCtx.Provider value={value}>{children}</FocusCtx.Provider>;
}

export const useFocus = () => useContext(FocusCtx);

/** Does a film match the focus? */
export function lit(f: FilmDot, focus: Focus): boolean {
  if (!focus) return true;
  switch (focus.kind) {
    case "director":
      return f.ds === focus.key || f.d === focus.key;
    case "hero":
      return f.h.includes(focus.key);
    case "year":
      return String(f.y) === focus.key;
    case "film":
      return f.s === focus.key;
  }
}

/** Hover/focus handlers that set a transient focus; click pins it (click again to unpin). */
export function useFocusTrigger(f: Exclude<Focus, null>) {
  const { hover, pin, pinned } = useFocus();
  const same = pinned?.kind === f.kind && pinned.key === f.key;
  return {
    onMouseEnter: () => hover(f),
    onMouseLeave: () => hover(null),
    onFocus: () => hover(f),
    onBlur: () => hover(null),
    onClick: () => pin(same ? null : f),
    "aria-pressed": same,
  };
}

/** The pinned-focus chip shown in a section header. */
export function FocusChip() {
  const { pinned, pin } = useFocus();
  if (!pinned) return null;
  return (
    <button
      type="button"
      onClick={() => pin(null)}
      className="pop-in inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-wash px-2.5 py-1 text-[12.5px] font-medium text-accent"
    >
      Showing {pinned.label}
      <span aria-hidden className="text-[14px] leading-none">×</span>
      <span className="sr-only">clear</span>
    </button>
  );
}
