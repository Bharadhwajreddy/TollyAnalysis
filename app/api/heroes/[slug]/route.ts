import { NextResponse } from "next/server";
import { badRequest, notFound, publicSnapshot } from "@/lib/api-response";
import { getHeroSnapshots, getMeta, getPerson } from "@/lib/repositories";
import { slugSchema } from "@/lib/validation/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/heroes/[slug]">) {
  const parsed = slugSchema.safeParse((await ctx.params).slug);
  if (!parsed.success) return badRequest(parsed.error);
  const person = await getPerson(parsed.data);
  if (!person) return notFound("Hero not found");
  const snap = (await getHeroSnapshots("all_time", true)).find((s) => s.slug === parsed.data);
  return NextResponse.json({
    meta: await getMeta(),
    hero: { slug: person.slug, name: person.displayName, industry: person.industry, status: person.status },
    allTime: snap ? publicSnapshot(snap) : null,
  });
}
