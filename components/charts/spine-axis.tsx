"use client";

import { useElementWidth } from "@/components/charts/use-width";
import { spine } from "@/lib/timeline";

/** Year ticks for the shared time spine, at the same positions FilmStrip uses for the same width and domain. */
export function SpineAxis({ start, end, className = "" }: { start: number; end: number; className?: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(600);
  const s = spine(start, end, 4, Math.max(10, width - 4), width < 520 ? 5 : width < 900 ? 2 : 1);
  return (
    <div ref={ref} aria-hidden className={`relative h-4 ${className}`}>
      {s.ticks.map((t) => (
        <span key={t} className="tabular absolute -translate-x-1/2 text-[10.5px] text-muted" style={{ left: s.x(t) }}>
          {t}
        </span>
      ))}
    </div>
  );
}
