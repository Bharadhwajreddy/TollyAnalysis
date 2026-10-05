import type { ReactNode } from "react";

/** A titled section that opens and closes (native <details>, works without JavaScript). */
export function Collapsible({
  id,
  title,
  subtitle,
  children,
  defaultOpen = false,
  variant = "card",
}: {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: "card" | "plain";
}) {
  return (
    <details id={id} open={defaultOpen} className={variant === "card" ? "card group" : "group border-t border-line"}>
      <summary className={`flex items-center justify-between gap-4 ${variant === "card" ? "px-4 py-4 sm:px-6" : "py-4"}`}>
        <span className="min-w-0">
          <span className="block font-serif text-[19px] font-semibold leading-snug text-ink sm:text-[21px]">{title}</span>
          {subtitle && <span className="mt-0.5 block text-[13px] text-ink-2">{subtitle}</span>}
        </span>
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl text-wine group-hover:bg-wine-soft">
          <span className="when-closed">+</span>
          <span className="when-open">−</span>
        </span>
      </summary>
      <div className={variant === "card" ? "border-t border-line px-4 pb-5 pt-4 sm:px-6" : "pb-5"}>{children}</div>
    </details>
  );
}
