"use client";

import { useEffect, useRef } from "react";

/**
 * Draw-in once: if the element hydrated below the fold, mark it pending (marks start collapsed) and release
 * it the first time it scrolls into view. Server markup is always the final state, so anything on screen at
 * load, reached by an anchor, printed or rendered without JavaScript is never hidden.
 */
export function useEnter<T extends HTMLElement | SVGElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    el.setAttribute("data-enter", "pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          requestAnimationFrame(() => el.removeAttribute("data-enter"));
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
