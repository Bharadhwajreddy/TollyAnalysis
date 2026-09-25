import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Any Drizzle Postgres database (postgres-js in the app, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __taDb?: Db };

/** Lazily creates the pooled postgres-js client from DATABASE_URL (server only). */
export async function getDb(): Promise<Db> {
  if (g.__taDb) return g.__taDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const [{ drizzle }, { default: postgres }] = await Promise.all([import("drizzle-orm/postgres-js"), import("postgres")]);
  // prepare:false keeps compatibility with Supabase's transaction pooler.
  const client = postgres(url, { prepare: false, max: 5 });
  g.__taDb = drizzle(client, { schema }) as unknown as Db;
  return g.__taDb;
}

export { schema };
