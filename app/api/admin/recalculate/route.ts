import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { recalculate } from "@/db/repository";
import { adminError } from "@/lib/admin/route";
import { ADMIN_ACTOR, guardAdmin, requireDatabase } from "@/lib/auth/admin";
import { invalidateCache } from "@/lib/repositories";

export async function POST(req: Request) {
  const denied = (await guardAdmin(req)) ?? requireDatabase();
  if (denied) return denied;
  try {
    const result = await recalculate(await getDb(), ADMIN_ACTOR);
    invalidateCache();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return adminError(err);
  }
}
