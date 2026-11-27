"use client";

import Link from "next/link";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-16 sm:px-6 sm:pt-24 lg:px-8">
      <h1 className="max-w-2xl font-serif text-[36px] font-bold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[48px]">Something broke on our side.</h1>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-2">The page did not load. Try again; if it keeps happening, let us know.</p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button type="button" onClick={() => retry()} className="h-11 rounded-xl bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90">
          Try again
        </button>
        <Link href="/" className="link text-[14px] font-medium">Go home</Link>
        <Link href="/contact" className="link text-[14px] font-medium">Report it</Link>
      </div>
    </div>
  );
}
