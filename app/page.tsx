import { Dashboard } from "@/components/dashboard/dashboard";
import { HowWeCalculate } from "@/components/dashboard/how-we-calculate";
import { FanRanking } from "@/components/ranking/fan-ranking";
import { TollyHomePanel } from "@/components/tolly/tolly-home-panel";
import { tollyIndexEnabled, userRankingEnabled } from "@/lib/features";
import { getDashboardData, getMethodology } from "@/lib/repositories";
import { getTollyRanking, tollyMeta } from "@/lib/tolly/view";

export default async function HomePage() {
  const [data, methodology] = await Promise.all([getDashboardData(), getMethodology()]);
  const heroes = data.windows.all_time.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry }));
  const photos = Object.fromEntries(heroes.map((h) => [h.slug, h.photo]));
  const tolly = data.mode === "real" && tollyIndexEnabled() ? <TollyHomePanel ranked={getTollyRanking().ranked} meta={tollyMeta} photos={photos} /> : null;
  return (
    <Dashboard data={data} afterBanner={tolly}>
      {userRankingEnabled() && <FanRanking heroes={heroes} />}
      <HowWeCalculate m={methodology} mode={data.mode} />
    </Dashboard>
  );
}
