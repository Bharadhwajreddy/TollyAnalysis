"use client";

import { useId } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Pill radio group on wider screens, native dropdown on phones. */
export function MetricPicker<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink md:hidden"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div role="radiogroup" aria-label={label} className="hidden flex-wrap gap-1.5 md:flex">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                active ? "border-wine bg-wine text-white" : "border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
