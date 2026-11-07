import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { IMDB_ATTRIBUTION, TMDB_NOTICE } from "@/lib/legal/data-licences";

export const metadata: Metadata = { title: "Terms of use" };

const UPDATED = "7 November 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <PageHeader title="Terms of use" subtitle={`Last updated ${UPDATED}. Plain-language terms for using this site.`} />
      <div className="card mt-6 space-y-5 p-5 text-[14px] leading-relaxed text-ink-2 sm:p-6">
        <Section title="1. What this site is">
          Tollywood Analysis is an independent, non-commercial analysis of Telugu film careers. Its scores, ranks and verdicts (including the Tolly Index and
          the Star Score) are opinions produced by a published, versioned method from public data. They are not statements of fact about any person, not
          audited figures, and not financial or investment information. No studio, actor, platform or data provider endorses this site, and it is not affiliated
          with any of them.
        </Section>
        <Section title="2. Where the data comes from">
          Every source and its licence is listed on the <Link href="/annexure/sources" className="text-wine underline">source ledger</Link>, and every photo&apos;s
          author and licence on <Link href="/annexure/photo-credits" className="text-wine underline">photo credits</Link>. {IMDB_ATTRIBUTION} {TMDB_NOTICE} Film
          and hero facts come from Wikipedia (CC BY-SA 4.0) and Wikidata (CC0). Raw IMDb and TMDB numbers are used only to compute scores and are never
          republished here.
        </Section>
        <Section title="3. Accuracy">
          We check every input and show what is missing rather than guessing, but public data can be wrong or out of date, and scores change when data or the
          method changes (each method version is recorded). Use the site as one view among many. If something is wrong,{" "}
          <Link href="/annexure/corrections" className="text-wine underline">tell us</Link>.
        </Section>
        <Section title="4. Names and trademarks">
          Film titles, people&apos;s names, logos and trademarks belong to their owners. They appear here only to identify the films and people discussed.
        </Section>
        <Section title="5. How you may use this site">
          You may read, share and quote individual scores for personal or editorial use, with a credit and a link to the page. Because several of our data
          sources forbid it, you may not copy the site&apos;s data in bulk, scrape it, or reuse it in a commercial product or another database.
        </Section>
        <Section title="6. What you send us">
          Corrections and suggestions you submit may be used to fix the data, edited, or declined. Please do not include personal information about anyone
          other than public career facts. How we handle what you send is explained in the{" "}
          <Link href="/privacy" className="text-wine underline">privacy policy</Link>.
        </Section>
        <Section title="7. Removal requests">
          If you are a person featured here, or you hold rights in something shown, and you want it corrected or removed, use the{" "}
          <Link href="/annexure/corrections" className="text-wine underline">corrections form</Link> and say so. We review every request and aim to respond
          within 7 days.
        </Section>
        <Section title="8. No warranty">
          The site is provided as it is, without warranties of any kind. To the extent the law allows, we are not liable for any loss arising from using it or
          relying on its scores.
        </Section>
        <Section title="9. Changes and law">
          We may update these terms; the date above shows the latest version. These terms are governed by the laws of India.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-1">{children}</p>
    </section>
  );
}
