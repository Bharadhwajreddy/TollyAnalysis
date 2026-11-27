"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  /** Header label (short); `unit` is printed under it, so cells stay bare numbers. */
  header: ReactNode;
  unit?: ReactNode;
  /** Extra header content under the label row (e.g. an axis). */
  headerExtra?: ReactNode;
  /** Plain-language definition, shown as the header's tooltip. */
  title?: string;
  align?: "left" | "right";
  /** Column width in px (the table uses a fixed layout so wide content never reflows rows). */
  width: number;
  /** Returns the sort value; omit for an unsortable column. null always sorts last. */
  sortValue?: (row: T) => number | string | null;
  /** Lower is better: the first click sorts ascending. */
  asc?: boolean;
  /** Stick to the left edge while the table scrolls sideways (first column only). */
  sticky?: boolean;
  cell: (row: T, ctx: { sorted: boolean }) => ReactNode;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

const HEADER_OFFSET = () => (typeof window !== "undefined" && window.innerWidth >= 640 ? 64 : 56);

/**
 * The one data table: header that sticks under the site header (also while the table scrolls sideways),
 * sortable columns with a caret on the active column only and `aria-sort`, rows that glide to their new
 * place on a re-sort, one row highlight that slides between rows, a sticky first column with an edge
 * shadow and a right-edge fade on narrow screens. Numbers are right-aligned and tabular.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  sort: controlled,
  defaultSort,
  onSortChange,
  caption,
  rowLabel,
  className = "",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  sort?: SortState;
  defaultSort?: SortState;
  onSortChange?: (s: SortState) => void;
  /** Screen-reader caption. */
  caption: string;
  /** Accessible name for each row (used for the row header). */
  rowLabel?: (row: T) => string;
  className?: string;
}) {
  const [own, setOwn] = useState<SortState | undefined>(defaultSort);
  const sort = controlled ?? own;
  const setSort = (s: SortState) => {
    setOwn(s);
    onSortChange?.(s);
  };

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sortValue || !sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    const get = col.sortValue;
    return rows
      .map((r, i) => ({ r, i, v: get(r) }))
      .sort((a, b) => {
        if (a.v === null && b.v === null) return a.i - b.i;
        if (a.v === null) return 1;
        if (b.v === null) return -1;
        const d = typeof a.v === "string" || typeof b.v === "string" ? String(a.v).localeCompare(String(b.v)) : (a.v as number) - (b.v as number);
        return dir * d || a.i - b.i;
      })
      .map((x) => x.r);
  }, [rows, columns, sort]);

  const wrap = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);
  const hl = useRef<HTMLDivElement>(null);
  const hoverKey = useRef<string | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // ── Sticky header: translate the header cells so they sit under the site header while the table is in view.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const t = table.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const head = t.tHead?.getBoundingClientRect().height ?? 0;
      const y = Math.max(0, Math.min(r.height - head - 48, HEADER_OFFSET() - r.top));
      t.style.setProperty("--hy", `${y}px`);
      t.toggleAttribute("data-stuck", y > 0);
    };
    const on = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Edge shadow / fade for sideways scrolling, plus a one-time nudge that shows the table scrolls.
  const measureEdges = useCallback(() => {
    const s = scroller.current;
    if (!s) return;
    const left = s.scrollLeft > 1;
    const right = s.scrollLeft + s.clientWidth < s.scrollWidth - 1;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);
  useEffect(() => {
    const s = scroller.current;
    if (!s) return;
    measureEdges();
    const ro = new ResizeObserver(measureEdges);
    ro.observe(s);
    let nudged = false;
    try {
      nudged = sessionStorage.getItem("ta-table-nudge") === "1";
    } catch {}
    if (!nudged && s.scrollWidth > s.clientWidth + 8 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const io = new IntersectionObserver(
        (es) => {
          if (!es.some((e) => e.isIntersecting)) return;
          io.disconnect();
          try {
            sessionStorage.setItem("ta-table-nudge", "1");
          } catch {}
          s.scrollTo({ left: 28, behavior: "smooth" });
          setTimeout(() => s.scrollTo({ left: 0, behavior: "smooth" }), 420);
        },
        { threshold: 0.4 },
      );
      io.observe(s);
      return () => (ro.disconnect(), io.disconnect());
    }
    return () => ro.disconnect();
  }, [measureEdges]);

  // ── One highlight that slides to the hovered (or keyboard-focused) row.
  const placeHighlight = useCallback((key: string | null) => {
    hoverKey.current = key;
    const el = hl.current;
    const t = table.current;
    if (!el || !t) return;
    const tr = key ? t.querySelector<HTMLTableRowElement>(`tbody tr[data-key="${CSS.escape(key)}"]`) : null;
    if (!tr) {
      el.style.opacity = "0";
      return;
    }
    const first = el.style.opacity !== "1";
    if (first) el.style.transition = "opacity var(--dur-1) linear";
    el.style.transform = `translateY(${tr.offsetTop + t.offsetTop}px)`;
    el.style.height = `${tr.offsetHeight}px`;
    el.style.opacity = "1";
    if (first) requestAnimationFrame(() => (el.style.transition = ""));
  }, []);

  // ── FLIP: rows glide from their old place to the new one when the order changes.
  const lastTops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const t = table.current;
    if (!t) return;
    const trs = [...t.querySelectorAll<HTMLTableRowElement>("tbody tr[data-key]")];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    for (const tr of trs) {
      const k = tr.dataset.key as string;
      const top = tr.offsetTop;
      next.set(k, top);
      const prev = lastTops.current.get(k);
      if (!reduce && prev !== undefined && prev !== top) {
        tr.style.transition = "none";
        tr.style.transform = `translateY(${prev - top}px)`;
        requestAnimationFrame(() => {
          tr.style.transition = "transform var(--dur-4) var(--ease-in-out)";
          tr.style.transform = "";
        });
      }
    }
    lastTops.current = next;
    if (hoverKey.current) placeHighlight(hoverKey.current);
  }, [sorted, placeHighlight]);

  const keyOf = (e: React.SyntheticEvent) => (e.target as HTMLElement).closest<HTMLElement>("tr[data-key]")?.dataset.key ?? null;

  return (
    <div ref={wrap} className={`group/dt relative ${className}`} data-left={edges.left ? "" : undefined}>
      <div ref={scroller} className="scroll-x relative" onScroll={measureEdges}>
        <div className="relative" style={{ minWidth: columns.reduce((s, c) => s + c.width, 0) }}>
          <div ref={hl} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[3] bg-[color-mix(in_oklab,var(--ink)_5%,transparent)] opacity-0 transition-[transform,height,opacity] duration-[var(--dur-2)] ease-[var(--ease-out)]" />
          <table ref={table} className="dt w-full table-fixed border-separate border-spacing-0 text-[13.5px]">
            <caption className="sr-only">{caption}</caption>
            <colgroup>
              {columns.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((c, ci) => {
                  const active = sort?.key === c.key;
                  const right = (c.align ?? "right") === "right";
                  const ariaSort = active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined;
                  const label = (
                    <>
                      <span className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>
                        <span className={`label !leading-tight ${active ? "!text-ink" : ""}`}>{c.header}</span>
                        {c.sortValue && (
                          <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden className={`shrink-0 transition-[opacity,transform] duration-[var(--dur-2)] ease-[var(--ease-out)] ${active ? "opacity-100" : "opacity-0"} ${active && sort!.dir === "asc" ? "rotate-180" : ""}`}>
                            <path d="M1.5 3 4.5 6.5 7.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {c.unit && <span className={`mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-muted ${right ? "text-right" : ""}`}>{c.unit}</span>}
                    </>
                  );
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={ariaSort}
                      title={c.title}
                      className={`relative z-[4] h-[52px] border-b border-rule bg-surface px-3 [transform:translateY(var(--hy,0px))] [[data-stuck]_&]:shadow-[0_1px_0_var(--rule),0_6px_10px_-8px_rgb(0_0_0/0.25)] align-bottom font-normal ${right ? "text-right" : "text-left"} ${c.sticky ? "sticky left-0 z-[5] group-data-[left]/dt:shadow-[1px_0_0_var(--rule),8px_0_10px_-8px_rgb(0_0_0/0.22)]" : ""} ${ci === 0 ? "pl-4 sm:pl-6" : ""} ${ci === columns.length - 1 ? "pr-4 sm:pr-6" : ""}`}
                    >
                      {c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => setSort({ key: c.key, dir: active ? (sort!.dir === "asc" ? "desc" : "asc") : c.asc ? "asc" : "desc" })}
                          className={`group/h block w-full rounded-[4px] pb-2 pt-2 ${right ? "text-right" : "text-left"} hover:[&_.label]:text-ink`}
                        >
                          {label}
                        </button>
                      ) : (
                        <div className="pb-2 pt-2">{label}</div>
                      )}
                      {c.headerExtra}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody
              onMouseOver={(e) => {
                const k = keyOf(e);
                if (k !== hoverKey.current) placeHighlight(k);
              }}
              onMouseLeave={() => placeHighlight(null)}
              onFocus={(e) => placeHighlight(keyOf(e))}
              onBlur={() => placeHighlight(null)}
            >
              {sorted.map((r) => {
                const k = rowKey(r);
                return (
                  <tr key={k} data-key={k} aria-label={rowLabel?.(r)}>
                    {columns.map((c, ci) => {
                      const right = (c.align ?? "right") === "right";
                      const Tag = c.sticky ? "th" : "td";
                      return (
                        <Tag
                          key={c.key}
                          scope={c.sticky ? "row" : undefined}
                          className={`h-12 whitespace-nowrap border-b border-rule px-3 font-normal ${right ? "tabular text-right" : "text-left"} ${c.sticky ? "sticky left-0 z-[2] bg-surface group-data-[left]/dt:shadow-[1px_0_0_var(--rule),8px_0_10px_-8px_rgb(0_0_0/0.22)]" : ""} ${ci === 0 ? "pl-4 sm:pl-6" : ""} ${ci === columns.length - 1 ? "pr-4 sm:pr-6" : ""}`}
                        >
                          {c.cell(r, { sorted: sort?.key === c.key })}
                        </Tag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 z-[6] w-10 bg-gradient-to-l from-surface to-transparent transition-opacity duration-[var(--dur-2)] ${edges.right ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
