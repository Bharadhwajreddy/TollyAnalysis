import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import { FanRanking } from "@/components/ranking/fan-ranking";
import { userRankingEnabled } from "@/lib/features";
import { getDashboardData } from "@/lib/repositories";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd, jsonLdGraph, pageMetadata, starScoreEntries, webPageJsonLd } from "@/lib/seo";

const STAR_SCORE_DESCRIPTION =
  "Hits, flops, hit ratio and worldwide box office for every Telugu hero in one dashboard: Star Score leaderboards, trade-off charts and the full career table.";

export const metadata: Metadata = pageMetadata({
  title: "Star Score — Telugu Heroes Box Office, Hits & Flops Dashboard",
  description: STAR_SCORE_DESCRIPTION,
  path: "/star-score",
  keywords: [
    "Star Score",
    "Telugu heroes hits and flops",
    "Tollywood box office collection",
    "Telugu heroes hit percentage comparison",
    "Mega family vs Nandamuri family vs Akkineni family box office",
  ],
});

/** The full career dashboard: every chart and the all-numbers table. */
export default async function StarScorePage() {
  const data = await getDashboardData();
  const entries = data.mode === "real" ? await starScoreEntries() : [];
  const heroes = data.windows.all_time.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry }));
  const jsonLd = jsonLdGraph(
    webPageJsonLd({
      path: "/star-score",
      name: "Star Score — Telugu Heroes Box Office, Hits & Flops Dashboard · Tollywood Analysis",
      description: STAR_SCORE_DESCRIPTION,
      type: "CollectionPage",
      dateModified: data.asOf,
      breadcrumb: true,
    }),
    breadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "Star Score", path: "/star-score" },
      ],
      "/star-score",
    ),
    entries.length
      ? itemListJsonLd({
          name: "Telugu heroes ranked by Star Score",
          description: "Every qualified Telugu film lead actor ranked by Star Score (box-office success ratio, hits, blockbusters, total gross and social reach).",
          path: "/star-score",
          entries,
        })
      : null,
  );
  return (
    <>
      <JsonLd data={jsonLd} />
      <Dashboard data={data}>{userRankingEnabled() && <FanRanking heroes={heroes} />}</Dashboard>
    </>
  );
}
