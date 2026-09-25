import type { Metadata } from "next";
import { MethodologyContent } from "@/components/annexure/methodology-content";
import { PageHeader } from "@/components/layout/page-header";
import { getMeta, getMethodology } from "@/lib/repositories";

export const metadata: Metadata = { title: "Methodology" };

export default async function MethodologyPage() {
  const [m, meta] = await Promise.all([getMethodology(), getMeta()]);
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <PageHeader
        title="Methodology"
        subtitle="How every number on the dashboard is calculated. Weights are versioned and configurable; missing data is never treated as zero."
        meta={meta}
      />
      <div className="mt-6">
        <MethodologyContent m={m} />
      </div>
    </div>
  );
}
