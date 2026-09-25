/**
 * Seeds sources, the active methodology and the curated roster, then recalculates.
 *   npm run db:seed        → roster only (no films; add real, verified data via admin)
 *   npm run db:seed:demo   → also loads fictional demo films flagged is_demo=true
 *   npm run db:seed -- --purge-demo  → removes demo films
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Db } from "@/db/client";
import { purgeDemoFilms, recalculate, seed } from "@/db/repository";
import * as schema from "@/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL first (see .env.example)");
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema }) as unknown as Db;

  if (process.argv.includes("--purge-demo")) {
    console.log(`✓ Removed ${await purgeDemoFilms(db)} demo films`);
  } else {
    const res = await seed(db, { demo: process.argv.includes("--demo") });
    console.log("✓ Seeded", res);
  }
  console.log("✓ Recalculated", await recalculate(db, "seed-script", "Post-seed recalculation"));
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
