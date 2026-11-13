"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tollyIndexEnabled } from "@/lib/features";

// Inlined at build time; lib/env.ts is server-only.
const REAL_DATA = !["demo", "live"].includes(process.env.NEXT_PUBLIC_DATA_MODE ?? "");

const TOLLY = REAL_DATA && tollyIndexEnabled();

// With the Tolly Index on, the home page leads with it and the career dashboard is "Star Score".
const NAV = [
  { href: "/", label: TOLLY ? "Home" : "Overview" },
  ...(TOLLY
    ? [
        { href: "/tolly-index", label: "Tolly Index" },
        { href: "/star-score", label: "Star Score" },
      ]
    : []),
  { href: "/heroes", label: "Heroes" },
  { href: "/rankings", label: "Rankings" },
  { href: "/compare", label: "Compare" },
  { href: "/trends", label: "Trends" },
];

export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`) || (href === "/heroes" && path.startsWith("/hero/")));
  const info = path === "/methodology" || path.startsWith("/annexure") || path === "/terms" || path === "/privacy";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Tollywood Analysis home">
          <span aria-hidden className="font-serif text-[26px] font-bold leading-none tracking-tight text-ink">
            TA<span className="text-wine">.</span>
          </span>
          <span aria-hidden className="hidden h-7 w-px bg-line sm:block" />
          <span className="hidden font-serif text-[11px] font-semibold uppercase leading-[1.15] tracking-[0.14em] text-ink-2 sm:block">
            Tollywood
            <br />
            Analysis
          </span>
        </Link>
        <nav aria-label="Main" className="scroll-x -mx-1 flex min-w-0 flex-1 items-center gap-1 px-1 [scrollbar-width:none] sm:ml-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-2 py-1.5 text-[14px] transition-colors sm:px-2.5 ${
                active(n.href) ? "border-wine font-semibold text-wine" : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
          {/* On phones the info page is the last tab; on wider screens it is the button on the right. */}
          <Link
            href="/methodology"
            aria-current={info ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-2 py-1.5 text-[14px] transition-colors md:hidden ${info ? "border-wine font-semibold text-wine" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            How it works
          </Link>
        </nav>
        <Link
          href="/methodology"
          aria-current={info ? "page" : undefined}
          className={`hidden shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium hover:border-ink-2 md:block ${info ? "border-wine text-wine" : "border-line text-ink"}`}
        >
          How it works
        </Link>
      </div>
    </header>
  );
}
