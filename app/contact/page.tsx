import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CONTACT_EMAIL } from "@/lib/constants/site";

export const metadata: Metadata = { title: "Contact us", description: "Found a mistake, have an idea, or something isn't working? Write to us." };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <PageHeader title="Contact us" subtitle="Let's make it better together." />
      <section className="card mt-8 p-5 sm:p-6">
        <p className="text-[15.5px] leading-relaxed text-ink-2">
          If anything on the site is wrong, if you think we should update something, or if something isn&apos;t working, please mail us. We&apos;ll work on it as soon as
          possible.
        </p>
        <p lang="te" className="mt-3 text-[16px] leading-relaxed text-ink-2">
          ఏదైనా తప్పు ఉన్నా, ఏదైనా అప్‌డేట్ చేయాలనిపించినా, ఏదైనా పని చేయకపోయినా, ఏదేమైనా సరే మెయిల్ చేయండి. వీలైనంత త్వరగా చూసుకుంటాం. కలిసి ఇంకా బెటర్ చేద్దాం! 🙏
        </p>
        <a href={`mailto:${CONTACT_EMAIL}`} className="mt-5 inline-block rounded-full bg-wine px-5 py-2.5 text-[15px] font-semibold text-white hover:opacity-90">
          {CONTACT_EMAIL}
        </a>
        <p className="mt-5 text-[14px] text-ink-2">
          Spotted a wrong number for one film? The <Link href="/annexure/corrections" className="text-wine underline">correction form</Link> takes a source link and goes
          straight to the editor. Looking for work in films, or have a job to post? See <Link href="/careers" className="text-wine underline">Careers</Link>.
        </p>
      </section>
    </div>
  );
}
