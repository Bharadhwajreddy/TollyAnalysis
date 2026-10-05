import type { HeroMetricKey } from "@/lib/calculations/engine";
import { METRICS } from "@/lib/constants/metrics";
import type { HeroView } from "@/lib/view-models";

/** True when a hero has a value and enough films behind it to be ranked on `key`. */
export function rankable(h: HeroView, key: HeroMetricKey): boolean {
  const mv = h.m[key];
  return mv.v !== null && mv.n >= (METRICS[key].minSample ?? 0);
}

/** Rankable heroes for `key`, best first (ascending for lower-is-better metrics). */
export function rankBy(heroes: HeroView[], key: HeroMetricKey): HeroView[] {
  const dir = METRICS[key].higherIsBetter ? -1 : 1;
  return heroes
    .filter((h) => rankable(h, key))
    .sort((a, b) => dir * ((a.m[key].v as number) - (b.m[key].v as number)) || a.name.localeCompare(b.name));
}

/**
 * Competition ranks ("1, 1, 3"): heroes with the same displayed value share a place and
 * the next rank skips the tied entries. Returns slug → label such as "#1" or "#1 tie".
 */
export function competitionRanks(ranked: HeroView[], key: HeroMetricKey): Map<string, { rank: number; label: string }> {
  const out = new Map<string, { rank: number; label: string }>();
  const shown = (h: HeroView) => (h.m[key].v as number).toFixed(METRICS[key].decimals);
  ranked.forEach((h, i) => {
    const rank = i > 0 && shown(ranked[i - 1]) === shown(h) ? out.get(ranked[i - 1].slug)!.rank : i + 1;
    out.set(h.slug, { rank, label: `#${rank}` });
  });
  const counts = new Map<number, number>();
  for (const v of out.values()) counts.set(v.rank, (counts.get(v.rank) ?? 0) + 1);
  for (const v of out.values()) if ((counts.get(v.rank) ?? 0) > 1) v.label = `#${v.rank} tie`;
  return out;
}
