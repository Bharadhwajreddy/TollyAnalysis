import "server-only";
import { getDb } from "@/db/client";
import { loadActiveMethodology, loadDataset, loadLatestSnapshots } from "@/db/repository";
import { runEngine } from "@/lib/calculations/engine";

/**
 * Live mode: the dashboard reads the latest persisted hero snapshots written by
 * the recalculation job; film-level Annexure detail is derived from the same
 * dataset and active methodology.
 */
export async function loadLive() {
  const db = await getDb();
  const active = await loadActiveMethodology(db);
  if (!active) throw new Error("No active methodology version. Run `npm run db:seed` first.");
  const [dataset, latest] = await Promise.all([loadDataset(db), loadLatestSnapshots(db, active.rowId)]);
  const engine = runEngine(dataset, active.methodology, latest.calculatedAt ?? new Date().toISOString());
  return { dataset, methodology: active.methodology, engine, snapshots: latest.snapshots, calculatedAt: latest.calculatedAt };
}
