"use client";

import { useState, type ReactNode } from "react";

/**
 * The big rectangular "See all the graphs" bar. Closed, it costs the page nothing: the charts are
 * mounted the first time it is opened, and kept (so filters and selections survive closing it).
 */
export function AllGraphs({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      id="all-graphs"
      className="card group scroll-mt-24 overflow-hidden"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) setOpened(true);
      }}
    >
      <summary className="flex items-center justify-between gap-4 bg-[linear-gradient(100deg,#f6e9ed,#faf6ef_60%,#f3eadf)] px-5 py-5 sm:px-7 sm:py-6">
        <span className="min-w-0">
          <span className="section-kicker block">Every graph</span>
          <span className="mt-1 block font-serif text-[22px] font-semibold leading-snug text-ink sm:text-[28px]">{title}</span>
          <span className="mt-0.5 block text-[13.5px] text-ink-2">{subtitle}</span>
        </span>
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wine text-2xl leading-none text-white">
          <span className="when-closed">+</span>
          <span className="when-open">−</span>
        </span>
      </summary>
      <div className="border-t border-line bg-bg px-1 pb-6 pt-1 sm:px-3">{opened ? <div className="rise">{children}</div> : null}</div>
    </details>
  );
}
