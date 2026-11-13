import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import { FanRanking } from "@/components/ranking/fan-ranking";
import { userRankingEnabled } from "@/lib/features";
import { getDashboardData } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Star Score",
  description: "Hits, flops and box office for every Telugu hero in one dashboard: leaderboards, charts and the full table.",
};

/** The full career dashboard: every chart and the all-numbers table. */
export default async function StarScorePage() {
  const data = await getDashboardData();
  const heroes = data.windows.all_time.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry }));
  return <Dashboard data={data}>{userRankingEnabled() && <FanRanking heroes={heroes} />}</Dashboard>;
}
