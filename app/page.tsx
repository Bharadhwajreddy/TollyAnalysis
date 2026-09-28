import { Dashboard } from "@/components/dashboard/dashboard";
import { HowWeCalculate } from "@/components/dashboard/how-we-calculate";
import { FanRanking } from "@/components/ranking/fan-ranking";
import { userRankingEnabled } from "@/lib/features";
import { getDashboardData, getMethodology } from "@/lib/repositories";

export default async function HomePage() {
  const [data, methodology] = await Promise.all([getDashboardData(), getMethodology()]);
  const heroes = data.windows.all_time.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry }));
  return (
    <Dashboard data={data}>
      {userRankingEnabled() && <FanRanking heroes={heroes} />}
      <HowWeCalculate m={methodology} mode={data.mode} />
    </Dashboard>
  );
}
