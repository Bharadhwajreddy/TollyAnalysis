/* eslint-disable @next/next/no-img-element -- small local portraits; plain img keeps SVG/HTML parity and avoids layout shifts */
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import type { Industry } from "@/lib/domain/types";

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Round hero portrait with an industry-coloured ring; falls back to initials. */
export function HeroAvatar({
  name,
  photo,
  industry,
  size = 32,
  ring = true,
  color: colorProp,
  className = "",
}: {
  name: string;
  photo: string | null;
  industry: Industry;
  size?: number;
  ring?: boolean;
  /** Ring / placeholder colour; defaults to the industry colour. */
  color?: string;
  className?: string;
}) {
  const color = colorProp ?? INDUSTRY_COLOR[industry];
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 ${className}`}
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${color}` : undefined }}
      aria-hidden
    >
      {photo ? (
        <img src={photo} alt="" width={size} height={size} loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_18%]" />
      ) : (
        <span className="font-semibold text-white" style={{ background: color, width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: size * 0.38 }}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
