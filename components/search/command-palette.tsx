"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MiniMarkClient } from "@/components/search/mini-mark";
import type { Outcome } from "@/lib/ledger-types";

type HeroHit = { k: "h"; s: string; n: string; i: string | null; r: number | null; x: number | null; f: number };
type FilmHit = { k: "f"; s: string; n: string; y: number; o: Outcome; h: string };
type DirHit = { k: "d"; s: string; n: string; c: number; r: number | null };
type Hit = HeroHit | FilmHit | DirHit;
interface Index {
  heroes: HeroHit[];
  films: FilmHit[];
  directors: DirHit[];
}

const PaletteCtx = createContext<{ open: (q?: string) => void }>({ open: () => {} });
export const usePalette = () => useContext(PaletteCtx);

let indexPromise: Promise<Index> | null = null;
const loadIndex = () => (indexPromise ??= fetch("/api/search").then((r) => r.json() as Promise<Index>));

const RECENT_KEY = "ta-recent";
function readRecent(): Hit[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function pushRecent(h: Hit) {
  try {
    const list = [h, ...readRecent().filter((x) => !(x.k === h.k && x.s === h.s))].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function rank<T extends Hit>(list: T[], q: string, max: number): T[] {
  const n = fold(q.trim());
  if (!n) return [];
  const starts: T[] = [];
  const words: T[] = [];
  const contains: T[] = [];
  for (const h of list) {
    const name = fold(h.n);
    if (name.startsWith(n)) starts.push(h);
    else if (name.split(/[\s:.-]+/).some((w) => w.startsWith(n))) words.push(h);
    else if (name.replace(/[^a-z0-9]/g, "").includes(n.replace(/[^a-z0-9]/g, ""))) contains.push(h);
    if (starts.length >= max) break;
  }
  return [...starts, ...words, ...contains].slice(0, max);
}

const href = (h: Hit) => (h.k === "h" ? `/hero/${h.s}` : h.k === "f" ? `/film/${h.s}` : `/director/${h.s}`);

/**
 * ⌘K / Ctrl-K / "/" search across heroes, films and directors. Grouped results, arrow keys and Enter,
 * recent picks. The index loads on first open (or first hover of the search button).
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const open = useCallback((initial = "") => {
    setQ(initial);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <PaletteCtx.Provider value={{ open }}>
      {children}
      {isOpen && <Palette q={q} setQ={setQ} onClose={() => setOpen(false)} />}
    </PaletteCtx.Provider>
  );
}

function Palette({ q, setQ, onClose }: { q: string; setQ: (s: string) => void; onClose: () => void }) {
  const router = useRouter();
  const id = useId();
  const [index, setIndex] = useState<Index | null>(null);
  const [active, setActive] = useState(0);
  const [recent] = useState(readRecent);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restore.current = document.activeElement as HTMLElement;
    input.current?.focus();
    loadIndex().then(setIndex).catch(() => {});
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      restore.current?.focus?.();
    };
  }, []);

  const groups = useMemo(() => {
    if (!q.trim()) return [{ title: recent.length ? "Recent" : "Top heroes", items: recent.length ? recent : (index?.heroes.slice(0, 6) ?? []) }];
    if (!index) return [];
    return [
      { title: "Heroes", items: rank(index.heroes, q, 5) },
      { title: "Films", items: rank(index.films, q, 6) },
      { title: "Directors", items: rank(index.directors, q, 4) },
    ].filter((g) => g.items.length);
  }, [q, index, recent]);
  const flat = groups.flatMap((g) => g.items as Hit[]);
  const safeActive = Math.min(active, Math.max(0, flat.length - 1));

  useEffect(() => {
    list.current?.querySelector(`[data-i="${safeActive}"]`)?.scrollIntoView({ block: "nearest" });
  }, [safeActive]);

  const go = (h: Hit) => {
    pushRecent(h);
    onClose();
    router.push(href(h));
  };

  let i = -1;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[12vh]" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fade-in absolute inset-0 bg-[rgb(20_16_14/0.38)] backdrop-blur-[2px]" aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Search" className="pop-in relative w-full max-w-[600px] overflow-hidden rounded-2xl border border-rule bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(flat.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && flat[safeActive]) {
                e.preventDefault();
                go(flat[safeActive]);
              } else if (e.key === "Escape") onClose();
            }}
            role="combobox"
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={flat.length ? `${id}-${safeActive}` : undefined}
            placeholder="Search heroes, films, directors…"
            className="h-14 w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded border border-rule px-1.5 py-0.5 text-[11px] text-muted sm:block">Esc</kbd>
        </div>
        <div ref={list} id={`${id}-list`} role="listbox" className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
          {q.trim() && index && !flat.length && <p className="px-3 py-8 text-center text-[14px] text-muted">Nothing called “{q}”. Try a hero, a film or a director.</p>}
          {!index && q.trim() && <p className="px-3 py-8 text-center text-[14px] text-muted">Loading…</p>}
          {groups.map((g) => (
            <div key={g.title} className="mb-1">
              <p className="label px-3 pb-1 pt-2">{g.title}</p>
              {(g.items as Hit[]).map((h) => {
                i++;
                const me = i;
                const on = me === safeActive;
                return (
                  <button
                    key={`${h.k}-${h.s}`}
                    id={`${id}-${me}`}
                    data-i={me}
                    role="option"
                    aria-selected={on}
                    type="button"
                    onMouseMove={() => setActive(me)}
                    onClick={() => go(h)}
                    className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[14px] transition-colors duration-100 ${on ? "bg-surface-2" : ""}`}
                  >
                    {h.k === "h" && (
                      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-rule">
                        {h.i ? <img src={h.i} alt="" width={28} height={28} className="h-full w-full object-cover object-[50%_18%]" /> : <span className="text-[10px] font-semibold text-ink-2">{h.n.slice(0, 2)}</span>}
                      </span>
                    )}
                    {h.k === "f" && (
                      <span className="grid h-7 w-7 shrink-0 place-items-center">
                        <MiniMarkClient o={h.o} />
                      </span>
                    )}
                    {h.k === "d" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[5px] bg-surface-2 text-[10px] font-semibold text-ink-2 ring-1 ring-rule">{h.n.replace(/\./g, " ").split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("")}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{h.n}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {h.k === "h" && (h.r ? `#${h.r} · Tolly Index ${h.x?.toFixed(1)}` : `${h.f} films as lead`)}
                        {h.k === "f" && `${h.y}${h.h ? ` · ${h.h}` : ""}`}
                        {h.k === "d" && `${h.c} films${h.r !== null ? ` · ${Math.round(h.r * 100)}% hits` : ""}`}
                      </span>
                    </span>
                    <span className={`text-[12px] text-muted transition-opacity ${on ? "opacity-100" : "opacity-0"}`} aria-hidden>
                      ↵
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-rule px-4 py-2 text-[11.5px] text-muted">
          <span><kbd className="font-sans">↑↓</kbd> move</span>
          <span><kbd className="font-sans">↵</kbd> open</span>
          <span className="ml-auto hidden sm:inline">Press <kbd className="rounded border border-rule px-1">/</kbd> anywhere to search</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Warm the index (e.g. on hover of the search button). */
export const prefetchSearch = () => void loadIndex().catch(() => {});
