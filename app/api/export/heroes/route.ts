import { badRequest } from "@/lib/api-response";
import { getHeroSnapshots, getMeta } from "@/lib/repositories";
import { boolParam, queryObject, windowSchema } from "@/lib/validation/api";
import { z } from "zod";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of the filtered hero table, with provenance/disclaimer columns. */
export async function GET(req: Request) {
  const parsed = z
    .object({ window: windowSchema, includeEmerging: boolParam, q: z.string().max(80).optional() })
    .safeParse(queryObject(req.url));
  if (!parsed.success) return badRequest(parsed.error);
  const { window, includeEmerging, q } = parsed.data;
  const meta = await getMeta();
  const snaps = (await getHeroSnapshots(window, includeEmerging))
    .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.metrics.starScore.value ?? -1) - (a.metrics.starScore.value ?? -1));
  const header = [
    "hero", "industry", "eligible_lead_films", "star_score", "hit_films", "blockbusters", "total_gross_crore", "overall_success_ratio_pct", "success_ratio_coverage", "hero_performance_index",
    "audience_index", "consistency_index", "social_reach_index", "recent_momentum", "avg_release_gap_months", "peak_films_in_year",
    "films_per_active_year", "evidence_coverage_pct", "confidence", "window", "methodology_version", "calculated_at", "data_mode", "disclaimer",
  ];
  const disclaimer = meta.mode === "demo" ? "SYNTHETIC DEMO DATA - not real-world figures" : "Editorial benchmark; see methodology and source ledger";
  const rows = snaps.map((s) =>
    [
      s.name, s.industry, s.eligibleFilmCount, s.metrics.starScore.value, s.metrics.hits.value, s.metrics.blockbusters.value, s.metrics.totalGross.value, s.metrics.overallSuccessRatio.value,
      `${s.metrics.overallSuccessRatio.coverage.numerator}/${s.metrics.overallSuccessRatio.coverage.denominator}`,
      s.metrics.hpi.value, s.metrics.audienceIndex.value, s.metrics.consistency.value, s.metrics.socialReach.value, s.metrics.momentum.value,
      s.metrics.releaseGap.value, s.metrics.peakFilms.value, s.metrics.filmsPerYear.value, s.evidenceCoveragePercent, s.confidence,
      window, s.methodologyVersion, s.calculatedAt, meta.mode, disclaimer,
    ].map(esc).join(","),
  );
  return new Response([header.join(","), ...rows].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tollywood-analysis-heroes-${window}${meta.mode === "demo" ? "-DEMO" : ""}.csv"`,
    },
  });
}
