"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Heroes", match: (p: string) => p === "/" || p.startsWith("/heroes") },
  { href: "/rankings", label: "Rankings", match: (p: string) => p.startsWith("/rankings") },
  { href: "/compare", label: "Compare", match: (p: string) => p.startsWith("/compare") },
  { href: "/trends", label: "Trends", match: (p: string) => p.startsWith("/trends") },
  { href: "/methodology", label: "Methodology", match: (p: string) => p.startsWith("/methodology") },
];

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Tollywood Analysis home">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-wine font-serif text-[13px] font-bold text-white"
          >
            TA
          </span>
          <span className="font-serif text-[17px] font-semibold tracking-tight text-ink">Tollywood Analysis</span>
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-wine-soft text-wine" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/annexure"
            className="hidden rounded-md border border-wine px-3 py-1.5 text-sm font-semibold text-wine transition-colors hover:bg-wine hover:text-white sm:inline-flex"
          >
            Annexure &amp; Sources
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Primary mobile" className="border-t border-line bg-surface px-4 pb-3 md:hidden">
          <ul className="flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={item.match(pathname) ? "page" : undefined}
                  className={`block rounded-md px-3 py-2.5 text-[15px] font-medium ${
                    item.match(pathname) ? "bg-wine-soft text-wine" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/annexure"
                onClick={() => setOpen(false)}
                className="block rounded-md bg-wine px-3 py-2.5 text-center text-[15px] font-semibold text-white"
              >
                Annexure &amp; Sources
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
