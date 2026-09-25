"use client";

import type { ReactNode } from "react";

export interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Floating tooltip positioned inside a relatively-positioned chart container. */
export function ChartTooltip({ state, containerWidth }: { state: TooltipState | null; containerWidth: number }) {
  if (!state) return null;
  const width = Math.min(280, containerWidth - 16);
  const left = Math.max(8, Math.min(state.x - width / 2, containerWidth - width - 8));
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-lg border border-line bg-surface p-3 text-xs shadow-lg"
      style={{ left, top: Math.max(0, state.y), width, transform: "translateY(calc(-100% - 10px))" }}
    >
      {state.content}
    </div>
  );
}
