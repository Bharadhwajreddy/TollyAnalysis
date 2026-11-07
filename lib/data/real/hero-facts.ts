import data from "./hero-facts.json";
import followersData from "./hero-followers.json";

/** Profile facts for a hero from Wikidata (scripts/hero-facts.mts). Shown on the hero page only. */
export interface HeroFacts {
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  heightCm?: number;
  education?: string[];
  awards?: string[];
  father?: string;
  mother?: string;
  spouse?: string[];
  siblings?: string[];
  children?: string[];
  relatives?: string[];
  party?: string[];
  offices?: string[];
  website?: string;
}

const facts = data.heroes as Record<string, HeroFacts>;
export const heroFactsSource = { source: data.source, fetched: data.fetched };

export function heroFacts(slug: string): HeroFacts | null {
  return facts[slug] ?? null;
}

/** Whole years between two ISO dates (the second defaults to today). */
export function yearsBetween(from: string, to?: string): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = to ? new Date(`${to}T00:00:00Z`) : new Date();
  let years = b.getUTCFullYear() - a.getUTCFullYear();
  if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) years--;
  return years;
}

export function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

type Platform = "instagram" | "x" | "youtube" | "facebook";
export interface FollowerCount {
  platform: Platform;
  followers: number;
  date: string;
  url: string | null;
  /** Where the number was read. */
  source: "official profile" | "Wikidata" | "press report";
}
const editor = followersData.heroes as Record<string, { counts: { platform: Platform; followers: number; date: string; url: string | null }[] }>;

/**
 * The newest follower count per platform for a hero: an editor's check of the official profile
 * (scripts/tolly/import-manual.mts) wins over older Wikidata or press figures passed in.
 */
export function latestFollowers(slug: string, fallback: FollowerCount[]): FollowerCount[] {
  const out = new Map<Platform, FollowerCount>();
  for (const c of fallback) out.set(c.platform, c);
  for (const c of editor[slug]?.counts ?? []) {
    const prev = out.get(c.platform);
    if (!prev || c.date >= prev.date) out.set(c.platform, { ...c, source: "official profile" });
  }
  const order: Platform[] = ["instagram", "x", "youtube", "facebook"];
  return order.flatMap((p) => (out.has(p) ? [out.get(p) as FollowerCount] : []));
}

/** 27_900_000 → "27.9M"; 845_000 → "845K". */
export function compactCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}
