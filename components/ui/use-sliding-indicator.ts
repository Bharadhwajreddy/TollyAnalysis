"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * One sliding indicator for a group of items (nav, tabs, segmented controls, section rails, table rows).
 * Items carry `data-ind="<key>"`. The indicator element (class `slide-ind`) gets --x/--y/--w/--h/--o and glides
 * between items with the shared motion tokens. The first placement is instant (no slide from 0,0).
 *
 * `target` is what the indicator shows now: the hovered key if any, else the active key.
 */
export function useSlidingIndicator<C extends HTMLElement, I extends HTMLElement>(container: RefObject<C | null>, target: string | null) {
  const ind = useRef<I>(null);
  const placed = useRef(false);
  const latest = useRef(target);

  useLayoutEffect(() => {
    latest.current = target;
    place(container.current, ind.current, target, placed);
  }, [container, target]);

  useLayoutEffect(() => {
    const c = container.current;
    if (!c) return;
    const again = () => place(container.current, ind.current, latest.current, placed);
    const ro = new ResizeObserver(again);
    ro.observe(c);
    document.fonts?.ready.then(again).catch(() => {});
    return () => ro.disconnect();
  }, [container]);

  return ind;
}

function place(c: HTMLElement | null, el: HTMLElement | null, target: string | null, placed: { current: boolean }) {
  if (!c || !el) return;
  const item = target ? c.querySelector<HTMLElement>(`[data-ind="${CSS.escape(target)}"]`) : null;
  if (!item) {
    el.style.setProperty("--o", "0");
    return;
  }
  const cr = c.getBoundingClientRect();
  const r = item.getBoundingClientRect();
  if (!placed.current) el.setAttribute("data-instant", "");
  el.style.setProperty("--x", `${r.left - cr.left + c.scrollLeft}px`);
  el.style.setProperty("--y", `${r.top - cr.top + c.scrollTop}px`);
  el.style.setProperty("--w", `${r.width}px`);
  el.style.setProperty("--h", `${r.height}px`);
  el.style.setProperty("--o", "1");
  if (!placed.current) {
    placed.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute("data-instant")));
  }
}

/** Hover state for a group: returns the hovered key and handlers for the container. */
export function useHoverKey() {
  const [hover, setHover] = useState<string | null>(null);
  const onPointerOver = (e: React.PointerEvent) => {
    const k = (e.target as HTMLElement).closest<HTMLElement>("[data-ind]")?.dataset.ind ?? null;
    if (k) setHover(k);
  };
  const onPointerLeave = () => setHover(null);
  return { hover, setHover, bind: { onPointerOver, onPointerLeave } };
}
