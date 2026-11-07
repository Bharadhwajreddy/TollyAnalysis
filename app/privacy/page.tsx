import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Privacy policy" };

const UPDATED = "7 November 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <PageHeader title="Privacy policy" subtitle={`Last updated ${UPDATED}. What we collect, why, and your rights.`} />
      <div className="card mt-6 space-y-5 p-5 text-[14px] leading-relaxed text-ink-2 sm:p-6">
        <Section title="The short version">
          No accounts for visitors, no advertising, no analytics or tracking scripts, and nothing is sold. We only keep what you choose to send us, and an
          anonymous cookie if you vote.
        </Section>
        <Section title="What we collect">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <b>Corrections you submit:</b> the text you write and, only if you give it, your email address, so we can follow up. Neither is ever shown
              publicly.
            </li>
            <li>
              <b>Fans&apos; votes</b> (when that feature is on): your top-three choice and a random device ID kept in a cookie, so each device counts once. The ID
              is not linked to your name, email or account.
            </li>
            <li>
              <b>Editors:</b> a sign-in cookie for the small team that reviews corrections.
            </li>
            <li>
              <b>Server logs:</b> our host (Vercel) keeps standard request logs, such as IP address and browser type, for security and reliability.
            </li>
          </ul>
        </Section>
        <Section title="Why, and for how long">
          Corrections are used only to check and fix the data, and an email address only to reply about that correction. We keep them while the correction is
          being handled and delete the email address when it is closed, or earlier if you ask. Vote records are kept while the fans&apos; vote runs.
        </Section>
        <Section title="People featured on this site">
          Heroes&apos; career facts and profile details (such as birth date, family members in films, awards and public follower counts) come from public
          sources such as Wikipedia, Wikidata and their official profiles, and each is linked to its source. If you are featured and something is wrong or you
          want it removed, use the <Link href="/annexure/corrections" className="text-wine underline">corrections form</Link>.
        </Section>
        <Section title="Your rights">
          Under India&apos;s Digital Personal Data Protection Act, 2023, you can ask to see, correct or delete the personal data you gave us, and raise a grievance.
          Send any such request through the <Link href="/annexure/corrections" className="text-wine underline">corrections form</Link>; we aim to respond within 7
          days.
        </Section>
        <Section title="Children">This site is not directed at children and does not knowingly collect their data.</Section>
        <Section title="Changes">If this policy changes, the date above changes with it.</Section>
        <p className="text-[12.5px] text-muted">
          See also the <Link href="/terms" className="underline">terms of use</Link> and the{" "}
          <Link href="/annexure/sources" className="underline">source ledger</Link>.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}
