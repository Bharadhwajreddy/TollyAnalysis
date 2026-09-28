import Link from "next/link";

/** Minimal header: just the name. Everything else is on one scrolling page. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Tollywood Analysis home">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-wine font-serif text-[13px] font-bold text-white">
            TA
          </span>
          <span className="font-serif text-[17px] font-semibold tracking-tight text-ink">Tollywood Analysis</span>
        </Link>
      </div>
    </header>
  );
}
