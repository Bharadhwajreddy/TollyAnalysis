/** Recalculates all hero snapshots from the database. Usage: npm run db:recalculate */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Db } from "@/db/client";
import { recalculate } from "@/db/repository";
import * as schema from "@/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL first (see .env.example)");
  const client = postgres(url, { max: 1, prepare: false });
  console.log("✓", await recalculate(drizzle(client, { schema }) as unknown as Db, "cli"));
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
