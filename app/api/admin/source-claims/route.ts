import { NextResponse } from "next/server";
import { addSourceClaim } from "@/db/admin";
import { getDb } from "@/db/client";
import { adminError, adminJsonRoute } from "@/lib/admin/route";
import { ADMIN_ACTOR, guardAdmin, requireDatabase } from "@/lib/auth/admin";
import { parseCsv } from "@/lib/csv";
import { invalidateCache } from "@/lib/repositories";
import { sourceClaimInput } from "@/lib/validation/admin";

const jsonRoute = adminJsonRoute(sourceClaimInput, addSourceClaim);

/**
 * POST JSON (one claim) or text/csv (bulk). CSV columns:
 * kind,filmSlug,sourceKey,metricType,versionScope,territory,currency,amountLow,amountHigh,valueText,confidence,approvalStatus,sourceUrl,observedAt
 * (reception rows use provider,rating,voteCount instead of the commercial columns).
 */
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("text/csv")) return jsonRoute(req);
  const denied = (await guardAdmin(req)) ?? requireDatabase();
  if (denied) return denied;
  try {
    const rows = parseCsv(await req.text());
    if (rows.length > 2000) return NextResponse.json({ error: "Max 2000 rows per import" }, { status: 413 });
    const db = await getDb();
    const results: { row: number; ok: boolean; error?: string }[] = [];
    for (const [i, raw] of rows.entries()) {
      const candidate = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "")) as Record<string, unknown>;
      for (const k of ["rating", "voteCount"]) if (candidate[k] !== undefined) candidate[k] = Number(candidate[k]);
      const parsed = sourceClaimInput.safeParse(candidate);
      if (!parsed.success) {
        results.push({ row: i + 2, ok: false, error: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
        continue;
      }
      try {
        await addSourceClaim(db, parsed.data, ADMIN_ACTOR);
        results.push({ row: i + 2, ok: true });
      } catch (err) {
        results.push({ row: i + 2, ok: false, error: (err as Error).message });
      }
    }
    invalidateCache();
    return NextResponse.json({ ok: true, imported: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok) });
  } catch (err) {
    return adminError(err);
  }
}
