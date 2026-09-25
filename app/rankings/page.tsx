import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Rankings } from "@/components/rankings/rankings";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import { METRICS } from "@/lib/constants/metrics";
import { getDashboardData } from "@/lib/repositories";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingsPage(props: PageProps<"/rankings">) {
  const sp = await props.searchParams;
  const requested = typeof sp.metric === "string" ? sp.metric : "hpi";
  const metric = (requested in METRICS ? requested : "hpi") as HeroMetricKey;
  const data = await getDashboardData();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader
        title="Rankings"
        subtitle="Every hero ranked on every KPI. Pick a metric to see the full ordered list; tap any card below to switch."
        meta={data}
      />
      <Rankings data={data} initialMetric={metric} />
    </div>
  );
}
