import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Terms (private beta)" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <PageHeader title="Terms (private beta)" subtitle="Placeholder terms for a private beta. Replace before any public launch." />
      <div className="card mt-6 space-y-3 p-5 text-[14px] leading-relaxed text-ink-2">
        <p>Tollywood Analysis is a private beta. Scores are editorial benchmarks built from a published, versioned methodology — not objective fact, not audited figures, and not financial information.</p>
        <p>In demo mode, all films, ratings, outcomes and reach values are synthetic and must not be quoted as real-world data.</p>
        <p>Third-party data (for example TMDb, and IMDb only via a licensed source) is used under each provider&apos;s terms. Commercial use requires a separate licence review.</p>
        <p>Correction submissions are private. Optional email addresses are used only to follow up on the submission and are never shown publicly.</p>
      </div>
    </div>
  );
}
