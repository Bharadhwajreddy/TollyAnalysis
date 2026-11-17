"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SearchHero {
  slug: string;
  name: string;
  thumb: string | null;
  rank: number | null;
}

const MAX_RESULTS = 8;

/**
 * "Find your hero": type a name, pick a hero, land on his page. A proper combobox: arrow keys move
 * through the matches, Enter opens one, Escape closes the list, and the list scrolls if it is long.
 */
export function HeroSearch({ heroes }: { heroes: SearchHero[] }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const all = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const starts = heroes.filter((h) => h.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(needle)));
    const contains = heroes.filter((h) => !starts.includes(h) && h.name.toLowerCase().includes(needle));
    return [...starts, ...contains];
  }, [q, heroes]);
  const matches = all.slice(0, MAX_RESULTS);
  const show = open && q.trim().length > 0;

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/hero/${slug}`);
  };

  return (
    <div
      className="relative z-30 w-full max-w-md"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className="sr-only">
        Find a hero
      </label>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-6 z-10 h-[18px] w-[18px] -translate-y-1/2 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder="Find your hero…"
        value={q}
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && matches[active] ? `${id}-opt-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(matches.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && matches[active]) {
            e.preventDefault();
            go(matches[active].slug);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-12 w-full rounded-full border border-white/25 bg-white/10 pl-11 pr-11 text-[15px] text-white placeholder:text-white/60 backdrop-blur transition-colors focus:border-white/60 focus:bg-white/15 focus:outline-none"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setOpen(false);
          }}
          aria-label="Clear search"
          className="absolute right-2 top-6 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[18px] leading-none text-white/70 hover:bg-white/15 hover:text-white"
        >
          ×
        </button>
      )}

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] origin-top overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-[0_18px_40px_rgba(20,13,12,0.35)] transition duration-150 ${
          show ? "scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0"
        }`}
      >
        <ul ref={listRef} id={listId} role="listbox" aria-label="Matching heroes" className="max-h-[min(55vh,384px)] overflow-y-auto overscroll-contain py-1.5">
          {matches.map((h, i) => (
            <li
              key={h.slug}
              id={`${id}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(h.slug)}
              className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-[14.5px] ${i === active ? "bg-wine-soft" : ""}`}
            >
              {h.thumb ? (
                <img src={h.thumb} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-surface" />
              ) : (
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-wine text-[12px] font-semibold text-white">
                  {h.name[0]}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{highlight(h.name, q)}</span>
              <span className={`tabular shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${h.rank !== null ? "bg-wine/10 text-wine" : "text-muted"}`}>
                {h.rank !== null ? `#${h.rank}` : "not ranked"}
              </span>
            </li>
          ))}
          {show && matches.length === 0 && <li className="px-4 py-3 text-[13.5px] text-ink-2">No hero by that name.</li>}
        </ul>
        {all.length > MAX_RESULTS && (
          <p className="border-t border-line px-4 py-2 text-[12px] text-muted">
            {all.length - MAX_RESULTS} more · keep typing to narrow it down
          </p>
        )}
      </div>
    </div>
  );
}

/** The typed letters in bold inside a name. */
function highlight(name: string, q: string) {
  const needle = q.trim();
  const i = needle ? name.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (i < 0) return name;
  return (
    <>
      {name.slice(0, i)}
      <mark className="bg-transparent font-bold text-wine">{name.slice(i, i + needle.length)}</mark>
      {name.slice(i + needle.length)}
    </>
  );
}
