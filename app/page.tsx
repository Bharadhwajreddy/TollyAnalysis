import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/repositories";

export default async function HeroesPage() {
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}
