import credits from "@/lib/data/hero-photos.json";

export interface PhotoCredit {
  file: string;
  page: string;
  author: string;
  license: string;
  wikiTitle: string;
  description: string;
}

/** Free-licensed portraits from Wikimedia Commons (see scripts/fetch-hero-photos.ts). */
export const HERO_PHOTOS = credits as Record<string, PhotoCredit>;

export function heroPhoto(slug: string): string | null {
  return HERO_PHOTOS[slug]?.file ?? null;
}
