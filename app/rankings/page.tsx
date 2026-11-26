import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Rankings, RankingsView } from "@/components/rankings/rankings";
import { getDashboardData } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Telugu Hero Rankings — Box Office, Hit Ratio & Star Score",
  description:
    "Rank every Telugu hero on Star Score, hit ratio, total hits, blockbusters, reported worldwide gross, highest-grossing film, release pace or social reach.",
  path: "/rankings",
  keywords: [
    "Top 10 Telugu heroes ranking",
    "Telugu heroes hit ratio ranking",
    "Tollywood highest grossing heroes",
    "Telugu heroes box office ranking",
  ],
});

export default async function RankingsPage() {
  const data = await getDashboardData();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader
        title="Rankings"
        subtitle="Pick a measure to rank every hero."
        meta={data}
      />
      <Suspense fallback={<RankingsView data={data} metric="starScore" />}>
        <Rankings data={data} />
      </Suspense>
    </div>
  );
}
