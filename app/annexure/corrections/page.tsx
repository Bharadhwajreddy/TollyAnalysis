import type { Metadata } from "next";
import { CorrectionForm } from "@/components/annexure/correction-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Annexure · Suggest a Correction",
  description:
    "Submit a sourced correction to Tollywood Analysis film credits, verdicts, box-office figures or hero details. Every submission stays private until reviewed.",
  path: "/annexure/corrections",
});

export default async function CorrectionsPage(props: PageProps<"/annexure/corrections">) {
  const sp = await props.searchParams;
  const hero = typeof sp.hero === "string" ? sp.hero.slice(0, 120) : "";
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl font-bold text-ink">8. Suggest a Correction</h1>
      <p className="mt-1.5 text-[15px] text-ink-2">
        Every correction needs a source link. Submissions are private and never appear on public pages until an editor approves them
        and records the change in the Change Log.
      </p>
      <div className="mt-5">
        <CorrectionForm defaultHero={hero} />
      </div>
    </div>
  );
}
