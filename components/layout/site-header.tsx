"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { prefetchSearch, usePalette } from "@/components/search/command-palette";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useHoverKey, useSlidingIndicator } from "@/components/ui/use-sliding-indicator";

const NAV = [
  { href: "/tolly-index", label: "Index", match: ["/tolly-index", "/star-score", "/rankings"] },
  { href: "/heroes", label: "Heroes", match: ["/heroes", "/hero/"] },
  { href: "/films", label: "Films", match: ["/films", "/film/"] },
  { href: "/directors", label: "Directors", match: ["/directors", "/director/"] },
  { href: "/releases", label: "Years", match: ["/releases", "/trends"] },
  { href: "/compare", label: "Compare", match: ["/compare"] },
];

const isActive = (path: string, match: string[]) => match.some((m) => (m.endsWith("/") ? path.startsWith(m) : path === m || path.startsWith(`${m}/`)));

/**
 * The header: wordmark, six destinations and search. A soft pill follows the pointer between items and an
 * ink underline marks the current section, sliding when the route changes. Phones get a menu sheet.
 */
export function SiteHeader() {
  const path = usePathname();
  const { open } = usePalette();
  const nav = useRef<HTMLElement>(null);
  const { hover, bind } = useHoverKey();
  const current = NAV.find((n) => isActive(path, n.match))?.href ?? null;
  const pill = useSlidingIndicator<HTMLElement, HTMLSpanElement>(nav, hover);
  const bar = useSlidingIndicator<HTMLElement, HTMLSpanElement>(nav, current);
  const [scrolled, setScrolled] = useState(false);
  // The menu belongs to the page it was opened on: navigating closes it.
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menu = menuAt === path;
  const setMenu = (open: boolean) => setMenuAt(open ? path : null);
  const methodOn = path === "/methodology" || path.startsWith("/annexure");

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header style={{ viewTransitionName: "site-header" }} className={`sticky top-0 z-40 border-b bg-paper/85 backdrop-blur-md transition-[border-color] duration-200 supports-[backdrop-filter]:bg-paper/75 ${scrolled ? "border-rule" : "border-transparent"}`}>
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 rounded-md" aria-label="Tollywood Analysis home">
          <span aria-hidden className="font-serif text-[25px] font-bold leading-none tracking-tight text-ink">
            TA<span className="text-accent transition-colors group-hover:text-ink">.</span>
          </span>
          <span className="hidden font-serif text-[15px] font-semibold tracking-tight text-ink lg:block">Tollywood Analysis</span>
        </Link>

        <nav ref={nav} aria-label="Main" {...bind} className="relative ml-2 hidden items-center md:flex lg:ml-6">
          <span ref={pill} aria-hidden className="slide-ind rounded-full bg-surface-2" />
          <span ref={bar} aria-hidden className="slide-ind !h-[2px] rounded-full bg-ink" style={{ marginTop: 34 }} />
          {NAV.map((n) => {
            const on = current === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                data-ind={n.href}
                aria-current={on ? "page" : undefined}
                className={`relative z-[1] whitespace-nowrap rounded-full px-3 py-[7px] text-[14px] transition-colors duration-150 ${on ? "font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => open()}
            onMouseEnter={prefetchSearch}
            onFocus={prefetchSearch}
            className="group flex h-9 items-center gap-2 rounded-full border border-rule bg-surface pl-3 pr-2 text-[13.5px] text-muted transition-colors hover:border-field-2 hover:text-ink max-sm:w-9 max-sm:justify-center max-sm:px-0"
            aria-label="Search heroes, films and directors"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 4 4" strokeLinecap="round" />
            </svg>
            <span className="hidden pr-6 sm:inline lg:pr-10">Search</span>
            <kbd className="hidden rounded-md border border-rule bg-surface-2 px-1.5 py-px font-sans text-[11px] text-muted sm:inline">⌘K</kbd>
          </button>
          <Link
            href="/methodology"
            aria-current={methodOn ? "page" : undefined}
            className={`hidden rounded-full px-3 py-[7px] text-[14px] transition-colors md:block ${methodOn ? "font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            Method
          </Link>
          <button
            type="button"
            onClick={() => setMenu(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-rule bg-surface text-ink md:hidden"
            aria-label="Open menu"
            aria-expanded={menu}
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>
        </div>
      </div>
      {menu && <MenuSheet path={path} onClose={() => setMenu(false)} />}
    </header>
  );
}

function MenuSheet({ path, onClose }: { path: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const els = [...panel.current.querySelectorAll<HTMLElement>("a,button")];
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[95] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="fade-in absolute inset-0 bg-[rgb(20_16_14/0.4)]" onClick={onClose} aria-hidden />
      <div ref={panel} className="pop-in absolute inset-x-2 top-2 rounded-2xl border border-rule bg-surface p-2 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[var(--shadow-pop)]">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-serif text-[18px] font-semibold text-ink">Tollywood Analysis</span>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface-2" aria-label="Close menu">
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </div>
        <nav aria-label="Main">
          {[{ href: "/", label: "Home", match: ["/"] }, ...NAV, { href: "/methodology", label: "Method", match: ["/methodology", "/annexure"] }].map((n) => {
            const on = n.href === "/" ? path === "/" : isActive(path, n.match);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={`flex h-12 items-center justify-between rounded-xl px-3 text-[16px] ${on ? "bg-surface-2 font-semibold text-ink" : "text-ink-2"}`}>
                {n.label}
                {on && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-2 flex items-center justify-between border-t border-rule px-3 pt-3 text-[13px] text-muted">
          <span>Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </div>,
    document.body,
  );
}
