import type { MetadataRoute } from "next";
import { getDirectors } from "@/lib/directors";
import { getDashboardData, getRegistry } from "@/lib/repositories";

export const BASE_URL = "https://tollyanalysis.com";

export const STATIC_ROUTES = [
  "/",
  "/tolly-index",
  "/star-score",
  "/heroes",
  "/directors",
  "/releases",
  "/rankings",
  "/compare",
  "/trends",
  "/methodology",
  "/annexure/registry",
  "/annexure/heroes",
  "/annexure/sources",
  "/annexure/coverage",
  "/annexure/changelog",
  "/annexure/corrections",
  "/annexure/photo-credits",
  "/careers",
  "/contact",
  "/terms",
  "/privacy",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [dashboard, registry, directors] = await Promise.all([getDashboardData(), getRegistry(), getDirectors()]);
  const lastModified = dashboard.asOf ? new Date(`${dashboard.asOf}T06:00:00Z`) : new Date();

  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const route of [...STATIC_ROUTES, "/annexure"]) {
    const url = route === "/" ? BASE_URL : `${BASE_URL}${route}`;
    entries.set(url, {
      url,
      lastModified,
      changeFrequency: route === "/" ? "weekly" : "monthly",
      priority: route === "/" ? 1 : route.startsWith("/annexure") ? 0.7 : 0.85,
    });
  }

  for (const hero of dashboard.windows.all_time) {
    if (!hero.slug) continue;
    const url = `${BASE_URL}/hero/${hero.slug}`;
    if (!entries.has(url)) {
      entries.set(url, {
        url,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  for (const person of registry) {
    if (!person.slug) continue;
    const url = `${BASE_URL}/annexure/heroes/${person.slug}`;
    if (!entries.has(url)) {
      entries.set(url, {
        url,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.65,
      });
    }
  }

  for (const director of directors) {
    if (!director.slug) continue;
    const url = `${BASE_URL}/director/${director.slug}`;
    if (!entries.has(url)) {
      entries.set(url, {
        url,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.75,
      });
    }
  }

  return [...entries.values()];
}
