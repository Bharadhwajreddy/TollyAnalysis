import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/badges";
import type { DataMeta } from "@/lib/view-models";

/** Page title block: a display serif H1, one sentence, optional meta on the right. No kicker labels. */
export function PageHeader({
  title,
  subtitle,
  meta,
  aside,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: DataMeta;
  /** Kept for older callers; not shown. */
  eyebrow?: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="pt-8 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <h1 className="font-serif text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[48px]">{title}</h1>
          {subtitle && <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{subtitle}</p>}
        </div>
        {aside && <div className="shrink-0 text-[13px] text-muted">{aside}</div>}
      </div>
      {meta?.mode === "demo" && (
        <div className="mt-3">
          <DemoBadge />
        </div>
      )}
      {children}
    </div>
  );
}

/** A section title inside a page: serif, with an optional one-line finding. Space + a rule separate sections. */
export function SectionTitle({ id, title, finding, aside }: { id?: string; title: ReactNode; finding?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0 max-w-3xl">
        <h2 id={id} className="scroll-mt-24 font-serif text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[32px]">
          {title}
        </h2>
        {finding && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{finding}</p>}
      </div>
      {aside}
    </div>
  );
}
