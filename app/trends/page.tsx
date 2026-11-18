import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Trends } from "@/components/trends/trends";
import { getDashboardData, getTrends } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tollywood Career Trends — Films & Hits Year by Year",
  description:
    "Track how Telugu cinema lead actors rose and fell year by year since 2000: annual releases, hits, blockbusters and career trajectories across Tollywood.",
  path: "/trends",
  keywords: ["Tollywood box office trends", "Telugu cinema year by year hits and flops", "Telugu heroes career analysis"],
});

export default async function TrendsPage() {
  const [data, trends] = await Promise.all([getDashboardData(), getTrends()]);
  const heroes = data.windows.all_time
    .filter((h) => h.m.starScore.v !== null)
    .sort((a, b) => (b.m.hpi.v as number) - (a.m.hpi.v as number))
    .map((h) => ({ slug: h.slug, name: h.name }));
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader title="Trends" subtitle="Films and hits year by year, for everyone and for one hero." meta={data} />
      <Trends years={trends.years} heroYearly={trends.heroYearly} heroes={heroes} />
    </div>
  );
}
