import { NextResponse } from "next/server";
import { badRequest, publicSnapshot } from "@/lib/api-response";
import { getHeroSnapshots, getMeta } from "@/lib/repositories";
import { compareQuery, queryObject } from "@/lib/validation/api";

export async function GET(req: Request) {
  const parsed = compareQuery.safeParse(queryObject(req.url));
  if (!parsed.success) return badRequest(parsed.error);
  const snaps = await getHeroSnapshots(parsed.data.window, true);
  const heroes = parsed.data.heroes.map((slug) => snaps.find((s) => s.slug === slug) ?? null);
  return NextResponse.json({
    meta: await getMeta(),
    window: parsed.data.window,
    heroes: heroes.map((h, i) => (h ? publicSnapshot(h) : { slug: parsed.data.heroes[i], error: "not_found" })),
  });
}
