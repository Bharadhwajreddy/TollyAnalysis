import { AnnexureNav } from "@/components/annexure/annexure-nav";

export default function AnnexureLayout({ children }: LayoutProps<"/annexure">) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="pt-6 sm:pt-8">
        <p className="eyebrow">Annexure &amp; Sources</p>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AnnexureNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
