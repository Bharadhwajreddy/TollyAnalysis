import type { Metadata } from "next";
import { Compare } from "@/components/compare/compare";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardData } from "@/lib/repositories";

export const metadata: Metadata = { title: "Compare heroes" };

export default async function ComparePage(props: PageProps<"/compare">) {
  const sp = await props.searchParams;
  const raw = typeof sp.heroes === "string" ? sp.heroes : "";
  const data = await getDashboardData();
  const initial = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4)
    : data.windows.all_time
        .filter((h) => !h.isEmerging && h.m.hpi.v !== null)
        .sort((a, b) => (b.m.hpi.v as number) - (a.m.hpi.v as number))
        .slice(0, 2)
        .map((h) => h.slug);
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader title="Compare heroes" subtitle="Put 2–4 heroes side by side on every benchmark." meta={data} />
      <Compare data={data} initial={initial} />
    </div>
  );
}
