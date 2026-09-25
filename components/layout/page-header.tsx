import type { ReactNode } from "react";
import { DemoBadge } from "@/components/ui/badges";
import type { DataMeta } from "@/lib/view-models";

export function PageHeader({
  title,
  subtitle,
  meta,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  meta?: DataMeta;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="pt-6 sm:pt-8">
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <h1 className="font-serif text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">{subtitle}</p>}
      {meta && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          {meta.mode === "demo" ? (
            <DemoBadge />
          ) : (
            <span className="rounded bg-teal-soft px-2 py-0.5 font-mono text-[11px] text-[#00596a]">LIVE</span>
          )}
          <span>Methodology {meta.methodologyName}</span>
        </div>
      )}
      {children}
    </div>
  );
}
