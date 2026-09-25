import { NextResponse } from "next/server";
import { badRequest, notFound } from "@/lib/api-response";
import { getHeroFilms, getMeta, getPerson } from "@/lib/repositories";
import { filmsQuery, queryObject, slugSchema } from "@/lib/validation/api";

export async function GET(req: Request, ctx: RouteContext<"/api/heroes/[slug]/films">) {
  const slug = slugSchema.safeParse((await ctx.params).slug);
  if (!slug.success) return badRequest(slug.error);
  const q = filmsQuery.safeParse(queryObject(req.url));
  if (!q.success) return badRequest(q.error);
  if (!(await getPerson(slug.data))) return notFound("Hero not found");
  const films = await getHeroFilms(slug.data);
  const { page, pageSize } = q.data;
  return NextResponse.json({
    meta: await getMeta(),
    page,
    pageSize,
    total: films.length,
    totalPages: Math.max(1, Math.ceil(films.length / pageSize)),
    films: films.slice((page - 1) * pageSize, page * pageSize),
  });
}
