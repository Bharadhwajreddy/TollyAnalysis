import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

// Mock next/font/google and CSS imports so app/layout.tsx can be imported in Node test environment
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-body", className: "inter" }),
  Playfair_Display: () => ({ variable: "--font-playfair", className: "playfair" }),
  JetBrains_Mono: () => ({ variable: "--font-jetbrains", className: "jetbrains" }),
}));

vi.mock("@/app/globals.css", () => ({}));

import nextConfig, { securityHeaders } from "@/next.config";
import openNextConfig from "@/open-next.config";
import { metadata } from "@/app/layout";
import robots from "@/app/robots";
import sitemap, { BASE_URL, STATIC_ROUTES } from "@/app/sitemap";
import { generateStaticParams as generateHeroStaticParams } from "@/app/hero/[slug]/page";
import { generateStaticParams as generateAnnexureHeroStaticParams } from "@/app/annexure/heroes/[slug]/page";
import { clientIp } from "@/lib/security/rate-limit";

function parseJsonc(raw: string): Record<string, unknown> {
  // Strip single-line and block comments outside string literals if any exist
  const stripped = raw.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (match, comment) => (comment ? "" : match)
  );
  return JSON.parse(stripped) as Record<string, unknown>;
}

describe("Cloudflare Workers & OpenNext packaging (FR-001)", () => {
  it("wrangler.jsonc parses cleanly and declares OpenNext entrypoint, assets, compatibility flags, and custom domains", () => {
    const wranglerPath = resolve(process.cwd(), "wrangler.jsonc");
    const raw = readFileSync(wranglerPath, "utf8");
    const config = parseJsonc(raw) as {
      $schema?: string;
      name?: string;
      main?: string;
      compatibility_date?: string;
      compatibility_flags?: string[];
      assets?: { directory?: string; binding?: string };
      observability?: { enabled?: boolean };
      vars?: Record<string, string>;
      routes?: Array<{ pattern: string; custom_domain?: boolean }>;
    };

    expect(config.$schema).toBe("node_modules/wrangler/config-schema.json");
    expect(config.name).toBe("tolly-analysis");
    expect(config.main).toBe(".open-next/worker.js");
    expect(config.compatibility_date).toBe("2025-05-05");
    expect(config.compatibility_flags).toEqual(
      expect.arrayContaining(["nodejs_compat", "global_fetch_strictly_public"])
    );
    expect(config.assets).toEqual({
      directory: ".open-next/assets",
      binding: "ASSETS",
    });
    expect(config.observability?.enabled).toBe(true);
    expect(config.vars?.NEXT_PUBLIC_DATA_MODE).toBe("real");
    expect(config.vars?.NEXT_PUBLIC_FEATURE_USER_RANKING).toBe("false");
    expect(config.routes).toEqual([
      { pattern: "tollyanalysis.com", custom_domain: true },
      { pattern: "www.tollyanalysis.com", custom_domain: true },
    ]);
  });

  it("open-next.config.ts exports a valid OpenNext Cloudflare configuration", () => {
    expect(openNextConfig).toBeDefined();
    expect(typeof openNextConfig).toBe("object");
  });
});

describe("Public search-engine indexing & canonical metadata (FR-002)", () => {
  it("nextConfig.headers() returns security headers and does not block indexing with X-Robots-Tag", async () => {
    expect(securityHeaders.some((h) => h.key.toLowerCase() === "x-robots-tag")).toBe(false);
    expect(nextConfig.headers).toBeDefined();

    const headerRules = await nextConfig.headers!();
    expect(headerRules.length).toBeGreaterThan(0);

    const allHeaders = headerRules.flatMap((rule) => rule.headers);
    const frameOptions = allHeaders.find((h) => h.key === "X-Frame-Options");
    const contentTypeOptions = allHeaders.find((h) => h.key === "X-Content-Type-Options");
    const robotsHeader = allHeaders.find((h) => h.key.toLowerCase() === "x-robots-tag");

    expect(frameOptions?.value).toBe("DENY");
    expect(contentTypeOptions?.value).toBe("nosniff");
    expect(robotsHeader).toBeUndefined();
  });

  it("app/layout.tsx metadata sets metadataBase to https://tollyanalysis.com and enables indexing", () => {
    expect(metadata.metadataBase?.toString()).toBe("https://tollyanalysis.com/");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      url: "https://tollyanalysis.com",
      siteName: "Tollywood Analysis",
    });
  });

  it("app/robots.ts allows public crawling, disallows /admin and /api, and references canonical sitemap", () => {
    const robotsConfig = robots();
    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
    const wildcardRule = rules.find((r) => r.userAgent === "*");

    expect(wildcardRule).toBeDefined();
    expect(wildcardRule?.allow).toBe("/");
    expect(wildcardRule?.disallow).toEqual(expect.arrayContaining(["/admin", "/api"]));
    expect(robotsConfig.sitemap).toBe("https://tollyanalysis.com/sitemap.xml");
  });

  it("app/sitemap.ts emits canonical https://tollyanalysis.com URLs for static routes, hero profiles, and annexure pages", async () => {
    expect(BASE_URL).toBe("https://tollyanalysis.com");
    expect(STATIC_ROUTES.length).toBeGreaterThanOrEqual(18);

    const entries = await sitemap();
    const urls = new Set(entries.map((entry) => entry.url));

    // Static routes
    expect(urls.has("https://tollyanalysis.com")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/tolly-index")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/star-score")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/heroes")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/methodology")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/privacy")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/terms")).toBe(true);

    // Dynamic hero profile routes
    expect(urls.has("https://tollyanalysis.com/hero/prabhas")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/hero/allari-naresh")).toBe(true);

    // Dynamic annexure hero routes
    expect(urls.has("https://tollyanalysis.com/annexure/heroes/prabhas")).toBe(true);

    // Excluded private/API routes
    for (const url of urls) {
      expect(url.startsWith("https://tollyanalysis.com")).toBe(true);
      expect(url.includes("/admin")).toBe(false);
      expect(url.includes("/api")).toBe(false);
    }
  });
});

describe("Build-time SSG pre-rendering for dynamic hero routes (FR-003)", () => {
  it("app/hero/[slug]/page.tsx generateStaticParams() returns >50 hero slugs including prabhas and nani", async () => {
    const params = await generateHeroStaticParams();
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(50);

    const slugs = new Set(params.map((p) => p.slug));
    expect(slugs.has("prabhas")).toBe(true);
    expect(slugs.has("nani")).toBe(true);
  });

  it("app/annexure/heroes/[slug]/page.tsx generateStaticParams() returns >50 hero slugs including prabhas and nani", async () => {
    const params = await generateAnnexureHeroStaticParams();
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(50);

    const slugs = new Set(params.map((p) => p.slug));
    expect(slugs.has("prabhas")).toBe(true);
    expect(slugs.has("nani")).toBe(true);
  });
});

describe("Cloudflare edge client IP resolution (FR-004)", () => {
  it("prioritizes cf-connecting-ip over x-forwarded-for and x-real-ip", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.42",
      "x-forwarded-for": "198.51.100.1, 198.51.100.2",
      "x-real-ip": "192.0.2.99",
    });
    expect(clientIp(headers)).toBe("203.0.113.42");
  });

  it("falls back to x-forwarded-for when cf-connecting-ip is absent, then x-real-ip, then unknown", () => {
    expect(
      clientIp(
        new Headers({
          "x-forwarded-for": " 198.51.100.10 , 198.51.100.20 ",
          "x-real-ip": "192.0.2.99",
        })
      )
    ).toBe("198.51.100.10");

    expect(
      clientIp(
        new Headers({
          "x-real-ip": " 192.0.2.99 ",
        })
      )
    ).toBe("192.0.2.99");

    expect(clientIp(new Headers())).toBe("unknown");
  });
});
