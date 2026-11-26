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
import manifest from "@/app/manifest";
import { generateMetadata as generateHomeMetadata } from "@/app/page";
import robots from "@/app/robots";
import sitemap, { BASE_URL, STATIC_ROUTES } from "@/app/sitemap";
import {
  generateMetadata as generateHeroMetadata,
  generateStaticParams as generateHeroStaticParams,
} from "@/app/hero/[slug]/page";
import {
  generateMetadata as generateAnnexureHeroMetadata,
  generateStaticParams as generateAnnexureHeroStaticParams,
} from "@/app/annexure/heroes/[slug]/page";
import {
  generateMetadata as generateDirectorMetadata,
  generateStaticParams as generateDirectorStaticParams,
} from "@/app/director/[slug]/page";
import { metadata as tollyIndexMetadata } from "@/app/tolly-index/page";
import { metadata as starScoreMetadata } from "@/app/star-score/page";
import { metadata as heroesMetadata } from "@/app/heroes/page";
import { metadata as directorsMetadata } from "@/app/directors/page";
import { metadata as releasesMetadata } from "@/app/releases/page";
import { metadata as rankingsMetadata } from "@/app/rankings/page";
import { metadata as compareMetadata } from "@/app/compare/page";
import { metadata as trendsMetadata } from "@/app/trends/page";
import { metadata as methodologyMetadata } from "@/app/methodology/page";
import { metadata as annexureMetadata } from "@/app/annexure/page";
import { metadata as careersMetadata } from "@/app/careers/page";
import { metadata as contactMetadata } from "@/app/contact/page";
import { metadata as privacyMetadata } from "@/app/privacy/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import { metadata as annexureSourcesMetadata } from "@/app/annexure/sources/page";
import { metadata as annexureRegistryMetadata } from "@/app/annexure/registry/page";
import { metadata as annexureCoverageMetadata } from "@/app/annexure/coverage/page";
import { metadata as annexureChangelogMetadata } from "@/app/annexure/changelog/page";
import { metadata as annexureCorrectionsMetadata } from "@/app/annexure/corrections/page";
import { metadata as annexurePhotoCreditsMetadata } from "@/app/annexure/photo-credits/page";
import { metadata as annexureHeroesMetadata } from "@/app/annexure/heroes/page";
import { clientIp } from "@/lib/security/rate-limit";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  careersJsonLd,
  contactJsonLd,
  datasetJsonLd,
  directorsJsonLd,
  faqJsonLd,
  getAnnexureHeroSeo,
  getDirectorSeo,
  getHeroSeo,
  getHomeSeo,
  heroSameAs,
  itemListJsonLd,
  jsonLdGraph,
  licenseUrl,
  methodologyFaq,
  organizationJsonLd,
  pageMetadata,
  releasesJsonLd,
  serializeJsonLd,
  SITE_NAME,
  SITE_URL,
  starScoreEntries,
  tollyIndexEntries,
  websiteJsonLd,
} from "@/lib/seo";

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

  it("open-next.config.ts exports a valid OpenNext Cloudflare configuration with enableCacheInterception enabled", () => {
    expect(openNextConfig).toBeDefined();
    expect(typeof openNextConfig).toBe("object");
    expect(openNextConfig.dangerous?.enableCacheInterception).toBe(true);
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

  it("app/layout.tsx metadata sets metadataBase to https://tollyanalysis.com, enables indexing, and avoids root canonical trap", () => {
    expect(metadata.metadataBase?.toString()).toBe("https://tollyanalysis.com/");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBeUndefined();
    expect(Array.isArray(metadata.keywords)).toBe(true);
    expect(metadata.openGraph).toMatchObject({
      siteName: "Tollywood Analysis",
      locale: "en_IN",
      type: "website",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
    });
  });

  it("app/manifest.ts returns a valid Web App Manifest for tollyanalysis.com", () => {
    const m = manifest();
    expect(m.name).toContain(SITE_NAME);
    expect(m.short_name).toBe("TollyAnalysis");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.background_color).toBe("#f7f3ec");
    expect(m.theme_color).toBe("#f7f3ec");
    expect(m.icons).toEqual([
      expect.objectContaining({ src: "/icon.svg", type: "image/svg+xml" }),
    ]);
    expect(m.shortcuts?.length).toBeGreaterThanOrEqual(3);
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

  it("app/sitemap.ts emits canonical https://tollyanalysis.com URLs for static routes, hero profiles, director profiles, and annexure pages", async () => {
    expect(BASE_URL).toBe("https://tollyanalysis.com");
    expect(STATIC_ROUTES.length).toBeGreaterThanOrEqual(21);
    expect((STATIC_ROUTES as readonly string[]).includes("/annexure/methodology")).toBe(false);

    const entries = await sitemap();
    const urls = new Set(entries.map((entry) => entry.url));

    // Excluded redirecting routes must not appear in sitemap
    expect(urls.has("https://tollyanalysis.com/annexure/methodology")).toBe(false);

    // Static routes
    expect(urls.has("https://tollyanalysis.com")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/tolly-index")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/star-score")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/heroes")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/directors")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/releases")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/careers")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/contact")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/methodology")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/privacy")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/terms")).toBe(true);

    // Dynamic hero profile routes (including newly added South Indian heroes)
    expect(urls.has("https://tollyanalysis.com/hero/prabhas")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/hero/allari-naresh")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/hero/dulquer-salmaan")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/hero/rajinikanth")).toBe(true);
    expect(urls.has("https://tollyanalysis.com/hero/vijay")).toBe(true);

    // Dynamic director profile routes
    expect(urls.has("https://tollyanalysis.com/director/s-s-rajamouli")).toBe(true);

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

describe("Rich SEO metadata & Schema.org JSON-LD architecture (lib/seo.ts)", () => {
  it("serializeJsonLd safely escapes <, >, and & against script-injection while remaining valid JSON", () => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Actor </script><script>alert(1)&foo</script>",
    };
    const serialized = serializeJsonLd(payload);
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(serialized).toContain("\\u0026foo");
    expect(JSON.parse(serialized)).toEqual(payload);
  });

  it("pure Schema.org builders emit valid Organization, WebSite, Dataset, ItemList, BreadcrumbList, and FAQPage nodes", () => {
    expect(absoluteUrl("/")).toBe(SITE_URL);
    expect(absoluteUrl("/hero/prabhas")).toBe("https://tollyanalysis.com/hero/prabhas");
    expect(licenseUrl("CC-BY-SA-3.0")).toBe("https://creativecommons.org/licenses/by-sa/3.0/");
    expect(licenseUrl("CC0")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");

    const org = organizationJsonLd();
    const site = websiteJsonLd();
    const dataset = datasetJsonLd({
      asOf: "2026-11-17",
      version: "tolly-v3.0",
      firstYear: 2000,
      heroesRanked: 52,
      heroesTotal: 72,
      filmsTotal: 1331,
      filmsScored: 1151,
    });
    const list = itemListJsonLd({
      name: "Top Telugu Heroes",
      path: "/tolly-index",
      entries: [{ name: "Allu Arjun", path: "/hero/allu-arjun", description: "Tolly Index #1" }],
    });
    const crumbs = breadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "Prabhas", path: "/hero/prabhas" },
      ],
      "/hero/prabhas"
    );
    const faq = faqJsonLd([{ question: "What is the Tolly Index?", answer: "A 0-100 score." }], "/methodology");
    const graph = jsonLdGraph(org, site, dataset, list, crumbs, faq, null);

    expect(graph["@context"]).toBe("https://schema.org");
    expect(graph["@graph"]).toHaveLength(6);
    expect(dataset["@type"]).toBe("Dataset");
    expect(list["@type"]).toBe("ItemList");
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(faq["@type"]).toBe("FAQPage");
  });

  it("home page generateMetadata and getHomeSeo emit canonical '/', top-ranked hero summary, and WebSite + Dataset + ItemList JSON-LD", async () => {
    const homeMeta = await generateHomeMetadata();
    const homeSeo = await getHomeSeo();

    expect(homeMeta.alternates?.canonical).toBe("/");
    expect(homeMeta.description).toContain("Who is the No. 1 hero in Tollywood?");
    expect(homeMeta.description).toContain("Allu Arjun");
    expect(homeMeta.openGraph).toMatchObject({
      url: "https://tollyanalysis.com",
      siteName: "Tollywood Analysis",
    });

    const types = homeSeo.jsonLd["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "Dataset", "ItemList"]));
  });

  it("per-hero generateMetadata and getHeroSeo build data-driven titles, descriptions, canonicals, portrait OpenGraph, and entity-linked Person JSON-LD", async () => {
    const prabhasMeta = await generateHeroMetadata({
      params: Promise.resolve({ slug: "prabhas" }),
      searchParams: Promise.resolve({}),
    } as never);
    const prabhasSeo = await getHeroSeo("prabhas");

    expect(prabhasSeo).not.toBeNull();
    expect(prabhasMeta.title).toBe("Prabhas Hits and Flops, Box Office & Hit Ratio");
    expect(prabhasMeta.alternates?.canonical).toBe("/hero/prabhas");
    expect(prabhasMeta.description).toContain("Prabhas box office record:");
    expect(prabhasMeta.description).toContain("Telugu films as lead hero");
    expect(prabhasMeta.description).toContain("hit ratio");
    expect(prabhasMeta.openGraph).toMatchObject({
      type: "profile",
      url: "https://tollyanalysis.com/hero/prabhas",
      images: [expect.objectContaining({ url: "https://tollyanalysis.com/heroes/prabhas.jpg" })],
    });

    expect(prabhasSeo?.sameAs).toEqual(
      expect.arrayContaining([
        "https://en.wikipedia.org/wiki/Prabhas",
        "https://www.wikidata.org/wiki/Q3136554",
        "https://www.instagram.com/actorprabhas/",
      ])
    );

    const personNode = prabhasSeo?.jsonLd["@graph"].find((n) => n["@type"] === "Person");
    const breadcrumbNode = prabhasSeo?.jsonLd["@graph"].find((n) => n["@type"] === "BreadcrumbList");
    const topFilmsNode = prabhasSeo?.jsonLd["@graph"].find((n) => n["@type"] === "ItemList");

    expect(personNode).toBeDefined();
    expect(personNode?.name).toBe("Prabhas");
    expect(personNode?.sameAs).toEqual(expect.arrayContaining(["https://en.wikipedia.org/wiki/Prabhas", "https://www.wikidata.org/wiki/Q3136554"]));
    expect(breadcrumbNode).toBeDefined();
    expect(topFilmsNode).toBeDefined();

    // Unknown hero fallback disables indexing
    const missingMeta = await generateHeroMetadata({
      params: Promise.resolve({ slug: "non-existent-hero" }),
      searchParams: Promise.resolve({}),
    } as never);
    expect(missingMeta.title).toBe("Hero not found");
    expect(missingMeta.robots).toEqual({ index: false, follow: false });
  });

  it("annexure hero generateMetadata and getAnnexureHeroSeo set per-hero canonical and evidence summary", async () => {
    const naniAnnexureMeta = await generateAnnexureHeroMetadata({
      params: Promise.resolve({ slug: "nani" }),
      searchParams: Promise.resolve({}),
    } as never);
    const naniAnnexureSeo = await getAnnexureHeroSeo("nani");

    expect(naniAnnexureMeta.title).toBe("Nani Filmography & Box-Office Evidence");
    expect(naniAnnexureMeta.alternates?.canonical).toBe("/annexure/heroes/nani");
    expect(naniAnnexureMeta.description).toContain("Film-by-film evidence behind Nani's scores");
    expect(naniAnnexureSeo?.jsonLd["@graph"].map((n) => n["@type"])).toEqual(
      expect.arrayContaining(["CollectionPage", "BreadcrumbList"])
    );
  });

  it("per-director generateMetadata and getDirectorSeo emit canonical, data-driven description, Person/BreadcrumbList/ItemList JSON-LD, and safe fallback", async () => {
    const rajamouliMeta = await generateDirectorMetadata({
      params: Promise.resolve({ slug: "s-s-rajamouli" }),
      searchParams: Promise.resolve({}),
    } as never);
    const rajamouliSeo = await getDirectorSeo("s-s-rajamouli");

    expect(rajamouliSeo).not.toBeNull();
    expect(rajamouliMeta.title).toBe("S. S. Rajamouli Telugu Movies, Hit Rate, Box Office & Career Graph");
    expect(rajamouliMeta.alternates?.canonical).toBe("/director/s-s-rajamouli");
    expect(rajamouliMeta.description).toContain("S. S. Rajamouli director box office record:");
    expect(rajamouliMeta.description).toContain("Telugu films");
    expect(rajamouliMeta.description).toContain("% hit rate");
    expect(rajamouliMeta.description).toContain("reported worldwide box office");
    expect(rajamouliMeta.openGraph).toMatchObject({
      type: "profile",
      url: "https://tollyanalysis.com/director/s-s-rajamouli",
      siteName: "Tollywood Analysis",
      locale: "en_IN",
    });

    const graph = rajamouliSeo!.jsonLd["@graph"];
    const personNode = graph.find((n) => n["@type"] === "Person");
    const breadcrumbNode = graph.find((n) => n["@type"] === "BreadcrumbList");
    const itemListNode = graph.find((n) => n["@type"] === "ItemList");

    expect(personNode).toBeDefined();
    expect(personNode?.name).toBe("S. S. Rajamouli");
    expect(personNode?.jobTitle).toBe("Film Director");
    expect(personNode?.knowsAbout).toEqual(["Telugu cinema", "Tollywood"]);
    expect(personNode?.mainEntityOfPage).toEqual({ "@id": "https://tollyanalysis.com/director/s-s-rajamouli#webpage" });
    expect(breadcrumbNode).toBeDefined();
    expect((breadcrumbNode?.itemListElement as Array<{ name: string }>).map((c) => c.name)).toEqual(["Home", "Directors", "S. S. Rajamouli"]);
    expect(itemListNode).toBeDefined();
    expect((itemListNode?.numberOfItems as number)).toBeGreaterThan(0);

    const serialized = serializeJsonLd(rajamouliSeo!.jsonLd);
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(JSON.parse(serialized)).toEqual(rajamouliSeo!.jsonLd);

    expect(await getDirectorSeo("non-existent-director")).toBeNull();
    const missingMeta = await generateDirectorMetadata({
      params: Promise.resolve({ slug: "non-existent-director" }),
      searchParams: Promise.resolve({}),
    } as never);
    expect(missingMeta.title).toBe("Director not found");
    expect(missingMeta.robots).toEqual({ index: false, follow: false });
  });

  it("core route metadata exports explicit per-page canonicals, descriptions, OpenGraph URLs, and structured-data entries", async () => {
    const routes: Array<[string, typeof tollyIndexMetadata]> = [
      ["/tolly-index", tollyIndexMetadata],
      ["/star-score", starScoreMetadata],
      ["/heroes", heroesMetadata],
      ["/directors", directorsMetadata],
      ["/releases", releasesMetadata],
      ["/rankings", rankingsMetadata],
      ["/compare", compareMetadata],
      ["/trends", trendsMetadata],
      ["/methodology", methodologyMetadata],
      ["/annexure", annexureMetadata],
      ["/careers", careersMetadata],
      ["/contact", contactMetadata],
    ];

    for (const [path, meta] of routes) {
      expect(meta.alternates?.canonical).toBe(path);
      expect(typeof meta.description).toBe("string");
      expect((meta.description as string).length).toBeGreaterThan(50);
      expect(meta.openGraph).toMatchObject({
        url: `https://tollyanalysis.com${path}`,
        siteName: "Tollywood Analysis",
        locale: "en_IN",
      });
    }

    const legalAndAnnexureRoutes: Array<[string, typeof privacyMetadata]> = [
      ["/privacy", privacyMetadata],
      ["/terms", termsMetadata],
      ["/annexure/sources", annexureSourcesMetadata],
      ["/annexure/registry", annexureRegistryMetadata],
      ["/annexure/coverage", annexureCoverageMetadata],
      ["/annexure/changelog", annexureChangelogMetadata],
      ["/annexure/corrections", annexureCorrectionsMetadata],
      ["/annexure/photo-credits", annexurePhotoCreditsMetadata],
      ["/annexure/heroes", annexureHeroesMetadata],
    ];

    for (const [path, meta] of legalAndAnnexureRoutes) {
      const titleText =
        typeof meta.title === "string"
          ? meta.title
          : meta.title && typeof meta.title === "object" && "absolute" in meta.title
            ? meta.title.absolute
            : "";
      expect(typeof titleText).toBe("string");
      expect(titleText.trim().length).toBeGreaterThan(0);
      expect(typeof meta.description).toBe("string");
      expect((meta.description as string).trim().length).toBeGreaterThan(30);
      expect(meta.alternates?.canonical).toBe(path);
      expect(meta.openGraph).toMatchObject({
        url: `https://tollyanalysis.com${path}`,
      });
    }

    const directorsGraph = await directorsJsonLd();
    expect(directorsGraph["@graph"].map((n) => n["@type"])).toEqual(
      expect.arrayContaining(["CollectionPage", "BreadcrumbList", "ItemList"])
    );

    const releasesGraph = releasesJsonLd();
    expect(releasesGraph["@graph"].map((n) => n["@type"])).toEqual(
      expect.arrayContaining(["CollectionPage", "Dataset", "BreadcrumbList"])
    );

    expect(careersJsonLd()["@graph"].map((n) => n["@type"])).toEqual(
      expect.arrayContaining(["WebPage", "BreadcrumbList"])
    );
    expect(contactJsonLd()["@graph"].map((n) => n["@type"])).toEqual(
      expect.arrayContaining(["ContactPage", "BreadcrumbList"])
    );

    const tollyEntries = await tollyIndexEntries();
    const starEntries = await starScoreEntries();
    const faq = methodologyFaq("real");

    expect(tollyEntries.length).toBeGreaterThan(40);
    expect(starEntries.length).toBeGreaterThan(40);
    expect(faq.length).toBeGreaterThanOrEqual(5);
    expect(heroSameAs({ wikiArticle: "Nani (actor)", wikidataId: "Q3520529", x: "NameisNani" })).toEqual([
      "https://en.wikipedia.org/wiki/Nani_(actor)",
      "https://www.wikidata.org/wiki/Q3520529",
      "https://x.com/NameisNani",
    ]);
    expect(pageMetadata({ title: "Test", description: "Desc", path: "/test" }).alternates?.canonical).toBe("/test");
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

  it("app/director/[slug]/page.tsx generateStaticParams() returns >50 director slugs including s-s-rajamouli", async () => {
    const params = await generateDirectorStaticParams();
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(50);

    const slugs = new Set(params.map((p) => p.slug));
    expect(slugs.has("s-s-rajamouli")).toBe(true);
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

describe("Bing Webmaster verification & IndexNow configuration (FR-008)", () => {
  it("app/layout.tsx declares the msvalidate.01 Bing verification meta tag and public/ hosts the matching IndexNow key file", () => {
    expect(metadata.verification?.other?.["msvalidate.01"]).toBe("67320882F622547CD076E83EED0C41E2");

    const key = "966a3d36f9fb496db085a6e167d01f86";
    const keyFile = readFileSync(resolve(process.cwd(), "public", `${key}.txt`), "utf8").trim();
    expect(keyFile).toBe(key);
  });
});
