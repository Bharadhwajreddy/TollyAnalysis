/* eslint-disable @next/next/no-img-element -- small local portraits; plain img keeps SVG/HTML parity and avoids layout shifts */
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

/** The small square version of a hero photo (scripts/hero-thumbs.mts), for avatars up to ~88 px. */
export function heroThumb(photo: string | null): string | null {
  return photo ? photo.replace("/heroes/", "/heroes/thumb/").replace(/\.\w+$/, ".jpg") : null;
}

/**
 * Round hero portrait. Identity is the face and the name, never a colour: a hairline ring at rest, an accent
 * ring when `active`. Without a photo, neutral initials. (`industry` and `color` are accepted for older callers.)
 */
export function HeroAvatar({
  name,
  photo,
  size = 32,
  ring = true,
  active = false,
  className = "",
}: {
  name: string;
  photo: string | null;
  industry?: Industry;
  size?: number;
  ring?: boolean;
  active?: boolean;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 ${className}`}
      style={{ width: size, height: size, boxShadow: active ? "0 0 0 2px var(--surface), 0 0 0 4px var(--accent)" : ring ? "0 0 0 1px var(--rule)" : undefined }}
      aria-hidden
    >
      {photo ? (
        <img src={photo} alt="" width={size} height={size} loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_18%]" />
      ) : (
        <span className="grid h-full w-full place-items-center font-semibold text-ink-2" style={{ fontSize: size * 0.36 }}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
