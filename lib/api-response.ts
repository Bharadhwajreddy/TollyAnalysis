import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { HeroSnapshot } from "@/lib/calculations/engine";

export function badRequest(err: ZodError) {
  return NextResponse.json(
    { error: "Invalid request", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
    { status: 400 },
  );
}

export function notFound(what = "Not found") {
  return NextResponse.json({ error: what }, { status: 404 });
}

/** Public shape of a hero snapshot: every metric carries value, coverage, status and methodology version. */
export function publicSnapshot(s: HeroSnapshot) {
  return {
    slug: s.slug,
    name: s.name,
    industry: s.industry,
    window: s.window,
    isEmerging: s.isEmerging,
    careerFilmCount: s.careerFilmCount,
    eligibleFilmCount: s.eligibleFilmCount,
    scoredFilmCount: s.scoredFilmCount,
    coLeadFilmCount: s.coLeadFilmCount,
    dubbedFilmCount: s.dubbedFilmCount,
    ottFilmCount: s.ottFilmCount,
    firstYear: s.firstYear,
    lastYear: s.lastYear,
    evidenceCoveragePercent: s.evidenceCoveragePercent,
    confidence: s.confidence,
    metrics: s.metrics,
    socialSnapshotAt: s.socialSnapshotAt,
    methodologyVersion: s.methodologyVersion,
    calculatedAt: s.calculatedAt,
  };
}
