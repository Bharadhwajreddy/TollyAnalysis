"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ANNEXURE_SECTIONS = [
  { href: "/annexure/methodology", label: "1. Methodology" },
  { href: "/annexure/registry", label: "2. Hero Registry" },
  { href: "/annexure/heroes", label: "3–4. Hero detail & filmography" },
  { href: "/annexure/sources", label: "5. Source Ledger" },
  { href: "/annexure/coverage", label: "6. Data Coverage" },
  { href: "/annexure/changelog", label: "7. Change Log" },
  { href: "/annexure/corrections", label: "8. Suggest a Correction" },
];

export function AnnexureNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Annexure sections" className="lg:sticky lg:top-20 lg:self-start">
      <ul className="scroll-x -mx-4 flex gap-1 px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
        <li>
          <Link
            href="/annexure"
            aria-current={pathname === "/annexure" ? "page" : undefined}
            className={`block whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium ${
              pathname === "/annexure" ? "bg-wine-soft text-wine" : "text-ink-2 hover:bg-surface"
            }`}
          >
            Overview
          </Link>
        </li>
        {ANNEXURE_SECTIONS.map((s) => {
          const active = pathname.startsWith(s.href);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium ${
                  active ? "bg-wine-soft text-wine" : "text-ink-2 hover:bg-surface"
                }`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
