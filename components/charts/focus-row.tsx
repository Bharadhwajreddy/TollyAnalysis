"use client";

import type { ReactNode } from "react";
import { useFocus, type Focus } from "@/components/charts/focus";

/**
 * A row (or any block) that sets the page focus while pointed at or focused within, and pins it on a click
 * that does not land on a link. Server-rendered children stay server-rendered.
 */
export function FocusRow({ focus, children, className = "" }: { focus: Exclude<Focus, null>; children: ReactNode; className?: string }) {
  const { focus: now, hover, pin, pinned } = useFocus();
  const on = now?.kind === focus.kind && now.key === focus.key;
  const isPinned = pinned?.kind === focus.kind && pinned.key === focus.key;
  return (
    <div
      data-on={on ? "" : undefined}
      data-pinned={isPinned ? "" : undefined}
      onMouseEnter={() => hover(focus)}
      onMouseLeave={() => hover(null)}
      onFocus={() => hover(focus)}
      onBlur={() => hover(null)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, svg, button")) return;
        pin(isPinned ? null : focus);
      }}
      className={className}
    >
      {children}
    </div>
  );
}

/** A button that pins (or unpins) a focus, for keyboard users and as an explicit affordance. */
export function FocusToggle({ focus, children, className = "" }: { focus: Exclude<Focus, null>; children: ReactNode; className?: string }) {
  const { pin, pinned } = useFocus();
  const isPinned = pinned?.kind === focus.kind && pinned.key === focus.key;
  return (
    <button type="button" aria-pressed={isPinned} onClick={() => pin(isPinned ? null : focus)} className={className}>
      {children}
    </button>
  );
}
