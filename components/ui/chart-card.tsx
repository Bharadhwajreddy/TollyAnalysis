import type { ReactNode } from "react";

interface Props {
  id?: string;
  title: string;
  subtitle?: ReactNode;
  count?: ReactNode;
  controls?: ReactNode;
  footer?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Benchmark-style chart card: title, direction hint, controls, chart, methodology footer. */
export function ChartCard({ id, title, subtitle, count, controls, footer, legend, children, className = "" }: Props) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={`card scroll-mt-28 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="text-[17px] font-semibold leading-snug text-ink sm:text-lg">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
        </div>
        {count && <p className="tabular shrink-0 pt-1 text-xs text-muted">{count}</p>}
      </div>
      {controls && <div className="mt-3">{controls}</div>}
      <div className="mt-4">{children}</div>
      {legend && <div className="mt-3">{legend}</div>}
      {footer && <div className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">{footer}</div>}
    </section>
  );
}
