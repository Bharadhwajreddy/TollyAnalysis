import { NextResponse } from "next/server";
import { getHeroSnapshots, getMeta } from "@/lib/repositories";

export async function GET() {
  const [heroes, meta] = await Promise.all([getHeroSnapshots("all_time", true), getMeta()]);
  return NextResponse.json({
    meta,
    heroes: heroes.map((h) => ({
      slug: h.slug,
      name: h.name,
      industry: h.industry,
      eligibleLeadFilms: h.careerFilmCount,
      isEmerging: h.isEmerging,
      confidence: h.confidence,
    })),
  });
}
