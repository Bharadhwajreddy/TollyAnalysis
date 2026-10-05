"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/heroes", label: "Heroes" },
  { href: "/rankings", label: "Rankings" },
  { href: "/compare", label: "Compare" },
  { href: "/trends", label: "Trends" },
  { href: "/annexure", label: "Inside the data" },
];

export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`) || (href === "/heroes" && path.startsWith("/hero/")));
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
        </nav>
        <Link
          href="/annexure/sources"
          className="hidden shrink-0 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink hover:border-ink-2 md:block"
        >
          Sources ↗
        </Link>
      </div>
    </header>
  );
}
