"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a figure like "1,148", "36.4M" or "90.0" up from zero the first time it scrolls into view.
 * Server-rendered with the final value, so it reads correctly without JavaScript and for screen readers;
 * skipped when the visitor asks for reduced motion.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const m = /^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/.exec(value);
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!m || !ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, num, post] = m;
    const target = Number(num.replace(/,/g, ""));
    const decimals = num.includes(".") ? num.split(".")[1].length : 0;
    const grouped = num.includes(",");
    const fmt = (v: number) => pre + (grouped ? Math.round(v).toLocaleString("en-IN") : v.toFixed(decimals)) + post;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / 1100);
          setShown(fmt(target * (1 - (1 - p) ** 3)));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        setShown(fmt(0));
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
