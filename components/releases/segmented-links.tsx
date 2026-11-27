"use client";

import Link from "next/link";
import { useRef } from "react";
import { useHoverKey, useSlidingIndicator } from "@/components/ui/use-sliding-indicator";

/**
 * The Segmented look (sunken track, gliding pill, hover ghost) for options that are links, so the choice
 * lives in the URL and works without JavaScript.
 */
export function SegmentedLinks({ options, value, label }: { options: { value: string; label: React.ReactNode; href: string; count?: number }[]; value: string; label: string }) {
  const box = useRef<HTMLElement>(null);
  const { hover, bind } = useHoverKey();
  const pill = useSlidingIndicator<HTMLElement, HTMLSpanElement>(box, value);
  const ghost = useSlidingIndicator<HTMLElement, HTMLSpanElement>(box, hover && hover !== value ? hover : null);
  return (
    <nav ref={box} aria-label={label} {...bind} className="scroll-x relative inline-flex max-w-full rounded-[10px] bg-surface-2 p-[3px]">
      <span ref={ghost} aria-hidden className="slide-ind rounded-[8px] bg-surface/60" />
      <span ref={pill} aria-hidden className="slide-ind rounded-[8px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--rule)]" />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Link
            key={o.value}
            href={o.href}
            scroll={false}
            data-ind={o.value}
            aria-current={on ? "page" : undefined}
            className={`relative z-[1] inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 py-[7px] text-[13px] font-medium transition-colors duration-150 max-sm:py-[10px] ${on ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {o.label}
            {o.count !== undefined && <span className={`tabular text-[12px] ${on ? "text-muted" : "text-faint"}`}>{o.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
