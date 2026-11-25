import { HERO_FACTORS, hasMoneyData, type HeroFactorKey } from "@/lib/tolly";
import type { TollyHeroView } from "@/lib/tolly/view";

export const PILLARS = [
  { key: "rating", label: "Rating", question: "Did people like his films?", weight: "50%", color: "var(--wine)" },
  { key: "reach", label: "Reach", question: "How many people cared?", weight: "30%", color: "#00798c" },
  { key: "stay", label: "Staying power", question: "Do people still care?", weight: "20%", color: "#b7791f" },
] as const;

/** The five groups the 15 factors fall into: what the ranking table, hero cards and head-to-head show. */
export const GROUPS = [
  { key: "audience", label: "Audience", question: "Do people love his films?", color: "var(--wine)" },
  { key: "boxoffice", label: "Box office", question: "How often and how big do his films hit?", color: "#2a78d6" },
  { key: "recent", label: "Recent form", question: "How are his latest films doing?", color: "#1baf7a" },
  { key: "fame", label: "Fame", question: "How many fans follow him?", color: "#b7791f" },
  { key: "career", label: "Career", question: "How steady, long and busy is his career?", color: "#8a7f78" },
] as const;
export type GroupKey = (typeof GROUPS)[number]["key"];

/** A group's 0–100 value (the weighted mean of the factors he has data for) and its share of his final index. */
export function groupValue(hero: Pick<TollyHeroView, "factors">, group: GroupKey): { value: number | null; share: number } {
  let sum = 0;
  let w = 0;
  let share = 0;
  for (const f of HERO_FACTORS) {
    if (f.group !== group) continue;
    const part = hero.factors?.[f.key];
    if (!part || part.value === null) continue;
    sum += part.value * f.weight;
    w += f.weight;
    share += part.share;
  }
  return { value: w ? Math.round((sum / w) * 10) / 10 : null, share: Math.round(share * 10) / 10 };
}

const crore = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")} cr`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The plain number behind a factor ("14 hits from 20 films"), or null when there is none. */
export function kpiFact(hero: Pick<TollyHeroView, "career" | "followers" | "complete" | "spread" | "followersPending">, key: HeroFactorKey, followers: (n: number) => string): string | null {
  const c = hero.career;
  switch (key) {
    case "audience":
      return `${hero.complete} rated films`;
    case "success":
      return c && c.judged ? `${plural(c.hits, "hit")} from ${c.judged} films` : null;
    case "hits":
      return c && c.judged ? plural(c.hits, "hit film") : null;
    case "blockbusters":
      return c && c.blockbusters !== null ? plural(c.blockbusters, "blockbuster") : null;
    case "bigFilms":
      return c && c.bigFilms !== null ? plural(c.bigFilms, "film") + " over ₹100 cr" : null;
    case "totalGross":
      return c && c.totalGross !== null ? crore(c.totalGross) : null;
    case "topGross":
      return c && c.topGross !== null ? crore(c.topGross) : null;
    case "avgGross":
      return c && c.avgGross !== null ? `${crore(c.avgGross)} per film` : null;
    case "recent":
      return c && c.recentJudged ? `${plural(c.recentHits, "hit")} in his latest ${c.recentJudged}` : null;
    case "fame":
      return hero.followers ? `${followers(hero.followers.total)} followers` : hero.followersPending ? "follower count being checked" : "no official account";
    case "consistency":
      return hero.spread !== null ? `film scores vary by ${hero.spread.toFixed(1)}` : null;
    case "films":
      return c ? plural(c.leadFilms, "film") + " as lead" : null;
    case "years":
      return c && c.yearsActive !== null ? `${c.yearsActive} years active` : null;
    case "peak":
      return c && c.peakFilms !== null ? `${plural(c.peakFilms, "film")} in his busiest year` : null;
    case "gap":
      return c && c.releaseGap !== null ? `a film every ${c.releaseGap} months, typically` : null;
  }
}

/** One line for a whole group, used in the head-to-head. */
export function groupFact(hero: Pick<TollyHeroView, "career" | "followers" | "complete" | "spread" | "followersPending">, group: GroupKey, followers: (n: number) => string): string | null {
  const c = hero.career;
  switch (group) {
    case "audience":
      return kpiFact(hero, "audience", followers);
    case "boxoffice":
      return c && c.judged ? `${plural(c.hits, "hit")} from ${c.judged} films` + (c.totalGross !== null && hasMoneyData(c) ? ` · ${crore(c.totalGross)}` : "") : null;
    case "recent":
      return kpiFact(hero, "recent", followers);
    case "fame":
      return kpiFact(hero, "fame", followers);
    case "career":
      return c ? `${plural(c.leadFilms, "film")} · ${c.yearsActive ?? "—"} years` : null;
  }
}

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
export function BandBar({ index, band, min = 40, max = 80, color = "var(--wine)" }: { index: number; band: number | null; min?: number; max?: number; color?: string }) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  const lo = index - (band ?? 0);
  const hi = index + (band ?? 0);
  return (
    <span className="relative block h-3 w-full rounded-full bg-surface-2 ring-1 ring-line" role="img" aria-label={`${index.toFixed(1)}, range ${lo.toFixed(1)} to ${hi.toFixed(1)}`}>
      {band !== null && <span className="absolute inset-y-0 rounded-full opacity-30" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})`, background: color }} />}
      <span className="absolute -top-0.5 h-4 w-1 -translate-x-1/2 rounded-full" style={{ left: pos(index), background: color }} />
    </span>
  );
}

export const PROVISIONAL_TIP = "Provisional: box-office results for Tamil, Malayalam and Kannada films are less complete, so this score may be too high.";

/** Small marker for a provisional score. */
export function ProvisionalMark() {
  return (
    <span title={PROVISIONAL_TIP} className="ml-1.5 inline-flex shrink-0 items-center rounded-full bg-gold-soft px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-warn">
      Provisional
    </span>
  );
}

