"use client";

import { useEffect, useRef, useState } from "react";

/** Tween a number towards `value` (requestAnimationFrame, ease-out). Instant with reduced motion. */
export function useTween(value: number, duration = 380): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    if (a === value || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      raf.current = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(raf.current);
    }
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * e;
      from.current = v;
      setShown(v);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return shown;
}
