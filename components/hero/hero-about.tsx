import type { ReactNode } from "react";

export interface AboutRow {
  k: string;
  v: ReactNode;
}

/** Profile facts (context only, never part of any score) as one compact definition list. */
export function HeroAbout({ rows, note }: { rows: AboutRow[]; note?: ReactNode }) {
  if (!rows.length) return null;
  return (
    <div>
      <dl className="grid border-t border-rule sm:grid-cols-[160px_1fr]">
        {rows.map((r) => (
          <div key={r.k} className="contents">
            <dt className="pt-3 text-[13px] font-medium text-muted sm:border-b sm:border-rule sm:pb-3 sm:pt-[15px]">{r.k}</dt>
            <dd className="border-b border-rule pb-3 pt-0.5 text-[14px] leading-relaxed text-ink-2 sm:py-3">{r.v}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-3 text-[12px] text-muted">{note}</p>}
    </div>
  );
}

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="link">
      {children}
      <span aria-hidden className="ml-0.5 text-[0.85em]">↗</span>
    </a>
  );
}
