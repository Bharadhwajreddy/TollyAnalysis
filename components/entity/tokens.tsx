import Link from "next/link";
import { ViewTransition } from "react";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { heroThumb } from "@/components/hero/hero-avatar";
import { heroPhoto } from "@/lib/constants/photos";
import { OUTCOME_VAR, directorHref, filmHref, heroHref, type Outcome } from "@/lib/ledger-types";

/**
 * Entity tokens: every hero, film and director name on the site is one of these, so anything you read is one
 * click from its page. The hero avatar carries a shared view-transition name and morphs into the hero page
 * header.
 */

export function HeroFace({ slug, name, size = 24, active = false, morph = true }: { slug: string; name: string; size?: number; active?: boolean; morph?: boolean }) {
  const face = <HeroAvatar name={name} photo={heroThumb(heroPhoto(slug))} size={size} active={active} />;
  return morph ? (
    <ViewTransition name={`face-${slug}`} share="morph" default="none">
      {face}
    </ViewTransition>
  ) : (
    face
  );
}

export function HeroToken({ slug, name, face = true, size = 20, className = "", morph = false }: { slug: string; name: string; face?: boolean; size?: number; className?: string; morph?: boolean }) {
  return (
    <Link href={heroHref(slug)} className={`group/t inline-flex items-center gap-1.5 align-middle font-medium text-ink hover:text-accent ${className}`}>
      {face && <HeroFace slug={slug} name={name} size={size} morph={morph} />}
      <span className="underline decoration-transparent decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-150 group-hover/t:decoration-current">{name}</span>
    </Link>
  );
}

/** The inline film mark: a tiny bar in the film's outcome colour. */
export function MiniMark({ o, className = "" }: { o: Outcome; className?: string }) {
  const solid = o === "hit" || o === "blockbuster";
  const half = o === "average";
  const outline = o === "flop" || o === "disaster";
  const c = OUTCOME_VAR[o];
  return (
    <svg width="6" height="11" viewBox="0 0 6 11" aria-hidden className={`inline-block shrink-0 ${className}`}>
      {solid && <rect x="0" y="0" width="6" height="11" rx="1" fill={c} />}
      {half && (
        <>
          <rect x="0.5" y="0.5" width="5" height="10" rx="1" fill="none" stroke={c} />
          <rect x="0" y="5.5" width="6" height="5.5" rx="1" fill={c} />
        </>
      )}
      {outline && <rect x="0.6" y="0.6" width="4.8" height="9.8" rx="1" fill="none" stroke={c} strokeWidth="1.2" />}
      {!solid && !half && !outline && <rect x="0.5" y="3.5" width="5" height="7" rx="1" fill="none" stroke={c} strokeDasharray="1.5 1.2" />}
    </svg>
  );
}

export function FilmToken({ slug, title, year, o, className = "", showYear = true }: { slug: string; title: string; year?: number; o?: Outcome; className?: string; showYear?: boolean }) {
  return (
    <Link href={filmHref(slug)} className={`group/t inline-flex items-baseline gap-1.5 font-medium text-ink hover:text-accent ${className}`}>
      {o && <MiniMark o={o} className="relative top-[1px] self-center" />}
      <span className="underline decoration-transparent decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-150 group-hover/t:decoration-current">{title}</span>
      {showYear && year && <span className="tabular font-normal text-muted">{year}</span>}
    </Link>
  );
}

const initials = (name: string) =>
  name
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/** Directors get a square monogram, so a director never reads as a hero. */
export function DirectorMono({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span aria-hidden className="inline-grid shrink-0 place-items-center rounded-[4px] bg-surface-2 font-semibold text-ink-2 ring-1 ring-rule" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials(name)}
    </span>
  );
}

export function DirectorToken({ slug, name, mono = false, className = "" }: { slug: string | null; name: string; mono?: boolean; className?: string }) {
  const inner = (
    <>
      {mono && <DirectorMono name={name} />}
      <span className={slug ? "underline decoration-transparent decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-150 group-hover/t:decoration-current" : ""}>{name}</span>
    </>
  );
  return slug ? (
    <Link href={directorHref(slug)} className={`group/t inline-flex items-center gap-1.5 font-medium text-ink hover:text-accent ${className}`}>
      {inner}
    </Link>
  ) : (
    <span className={`inline-flex items-center gap-1.5 text-ink-2 ${className}`}>{inner}</span>
  );
}
