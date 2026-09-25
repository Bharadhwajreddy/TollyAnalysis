import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { recalculate } from "@/db/repository";
import { adminError } from "@/lib/admin/route";
import { serverEnv } from "@/lib/env";
import { ADMIN_ACTOR, guardAdmin } from "@/lib/auth/admin";
import { getCorrectionStore } from "@/lib/repositories/corrections";
import { invalidateCache } from "@/lib/repositories";
import { correctionReviewSchema } from "@/lib/validation/corrections";

export async function POST(req: Request, ctx: RouteContext<"/api/admin/corrections/[id]/review">) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  try {
    const id = z.string().uuid().parse((await ctx.params).id);
    const review = correctionReviewSchema.parse(await req.json());
    const updated = await (await getCorrectionStore()).review(id, review, ADMIN_ACTOR);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Approved data changes trigger a recalculation so affected heroes update.
    let recalculated = null;
    if (review.status === "approved" && review.dataAction && review.dataAction !== "no_data_change" && serverEnv().DATABASE_URL)
      recalculated = await recalculate(await getDb(), ADMIN_ACTOR, `Correction ${id.slice(0, 8)} approved`);
    invalidateCache();
    return NextResponse.json({ ok: true, item: updated, recalculated });
  } catch (err) {
    return adminError(err);
  }
}
