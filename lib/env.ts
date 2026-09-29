import { z } from "zod";

const flag = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const serverSchema = z.object({
  NEXT_PUBLIC_DATA_MODE: z.enum(["real", "demo", "live"]).default("real"),
  DATABASE_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  ADMIN_TOKEN: z.string().min(16).optional().or(z.literal("").transform(() => undefined)),
  TMDB_API_READ_TOKEN: z.string().optional(),
  FEATURE_TMDB: flag,
  FEATURE_IMDB_LICENSED: flag,
  IMDB_LICENSED_ENDPOINT: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  IMDB_LICENSED_API_KEY: z.string().optional(),
  FEATURE_INSTAGRAM: flag,
  META_GRAPH_ACCESS_TOKEN: z.string().optional(),
  META_IG_BUSINESS_ACCOUNT_ID: z.string().optional(),
  FEATURE_X: flag,
  X_BEARER_TOKEN: z.string().optional(),
  FEATURE_YOUTUBE: flag,
  YOUTUBE_API_KEY: z.string().optional(),
  FEATURE_FACEBOOK: flag,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/** Server-only environment. Never import this from a client component. */
export function serverEnv(): ServerEnv {
  if (!cached) cached = serverSchema.parse(process.env);
  return cached;
}

/**
 * Safe to use on the client: only the public data-mode flag.
 * - real (default): Wikipedia/Wikidata snapshot bundled with the app
 * - demo: synthetic data for layout testing
 * - live: Postgres database
 */
export const DATA_MODE: "real" | "demo" | "live" =
  process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : process.env.NEXT_PUBLIC_DATA_MODE === "demo" ? "demo" : "real";
