import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { JobForm } from "@/components/site/job-form";
import { CONTACT_EMAIL } from "@/lib/constants/site";

export const metadata: Metadata = { title: "Careers", description: "Jobs in Telugu cinema, and a word about us." };

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <PageHeader title="Careers" subtitle="Jobs in films, posted here. And a small request from us." />

      <section aria-labelledby="openings" className="card mt-8 p-5 sm:p-6">
        <h2 id="openings" className="font-serif text-[22px] font-semibold text-ink">Openings</h2>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-2">
          Future lo website peddaga ayyi, films lo connections dwara emaina offers vasthe ikkade pedathaam. Kaani prasthuthaniki emi levu, sorry! 🙏
        </p>
        <p className="mt-2 text-[14px] text-muted">No openings right now. When film offers come our way, they&apos;ll be listed here first.</p>
      </section>

      <section aria-labelledby="us" className="cinema mt-6 rounded-2xl p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d8a86b]">About us</p>
        <h2 id="us" className="mt-2 font-serif text-[24px] font-semibold text-white">A small request</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[#f3e7dc]">
          Memu Germany lo Automotive Engineering Masters chaduvuthunna students. Meeru emaina referrals ivvagaligithe please mail cheyandi, maa CV share chesthaam.
        </p>
        <p className="mt-2 text-[14px] text-[#cbbdb2]">
          We&apos;re Automotive Engineering master&apos;s students in Germany. If you can refer us for a role, please write to us and we&apos;ll send our CVs.
        </p>
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Referral")}`} className="mt-4 inline-block rounded-full bg-[#e8b65a] px-5 py-2 text-[14px] font-semibold text-[#1a0d12] hover:opacity-90">
          {CONTACT_EMAIL}
        </a>
      </section>

      <section aria-labelledby="post" className="card mt-6 p-5 sm:p-6">
        <h2 id="post" className="font-serif text-[22px] font-semibold text-ink">Working in movies? Post your job here</h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">
          Meeru cinemallo pani chesthunte, e role ki ayina opening unte ee form fill cheyandi. Mee job ni ikkada post chesthaam.
        </p>
        <p className="mb-4 mt-1 text-[14px] text-muted">If you have an opening in any department of film-making, fill in this form and we&apos;ll post it here, free.</p>
        <JobForm />
      </section>

      <p className="mt-8 text-center font-serif text-[22px] font-semibold text-ink">Andhariki maa Pranamulu 🙏</p>
    </div>
  );
}
