import type { Metadata } from "next";
import { MethodologyContent } from "@/components/annexure/methodology-content";
import { getMethodology } from "@/lib/repositories";

export const metadata: Metadata = { title: "Annexure · Methodology" };

export default async function AnnexureMethodologyPage() {
  const m = await getMethodology();
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">1. Methodology</h1>
      <p className="mb-5 mt-1.5 text-[15px] text-ink-2">Formula derivations, thresholds and missing-data treatment for version {m.versionName}.</p>
      <MethodologyContent m={m} />
    </div>
  );
}
