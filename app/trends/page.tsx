import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Trends } from "@/components/trends/trends";
import { getDashboardData, getTrends } from "@/lib/repositories";

export const metadata: Metadata = { title: "Trends" };

export default async function TrendsPage() {
  const [data, trends] = await Promise.all([getDashboardData(), getTrends()]);
  const heroes = data.windows.all_time
    .filter((h) => h.m.hpi.v !== null)
    .sort((a, b) => (b.m.hpi.v as number) - (a.m.hpi.v as number))
    .map((h) => ({ slug: h.slug, name: h.name }));
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader title="Trends" subtitle="How output and outcomes move over time, across the roster and for one hero." meta={data} />
      <Trends years={trends.years} heroYearly={trends.heroYearly} heroes={heroes} />
    </div>
  );
}
