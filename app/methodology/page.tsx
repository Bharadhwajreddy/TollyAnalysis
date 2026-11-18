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
import { breadcrumbJsonLd, faqJsonLd, JsonLd, jsonLdGraph, methodologyFaq, pageMetadata, webPageJsonLd } from "@/lib/seo";
import { tollyMeta } from "@/lib/tolly/view";

const METHODOLOGY_DESCRIPTION =
  "How Tollywood Analysis calculates the Tolly Index and Star Score: all 15 factors, box-office hit and flop rules, lead-credit eligibility and public data sources.";

export const metadata: Metadata = pageMetadata({
  title: "How It Works — Tolly Index & Star Score Methodology",
  description: METHODOLOGY_DESCRIPTION,
  path: "/methodology",
  keywords: ["Tolly Index formula", "Star Score methodology", "how Telugu box office verdict is calculated", "Tollywood Analysis methodology"],
});

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
  const jsonLd = jsonLdGraph(
    webPageJsonLd({
      path: "/methodology",
      name: "How It Works — Tolly Index & Star Score Methodology · Tollywood Analysis",
      description: METHODOLOGY_DESCRIPTION,
      dateModified: tollyMeta.asOf,
      breadcrumb: true,
    }),
    breadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "How it works", path: "/methodology" },
      ],
      "/methodology",
    ),
    faqJsonLd(methodologyFaq(DATA_MODE), "/methodology"),
  );
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <JsonLd data={jsonLd} />
      <PageHeader title="How it works" subtitle="How the scores are made and where the data comes from." />

      {showTolly && (
        <section id="tolly-index" aria-labelledby="tolly-index-title" className="mt-8 scroll-mt-24">
          <h2 id="tolly-index-title" className="font-serif text-[24px] font-semibold text-ink">
            Tolly Index
          </h2>
          <p className="mb-4 mt-1 max-w-3xl text-[14px] text-ink-2">
            One score out of 100 for each hero, from fifteen numbers in five groups: how much audiences love his films, how often and how big his films hit at the box office, how his
            latest films did, how many fans follow him, and how steady, long and busy his career is. Data as of {tollyMeta.asOf}: {tollyMeta.films.complete.toLocaleString("en-IN")} of {tollyMeta.films.total.toLocaleString("en-IN")} films scored,{" "}
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
