/** Applies SQL migrations in db/migrations to DATABASE_URL. Usage: npm run db:migrate */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL first (see .env.example)");
  const client = postgres(url, { max: 1, prepare: false });
  await migrate(drizzle(client), { migrationsFolder: "db/migrations" });
  console.log("✓ Migrations applied");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
