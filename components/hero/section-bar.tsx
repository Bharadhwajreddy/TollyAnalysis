"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHoverKey, useSlidingIndicator } from "@/components/ui/use-sliding-indicator";

/**
 * The in-page section bar: sticky under the site header, a pill that slides to the section being read and a
 * faint ghost that follows the pointer.
 */
export function SectionBar({ sections, aside }: { sections: { id: string; label: string }[]; aside?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(sections[0]?.id ?? null);
  const { hover, bind } = useHoverKey();
  const pill = useSlidingIndicator<HTMLDivElement, HTMLSpanElement>(box, active);
  const ghost = useSlidingIndicator<HTMLDivElement, HTMLSpanElement>(box, hover && hover !== active ? hover : null);

  // The active section is the last one whose title has passed 40% of the viewport (robust to jumps and long sections).
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let cur = sections[0]?.id ?? null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) cur = s.id;
      }
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [sections]);

  // Keep the active item in view on narrow screens.
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-ind="${active}"]`);
    const c = box.current;
    if (!el || !c || c.scrollWidth <= c.clientWidth) return;
    c.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="On this page" className="sticky top-14 z-30 -mx-4 mt-8 border-b border-rule bg-paper/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80 sm:top-16 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div ref={box} {...bind} className="scroll-x relative -mb-px flex min-w-0 gap-1 py-2 [scrollbar-width:none]">
          <span ref={ghost} aria-hidden className="slide-ind rounded-[8px] bg-surface-2/60" />
          <span ref={pill} aria-hidden className="slide-ind rounded-[8px] bg-surface-2" />
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-ind={s.id}
              aria-current={active === s.id ? "location" : undefined}
              className={`relative z-[1] whitespace-nowrap rounded-[8px] px-3 py-2 text-[13.5px] font-medium transition-colors duration-150 ${active === s.id ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {s.label}
            </a>
          ))}
        </div>
        {aside && <div className="hidden shrink-0 sm:block">{aside}</div>}
      </div>
    </nav>
  );
}
