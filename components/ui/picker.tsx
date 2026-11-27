"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * A compact select: a button that shows "Label  Value ▾" and opens a listbox popover. Arrow keys move,
 * Enter/Space choose, Escape closes and returns focus, typing a letter jumps. Used where a Segmented
 * control would hold too many options (chart axes).
 */
export function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openAt = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
    requestAnimationFrame(() => list.current?.focus());
  };
  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    setOpen(false);
    btn.current?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const d = e.key === "ArrowDown" ? 1 : -1;
      let i = active;
      for (let n = 0; n < options.length; n++) {
        i = (i + d + options.length) % options.length;
        if (!options[i].disabled) break;
      }
      setActive(i);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") btn.current?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
    } else if (/^[a-z0-9₹]$/i.test(e.key)) {
      const i = options.findIndex((o, k) => k > active && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      const j = i >= 0 ? i : options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (j >= 0) setActive(j);
    }
  };

  return (
    <div ref={box} className={`relative inline-block ${className}`}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-l`}
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openAt();
          }
        }}
        className="inline-flex h-[34px] max-w-full items-center gap-2 rounded-[10px] bg-surface-2 py-1 pl-3 pr-2.5 text-[13px] transition-colors duration-150 hover:bg-surface-3 max-sm:h-10"
      >
        <span className="text-muted">{label}</span>
        <span className="truncate font-medium text-ink">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={`shrink-0 text-muted transition-transform duration-[var(--dur-2)] ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-l`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onKey}
          className="pop-in absolute left-0 top-[calc(100%+6px)] z-50 max-h-[320px] min-w-[220px] overflow-auto rounded-[12px] border border-rule bg-surface p-1 shadow-[var(--shadow-pop)] outline-none"
        >
          {options.map((o, i) => {
            const sel = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-${i}`}
                data-i={i}
                role="option"
                aria-selected={sel}
                aria-disabled={o.disabled || undefined}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-baseline justify-between gap-4 rounded-[8px] px-2.5 py-2 text-[13px] ${i === active ? "bg-surface-2" : ""} ${o.disabled ? "cursor-default opacity-40" : ""}`}
              >
                <span className={sel ? "font-semibold text-ink" : "text-ink-2"}>{o.label}</span>
                {o.hint && <span className="text-[11.5px] text-muted">{o.hint}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
