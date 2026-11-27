"use client";

import { useRef, type KeyboardEvent } from "react";
import { useHoverKey, useSlidingIndicator } from "@/components/ui/use-sliding-indicator";

/**
 * The one toggle style for the whole site (views, time windows, metric tabs, filters): a sunken track with a
 * raised pill that glides to the selected option; a faint ghost follows the pointer. Arrow keys move the
 * selection (radiogroup pattern).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className = "",
}: {
  options: { value: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const { hover, bind } = useHoverKey();
  const pill = useSlidingIndicator<HTMLDivElement, HTMLSpanElement>(box, value);
  const ghost = useSlidingIndicator<HTMLDivElement, HTMLSpanElement>(box, hover && hover !== value ? hover : null);

  const onKey = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(i + step + options.length) % options.length];
    onChange(next.value);
    box.current?.querySelector<HTMLButtonElement>(`[data-ind="${CSS.escape(next.value)}"]`)?.focus();
  };

  return (
    <div
      ref={box}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      {...bind}
      className={`relative inline-flex max-w-full rounded-[10px] bg-surface-2 p-[3px] ${className}`}
    >
      <span ref={ghost} aria-hidden className="slide-ind rounded-[8px] bg-surface/60" />
      <span ref={pill} aria-hidden className="slide-ind rounded-[8px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--rule)]" />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={o.title}
            data-ind={o.value}
            onClick={() => onChange(o.value)}
            className={`relative z-[1] whitespace-nowrap rounded-[8px] font-medium transition-colors duration-150 ${size === "sm" ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-[7px] text-[13px] max-sm:py-[9px]"} ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
