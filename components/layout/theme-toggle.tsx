"use client";

import { useRef, useSyncExternalStore } from "react";
import { useHoverKey, useSlidingIndicator } from "@/components/ui/use-sliding-indicator";

type Theme = "system" | "light" | "dark";
const KEY = "ta-theme";

/** Runs before first paint (inlined in the layout) so a saved theme never flashes. */
export const THEME_GUARD = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const listeners = new Set<() => void>();
function read(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}
function write(t: Theme) {
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  listeners.forEach((l) => l());
}

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "Match system", icon: <path d="M3 4h14v9H3zM7 16h6" /> },
  { value: "light", label: "Light", icon: <><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" /></> },
  { value: "dark", label: "Dark", icon: <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" /> },
];

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "system" as Theme,
  );
  const box = useRef<HTMLDivElement>(null);
  const { hover, bind } = useHoverKey();
  const pill = useSlidingIndicator<HTMLDivElement, HTMLSpanElement>(box, theme);
  const ghost = useSlidingIndicator<HTMLDivElement, HTMLSpanElement>(box, hover && hover !== theme ? hover : null);
  return (
    <div ref={box} role="radiogroup" aria-label="Colour theme" {...bind} className="relative inline-flex rounded-full bg-surface-2 p-[3px]">
      <span ref={ghost} aria-hidden className="slide-ind rounded-full bg-surface/50" />
      <span ref={pill} aria-hidden className="slide-ind rounded-full bg-surface shadow-[0_0_0_1px_var(--rule)]" />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          data-ind={o.value}
          onClick={() => write(o.value)}
          className={`relative z-[1] grid h-8 w-8 place-items-center rounded-full transition-colors ${theme === o.value ? "text-ink" : "text-muted hover:text-ink"}`}
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {o.icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
