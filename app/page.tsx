import { Dashboard } from "@/components/dashboard/dashboard";
import { FanRanking } from "@/components/ranking/fan-ranking";
import { userRankingEnabled } from "@/lib/features";
import { getDashboardData } from "@/lib/repositories";

export default async function HomePage() {
  const data = await getDashboardData();
  const heroes = data.windows.all_time.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry }));
  return <Dashboard data={data}>{userRankingEnabled() && <FanRanking heroes={heroes} />}</Dashboard>;
}
