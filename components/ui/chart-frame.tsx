import Link from "next/link";
import type { ReactNode } from "react";
import { CopyLink } from "@/components/ui/copy-link";

/**
 * The one chart container: title, a one-line finding, controls, the plot, an inline legend and a source line.
 * `id` is the anchor; the link action copies a URL straight to this chart.
 */
export function ChartFrame({
  id,
  title,
  finding,
  controls,
  legend,
  source,
  children,
  className = "",
  flush = false,
  aside,
}: {
  id: string;
  title: ReactNode;
  finding?: ReactNode;
  controls?: ReactNode;
  legend?: ReactNode;
  source?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No inner padding around the plot (tables). */
  flush?: boolean;
  aside?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={`frame scroll-mt-24 ${className}`}>
      <div className="flex items-start justify-between gap-x-4 px-4 pt-4 sm:gap-x-6 sm:px-6 sm:pt-5">
        <div className="min-w-0 max-w-3xl">
          <h2 id={`${id}-t`} className="font-serif text-[21px] font-semibold leading-tight tracking-[-0.005em] text-ink sm:text-[23px]">
            {title}
          </h2>
          {finding && <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{finding}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2" data-noprint>
          {aside}
          <CopyLink id={id} />
        </div>
      </div>
      {controls && <div className="px-4 pt-4 sm:px-6">{controls}</div>}
      <div className={`min-w-0 overflow-x-clip ${flush ? "pt-3" : "px-4 pb-1 pt-4 sm:px-6"}`}>{children}</div>
      {(legend || source) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-rule px-4 py-3 text-[12px] text-muted sm:px-6">
          <div>{legend}</div>
          {source && <div className="text-right">{source}</div>}
        </div>
      )}
    </section>
  );
}

export function Source({ children, method = true }: { children: ReactNode; method?: boolean }) {
  return (
    <span>
      {children}
      {method && (
        <>
          {" · "}
          <Link href="/methodology" className="underline decoration-rule underline-offset-2 hover:text-ink">
            Method
          </Link>
        </>
      )}
    </span>
  );
}
