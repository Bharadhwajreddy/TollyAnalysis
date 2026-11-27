"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface FloatTipState {
  /** Anchor point in viewport coordinates (the mark's top centre). */
  x: number;
  y: number;
  /** Bottom of the mark, used when the tip flips below. */
  y2?: number;
  content: ReactNode;
}

/**
 * The one tooltip: rendered in a portal with `position: fixed`, so a sticky header or an overflow container
 * never clips it. Sits above the anchor with an arrow; flips below when there is no room; clamps to the
 * viewport with an 8 px margin.
 */
export function FloatTip({ state }: { state: FloatTipState | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean; arrow: number } | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useLayoutEffect(() => {
    if (!state || !ref.current) return setPos(null);
    const r = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const headerH = 72;
    let below = state.y - r.height - 12 < headerH;
    let top = below ? (state.y2 ?? state.y) + 12 : state.y - r.height - 12;
    if (below && top + r.height > window.innerHeight - 8) {
      below = false;
      top = Math.max(8, state.y - r.height - 12);
    }
    const left = Math.min(vw - r.width - 8, Math.max(8, state.x - r.width / 2));
    setPos({ left, top, below, arrow: Math.min(r.width - 14, Math.max(14, state.x - left)) });
  }, [state]);

  if (!mounted || !state) return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none fixed z-[90] w-max max-w-[260px] rounded-[10px] border border-rule bg-surface px-3 py-2.5 text-[12.5px] leading-snug text-ink shadow-[var(--shadow-pop)]"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, opacity: pos ? 1 : 0, transition: "opacity 120ms var(--ease-out)" }}
    >
      {state.content}
      {pos && (
        <span
          aria-hidden
          className="absolute h-2.5 w-2.5 rotate-45 border-rule bg-surface"
          style={{
            left: pos.arrow - 5,
            ...(pos.below ? { top: -6, borderLeftWidth: 1, borderTopWidth: 1 } : { bottom: -6, borderRightWidth: 1, borderBottomWidth: 1 }),
          }}
        />
      )}
    </div>,
    document.body,
  );
}

/** A key/value row inside a tooltip. */
export function TipRow({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted">{k}</span>
      <span className="tabular text-right font-medium text-ink">{v}</span>
    </div>
  );
}
