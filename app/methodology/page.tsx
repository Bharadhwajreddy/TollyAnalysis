import type { Metadata } from "next";
import Link from "next/link";
import { MethodologyContent } from "@/components/annexure/methodology-content";
import { HowWeCalculate } from "@/components/dashboard/how-we-calculate";
import { PageHeader } from "@/components/layout/page-header";
import { TollyMethod } from "@/components/tolly/tolly-method";
import { Collapsible } from "@/components/ui/collapsible";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled } from "@/lib/features";
import { getMethodology } from "@/lib/repositories";
import { tollyMeta } from "@/lib/tolly/view";

export const metadata: Metadata = { title: "How it works" };

const MORE = [
  ["/annexure/sources", "Sources and data licences"],
  ["/annexure/coverage", "What data is missing"],
  ["/annexure", "Film-by-film evidence"],
  ["/annexure/corrections", "Suggest a correction"],
  ["/annexure/photo-credits", "Photo credits"],
] as const;

/** The one place that explains how scores are made and where the data comes from. */
export default async function MethodologyPage() {
  const m = await getMethodology();
  const showTolly = DATA_MODE === "real" && tollyIndexEnabled();
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <PageHeader title="How it works" subtitle="How the scores are made and where the data comes from." />

      {showTolly && (
        <section id="tolly-index" aria-labelledby="tolly-index-title" className="mt-8 scroll-mt-24">
          <h2 id="tolly-index-title" className="font-serif text-[24px] font-semibold text-ink">
            Tolly Index
          </h2>
          <p className="mb-4 mt-1 max-w-3xl text-[14px] text-ink-2">
            One score out of 100 for each hero, from five things: how much audiences love his films, how often his films are hits, how many fans follow him, how
            his latest films did, and how many films he has led. Data as of {tollyMeta.asOf}: {tollyMeta.films.complete.toLocaleString("en-IN")} of {tollyMeta.films.total.toLocaleString("en-IN")} films scored,{" "}
            {tollyMeta.heroes.qualified} of {tollyMeta.heroes.total} heroes ranked.
          </p>
          <TollyMethod m={tollyMeta} />
        </section>
      )}

      <section className="mt-8">
        <HowWeCalculate m={m} mode={DATA_MODE} />
      </section>

      <section className="mt-4">
        <Collapsible title="The full method" subtitle="Every formula and weight, for those who want the detail">
          <div className="px-4 pb-5 sm:px-6">
            <MethodologyContent m={m} />
          </div>
        </Collapsible>
      </section>

      <nav aria-label="More about the data" className="mt-8 flex flex-wrap gap-2">
        {MORE.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink hover:border-wine/40 hover:text-wine">
            {label} →
          </Link>
        ))}
      </nav>
    </div>
  );
}
