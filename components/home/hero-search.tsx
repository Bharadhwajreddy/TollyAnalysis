"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

export interface SearchHero {
  slug: string;
  name: string;
  thumb: string | null;
  rank: number | null;
}

/** "Find your hero": type a name, pick a hero, land on his page. */
export function HeroSearch({ heroes }: { heroes: SearchHero[] }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const starts = heroes.filter((h) => h.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(needle)));
    const contains = heroes.filter((h) => !starts.includes(h) && h.name.toLowerCase().includes(needle));
    return [...starts, ...contains].slice(0, 6);
  }, [q, heroes]);
  const show = open && q.trim().length > 0;
  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (matches[0]) router.push(`/hero/${matches[0].slug}`);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className="sr-only">
        Find a hero
      </label>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Find your hero…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-controls={`${id}-list`}
        className="h-12 w-full rounded-full border border-white/25 bg-white/10 pl-11 pr-4 text-[15px] text-white placeholder:text-white/60 backdrop-blur focus:border-white/60 focus:bg-white/15 focus:outline-none"
      />
      <ul id={`${id}-list`} aria-label="Matching heroes" className={`absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-xl ${show ? "" : "hidden"}`}>
        {matches.map((h) => (
          <li key={h.slug}>
            <Link href={`/hero/${h.slug}`} className="flex items-center gap-3 px-3 py-2 text-[14px] hover:bg-wine-soft focus-visible:bg-wine-soft">
              {h.thumb ? (
                <img src={h.thumb} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-wine text-[11px] font-semibold text-white">
                  {h.name[0]}
                </span>
              )}
              <span className="font-medium">{h.name}</span>
              {h.rank !== null && <span className="tabular ml-auto text-[12px] text-muted">#{h.rank}</span>}
            </Link>
          </li>
        ))}
        {show && matches.length === 0 && <li className="px-3 py-2.5 text-[13.5px] text-ink-2">No hero by that name.</li>}
      </ul>
    </form>
  );
}
