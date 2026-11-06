import data from "./hero-facts.json";

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
