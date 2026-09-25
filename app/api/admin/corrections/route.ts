import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth/admin";
import { getCorrectionStore, type CorrectionStatus } from "@/lib/repositories/corrections";

export async function GET(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as CorrectionStatus | null;
  const type = url.searchParams.get("type");
  const items = await (await getCorrectionStore()).list({ status: status ?? undefined, type: type ?? undefined });
  return NextResponse.json({ items });
}
