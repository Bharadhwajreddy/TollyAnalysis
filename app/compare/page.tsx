import type { Metadata } from "next";
import { Suspense } from "react";
import { Compare, CompareStatic } from "@/components/compare/compare";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardData } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Compare Telugu Heroes Side by Side — Box Office & Hit Ratio",
  description:
    "Compare 2 to 4 Tollywood heroes head-to-head across Tolly Index, Star Score, hits and flops, hit percentage, total worldwide gross, biggest film and release pace.",
  path: "/compare",
  keywords: [
    "Compare Telugu heroes",
    "Tollywood heroes comparison",
    "Telugu heroes hit percentage comparison",
    "Tollywood box office head to head",
  ],
});

export default async function ComparePage() {
  const data = await getDashboardData();
  const initial = data.windows.all_time
    .filter((h) => !h.isEmerging && h.m.starScore.v !== null)
    .sort((a, b) => (b.m.hpi.v as number) - (a.m.hpi.v as number))
    .slice(0, 2)
    .map((h) => h.slug);
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader title="Compare heroes" subtitle="Put 2–4 heroes side by side." meta={data} />
      <Suspense fallback={<CompareStatic data={data} defaultInitial={initial} />}>
        <Compare data={data} defaultInitial={initial} />
      </Suspense>
    </div>
  );
}
