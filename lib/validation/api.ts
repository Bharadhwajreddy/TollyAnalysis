import { z } from "zod";
import { METRICS } from "@/lib/constants/metrics";
import type { HeroMetricKey } from "@/lib/calculations/engine";

export const windowSchema = z.enum(["all_time", "last_5_years", "last_10_films"]).default("all_time");
export const boolParam = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");
export const metricSchema = z
  .string()
  .default("hpi")
  .refine((v): v is HeroMetricKey => v in METRICS, "Unknown metric")
  .transform((v) => v as HeroMetricKey);
export const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export const rankingsQuery = z.object({ metric: metricSchema, window: windowSchema, includeEmerging: boolParam });
export const compareQuery = z.object({
  heroes: z
    .string()
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(slugSchema).min(2, "Pick at least 2 heroes").max(4, "Compare at most 4 heroes")),
  window: windowSchema,
});
export const filmsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export function queryObject(url: string) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}
