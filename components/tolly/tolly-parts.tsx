import type { TollyHeroView } from "@/lib/tolly/view";

export const PILLARS = [
  { key: "rating", label: "Rating", question: "Did people like his films?", weight: "50%", color: "var(--wine)" },
  { key: "reach", label: "Reach", question: "How many people cared?", weight: "30%", color: "#00798c" },
  { key: "stay", label: "Staying power", question: "Do people still care?", weight: "20%", color: "#b7791f" },
] as const;

/** One 0–100 bar with its value. */
export function PillarBar({ label, value, color, sub }: { label: string; value: number | null; color: string; sub?: string }) {
  return (
    <div className="grid grid-cols-[112px_1fr_44px] items-center gap-3 sm:grid-cols-[150px_1fr_48px]">
      <span className="text-[13px] leading-tight text-ink-2">
        {label}
        {sub && <span className="block text-[11px] text-muted">{sub}</span>}
      </span>
      <span className="relative h-3 rounded-full bg-surface-2 ring-1 ring-line" role="img" aria-label={`${label}: ${value ?? "no data"} out of 100`}>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${value === null ? 0 : Math.max(0, Math.min(100, value))}%`, background: color }} />
        <span aria-hidden className="absolute -top-1 h-5 w-px bg-ink/40" style={{ left: "50%" }} />
      </span>
      <span className="tabular text-right text-[13px] font-semibold text-ink">{value === null ? "—" : value.toFixed(1)}</span>
    </div>
  );
}

/** "73.8 ± 3.5" as one unit. */
export function IndexValue({ hero, size = "lg" }: { hero: Pick<TollyHeroView, "index" | "band">; size?: "lg" | "sm" }) {
  if (hero.index === null) return <span className="text-muted">—</span>;
  return (
    <span className="tabular whitespace-nowrap">
      <span className={size === "lg" ? "text-[44px] font-semibold leading-none tracking-tight text-wine" : "font-semibold text-ink"}>{hero.index.toFixed(1)}</span>
      {hero.band !== null && <span className={size === "lg" ? "ml-2 text-[18px] text-muted" : "ml-1 text-[12px] text-muted"}>± {hero.band.toFixed(1)}</span>}
    </span>
  );
}

/** Index with its ± band drawn on a 0–100 axis (a band that overlaps another means "about level"). */
export function BandBar({ index, band, min = 40, max = 80 }: { index: number; band: number | null; min?: number; max?: number }) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  const lo = index - (band ?? 0);
  const hi = index + (band ?? 0);
  return (
    <span className="relative block h-3 w-full rounded-full bg-surface-2 ring-1 ring-line" role="img" aria-label={`${index.toFixed(1)}, range ${lo.toFixed(1)} to ${hi.toFixed(1)}`}>
      {band !== null && <span className="absolute inset-y-0 rounded-full bg-wine/25" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />}
      <span className="absolute -top-0.5 h-4 w-1 -translate-x-1/2 rounded-full bg-wine" style={{ left: pos(index) }} />
    </span>
  );
}
