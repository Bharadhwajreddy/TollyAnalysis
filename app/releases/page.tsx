import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ReleasesExplorer, ReleasesExplorerView } from "@/components/releases/releases-explorer";
import { releaseCounts, releasesAsOf, releasesOf } from "@/lib/releases";
import { JsonLd, releasesJsonLd, releasesMetadata } from "@/lib/seo";

export const metadata: Metadata = releasesMetadata;

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-1 text-[30px] font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[12.5px] text-ink-2">{note}</p>
    </div>
  );
}

export default function ReleasesPage() {
  const counts = releaseCounts();
  const thisYear = counts[counts.length - 1].year;
  const defaultData = releasesOf(thisYear);
  const full = counts.filter((c) => !c.partial);
  const busiest = [...full].sort((a, b) => b.total - a.total)[0];
  const lastYear = full[full.length - 1];
  const now = counts[counts.length - 1];
  const all = counts.reduce((s, c) => s + c.total, 0);
  const jsonLd = releasesJsonLd();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow="Releases"
        title="Telugu releases, year by year"
        subtitle="Every Telugu film released in theatres or straight to OTT since 2000, plus films dubbed into Telugu. Updated every week as new films release."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={`${thisYear} so far`} value={String(now.total)} note={`releases up to ${day(releasesAsOf)}`} />
        <Tile
          label={String(lastYear.year)}
          value={String(lastYear.total)}
          note={`${lastYear.theatrical} in theatres · ${lastYear.dubbed} dubbed`}
        />
        <Tile label="Busiest year" value={String(busiest.year)} note={`${busiest.total} releases`} />
        <Tile label="Since 2000" value={all.toLocaleString("en-IN")} note="films in this list" />
      </div>

      <Suspense
        fallback={<ReleasesExplorerView counts={counts} year={thisYear} kind={null} data={defaultData} />}
      >
        <ReleasesExplorer counts={counts} defaultYear={thisYear} defaultData={defaultData} />
      </Suspense>
    </div>
  );
}
