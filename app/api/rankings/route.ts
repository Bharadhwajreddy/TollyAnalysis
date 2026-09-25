import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api-response";
import { METRICS } from "@/lib/constants/metrics";
import { getHeroSnapshots, getMeta } from "@/lib/repositories";
import { queryObject, rankingsQuery } from "@/lib/validation/api";

export async function GET(req: Request) {
  const parsed = rankingsQuery.safeParse(queryObject(req.url));
  if (!parsed.success) return badRequest(parsed.error);
  const { metric, window, includeEmerging } = parsed.data;
  const meta = METRICS[metric];
  const snaps = await getHeroSnapshots(window, includeEmerging);
  const withValue = snaps.filter((s) => s.metrics[metric].value !== null);
  const dir = meta.higherIsBetter ? -1 : 1;
  withValue.sort((a, b) => dir * ((a.metrics[metric].value as number) - (b.metrics[metric].value as number)));
  return NextResponse.json({
    meta: await getMeta(),
    metric: { key: metric, label: meta.label, higherIsBetter: meta.higherIsBetter, definition: meta.definition },
    window,
    includeEmerging,
    rankings: withValue.map((s, i) => ({
      rank: i + 1,
      slug: s.slug,
      name: s.name,
      value: s.metrics[metric].value,
      coverage: s.metrics[metric].coverage,
      status: s.metrics[metric].status,
      explanation: s.metrics[metric].explanation,
      confidence: s.confidence,
      methodologyVersion: s.metrics[metric].methodVersion,
    })),
    insufficient: snaps.filter((s) => s.metrics[metric].value === null).map((s) => s.slug),
  });
}
