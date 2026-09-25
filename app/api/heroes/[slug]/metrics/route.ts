import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, notFound, publicSnapshot } from "@/lib/api-response";
import { getHeroSnapshots, getMeta } from "@/lib/repositories";
import { queryObject, slugSchema, windowSchema } from "@/lib/validation/api";

export async function GET(req: Request, ctx: RouteContext<"/api/heroes/[slug]/metrics">) {
  const parsed = z.object({ slug: slugSchema, window: windowSchema }).safeParse({ ...queryObject(req.url), slug: (await ctx.params).slug });
  if (!parsed.success) return badRequest(parsed.error);
  const snap = (await getHeroSnapshots(parsed.data.window, true)).find((s) => s.slug === parsed.data.slug);
  if (!snap) return notFound("Hero not found or has no eligible lead films");
  return NextResponse.json({ meta: await getMeta(), snapshot: publicSnapshot(snap) });
}
