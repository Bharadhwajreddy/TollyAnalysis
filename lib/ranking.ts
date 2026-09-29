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
