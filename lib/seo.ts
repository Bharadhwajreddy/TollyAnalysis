/**
 * Search metadata and Schema.org JSON-LD for tollyanalysis.com.
 *
 * Two layers:
 * 1. Pure builders (no data access): URLs, safe JSON-LD serialisation, page metadata with a
 *    per-page canonical + complete OpenGraph/Twitter blocks, and Schema.org node builders.
 * 2. Data-backed summaries (`getHeroSeo`, `getAnnexureHeroSeo`, `getHomeSeo`, `methodologyFaq`) that
 *    read the same dataset the pages render, so every number in a title, description or JSON-LD
 *    node is the number on the page. Synthetic demo data never reaches structured data.
 *
 * Next.js merges `metadata` shallowly: a page that sets `openGraph` replaces the root block
 * entirely, so `pageMetadata` always emits the full block (siteName, locale, type, url).
 */
import type { Metadata } from "next";
import { createElement } from "react";
import { STAR_PARTS } from "@/lib/calculations/star";
import { FAMILY_GROUPS } from "@/lib/constants/groups";
import { METHODOLOGY } from "@/lib/constants/methodology";
import { formatMetric } from "@/lib/constants/metrics";
import { HERO_PHOTOS, heroPhoto } from "@/lib/constants/photos";
import { heroFacts } from "@/lib/data/real/hero-facts";
import { socialHandles } from "@/lib/data/real/load";
import { tollyIndexEnabled, userRankingEnabled } from "@/lib/features";
import { rankBy } from "@/lib/ranking";
import { getDashboardData, getHeroFilms, getPerson, type FilmEvidenceRow } from "@/lib/repositories";
import { getTollyHero, getTollyRanking, tollyMeta } from "@/lib/tolly/view";
import type { HeroView } from "@/lib/view-models";

// ---------------------------------------------------------------------------------------------
// Site constants
// ---------------------------------------------------------------------------------------------

export const SITE_URL = "https://tollyanalysis.com";
export const SITE_NAME = "Tollywood Analysis";
export const SITE_ALTERNATE_NAMES = ["Tolly Analysis", "TollyAnalysis", "tollyanalysis.com"];
export const SITE_TAGLINE = "Who is Tollywood's biggest hero?";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "Independent, transparent benchmarks of Telugu-cinema lead actors: performance, audience reception, consistency, momentum and release cadence.";
export const SITE_LOCALE = "en_IN";
export const SITE_LANGUAGE = "en-IN";
/** Page background (matches `viewport.themeColor`). */
export const THEME_COLOR = "#f7f3ec";
/** Brand wine (the app icon). */
export const BRAND_COLOR = "#7a1f3d";
export const SITE_KEYWORDS = [
  "Tollywood",
  "Telugu cinema",
  "Telugu heroes ranking",
  "Tollywood hero ranking",
  "No 1 hero in Tollywood",
  "Telugu heroes hits and flops",
  "Telugu box office",
  "Tollywood box office collection",
  "Telugu heroes hit ratio",
  "Tolly Index",
  "Star Score",
];

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const DATASET_ID = `${SITE_URL}/#dataset`;

// ---------------------------------------------------------------------------------------------
// URLs and safe serialisation
// ---------------------------------------------------------------------------------------------

/** Absolute https://tollyanalysis.com URL for a site path. The home page is the bare origin, as in the sitemap. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? SITE_URL : `${SITE_URL}${p}`;
}

export const heroPath = (slug: string) => `/hero/${slug}`;
export const annexureHeroPath = (slug: string) => `/annexure/heroes/${slug}`;
/** Stable `@id` of a hero's Person node, shared by every page that mentions him. */
export const personId = (slug: string) => `${absoluteUrl(heroPath(slug))}#person`;

export function wikipediaUrl(article: string | null | undefined): string | null {
  return article ? `https://en.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, "_"))}` : null;
}

export function wikidataUrl(id: string | null | undefined): string | null {
  return id && /^Q\d+$/.test(id) ? `https://www.wikidata.org/wiki/${id}` : null;
}

/**
 * JSON for a `<script type="application/ld+json">` body. `<`, `>` and `&` become unicode escapes so a
 * value can never close the script element or open a comment; U+2028/U+2029 are escaped for old parsers.
 * The output is still valid JSON that parses back to the same value.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export type JsonLdNode = Record<string, unknown>;
export interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
}

/** One `@graph` document from several nodes; falsy entries are dropped. */
export function jsonLdGraph(...nodes: (JsonLdNode | null | undefined | false)[]): JsonLdGraph {
  return { "@context": "https://schema.org", "@graph": nodes.filter((n): n is JsonLdNode => !!n) };
}

/** Server-rendered structured-data block. Not executable, so a plain `<script>` (not next/script). */
export function JsonLd({ data }: { data: JsonLdGraph | JsonLdNode }) {
  return createElement("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: serializeJsonLd(data) } });
}

// ---------------------------------------------------------------------------------------------
// Page metadata
// ---------------------------------------------------------------------------------------------

export interface SeoImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface PageMetadataInput {
  /** Page title; the root template appends " · Tollywood Analysis". Use `{ absolute }` to skip the template. */
  title: string | { absolute: string };
  description: string;
  /** Site path of this page: becomes the canonical, og:url and twitter URL. */
  path: string;
  keywords?: string[];
  /** Social title (no template is applied to og:title, so it should carry its own context). */
  socialTitle?: string;
  type?: "website" | "profile" | "article";
  images?: SeoImage[];
  /** `summary` suits portrait photos; `summary_large_image` needs a wide image. */
  twitterCard?: "summary" | "summary_large_image";
}

/** Full metadata for one page: canonical, description, keywords, OpenGraph and Twitter. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const plainTitle = typeof input.title === "string" ? `${input.title} · ${SITE_NAME}` : input.title.absolute;
  const socialTitle = input.socialTitle ?? plainTitle;
  const url = absoluteUrl(input.path);
  const images = (input.images ?? []).map((i) => ({ ...i, url: absoluteUrl(i.url) }));
  return {
    title: input.title,
    description: input.description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: { canonical: input.path },
    openGraph: {
      type: input.type ?? "website",
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      title: socialTitle,
      description: input.description,
      ...(images.length ? { images } : {}),
    },
    twitter: {
      card: input.twitterCard ?? (images.length ? "summary_large_image" : "summary"),
      title: socialTitle,
      description: input.description,
      ...(images.length ? { images: images.map((i) => ({ url: i.url, alt: i.alt })) } : {}),
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Schema.org node builders (pure)
// ---------------------------------------------------------------------------------------------

export function organizationJsonLd(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAMES,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg"), contentUrl: absoluteUrl("/icon.svg") },
    description: SITE_DESCRIPTION,
    knowsAbout: ["Telugu cinema", "Tollywood box office", "Telugu film heroes", "Film box-office verdicts"],
  };
}

export function websiteJsonLd(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAMES,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[], pagePath?: string): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    ...(pagePath ? { "@id": `${absoluteUrl(pagePath)}#breadcrumb` } : {}),
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export interface ListEntry {
  name: string;
  /** Site path or absolute URL of the entry's own page. */
  path: string;
  image?: string | null;
  /** Schema.org `@id` of the entity the entry stands for (e.g. a hero's Person node). */
  id?: string;
  /** Short data line for the entry, e.g. "Tolly Index 76.6/100". */
  description?: string;
}

/** Ranked list (best first) whose entries link to their pages and, when given, to their entity `@id`. */
export function itemListJsonLd(input: { name: string; path: string; description?: string; itemType?: string; entries: ListEntry[] }): JsonLdNode {
  const itemType = input.itemType ?? "Person";
  return {
    "@type": "ItemList",
    "@id": `${absoluteUrl(input.path)}#list`,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: absoluteUrl(input.path),
    numberOfItems: input.entries.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: input.entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.name,
      url: absoluteUrl(e.path),
      item: {
        "@type": itemType,
        ...(e.id ? { "@id": e.id } : {}),
        name: e.name,
        url: absoluteUrl(e.path),
        ...(e.image ? { image: absoluteUrl(e.image) } : {}),
        ...(e.description ? { description: e.description } : {}),
      },
    })),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[], pagePath?: string): JsonLdNode {
  return {
    "@type": "FAQPage",
    ...(pagePath ? { "@id": `${absoluteUrl(pagePath)}#faq`, url: absoluteUrl(pagePath) } : {}),
    mainEntity: items.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })),
  };
}

/** A page node tying the page to the site, its breadcrumb and the entity it is about. */
export function webPageJsonLd(input: { path: string; name: string; description: string; type?: string; aboutId?: string; dateModified?: string; breadcrumb?: boolean }): JsonLdNode {
  const url = absoluteUrl(input.path);
  return {
    "@type": input.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    ...(input.aboutId ? { about: { "@id": input.aboutId }, mainEntity: { "@id": input.aboutId } } : {}),
    ...(input.breadcrumb ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

export interface DatasetInput {
  asOf: string;
  version: string;
  firstYear: number;
  heroesRanked: number;
  heroesTotal: number;
  filmsTotal: number;
  filmsScored: number;
}

export function datasetJsonLd(d: DatasetInput): JsonLdNode {
  return {
    "@type": "Dataset",
    "@id": DATASET_ID,
    name: "Tollywood Analysis: Telugu film heroes — box office, hits and flops, and the Tolly Index",
    description:
      `Career benchmarks for ${d.heroesTotal} Telugu film lead actors built from ${d.filmsTotal.toLocaleString("en-IN")} lead films released since ${d.firstYear} ` +
      `(${d.filmsScored.toLocaleString("en-IN")} fully scored): reported worldwide box-office grosses and budgets, sourced hit/flop verdicts, success ratios, ` +
      `audience reception, release cadence and official follower counts, combined into the Tolly Index (0–100, ${d.heroesRanked} heroes ranked) and the Star Score. ` +
      `Every film links to its source; missing data is never counted as zero.`,
    url: SITE_URL,
    identifier: d.version,
    version: d.version,
    keywords: ["Telugu cinema", "Tollywood", "box office", "film verdicts", "hit ratio", "film actors", "India"],
    creator: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: SITE_LANGUAGE,
    isAccessibleForFree: true,
    license: absoluteUrl("/terms"),
    dateModified: d.asOf,
    temporalCoverage: `${d.firstYear}-01-01/${d.asOf}`,
    spatialCoverage: { "@type": "Place", name: "India" },
    measurementTechnique: absoluteUrl("/methodology"),
    variableMeasured: [
      "Tolly Index (0–100)",
      "Star Score (0–100)",
      "Success ratio (% of films with a known verdict that were hits)",
      "Hit films",
      "Blockbusters",
      "Reported worldwide gross (₹ crore)",
      "Films as lead",
      "Average gap between releases (months)",
    ].map((name) => ({ "@type": "PropertyValue", name })),
    isBasedOn: ["https://en.wikipedia.org/", "https://www.wikidata.org/", "https://commons.wikimedia.org/"],
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: absoluteUrl("/api/export/heroes?window=all_time"),
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Hero summaries
// ---------------------------------------------------------------------------------------------

export interface HeroSeoStats {
  name: string;
  films: number;
  firstYear: number | null;
  lastYear: number | null;
  hits: number | null;
  blockbusters: number | null;
  /** Films with a known verdict (the success-ratio denominator). */
  judged: number;
  successRatio: number | null;
  totalGross: number | null;
  grossFilms: number;
  starScore: number | null;
  tollyRank: number | null;
  tollyIndex: number | null;
  tollyRanked: number;
}

/** "Prabhas Hits and Flops, Box Office & Hit Ratio": the three phrasings fans search most. */
export function heroTitle(name: string): string {
  return `${name} Hits and Flops, Box Office & Hit Ratio`;
}

const years = (s: Pick<HeroSeoStats, "firstYear" | "lastYear">) =>
  s.firstYear && s.lastYear ? (s.firstYear === s.lastYear ? ` (${s.firstYear})` : ` (${s.firstYear}–${s.lastYear})`) : "";

/** Data-driven description; clauses with no data are dropped rather than shown as zero. */
export function heroDescription(s: HeroSeoStats): string {
  const parts: string[] = [`${s.films} Telugu ${s.films === 1 ? "film" : "films"} as lead hero${years(s)}`];
  if (s.hits !== null && s.judged > 0) {
    parts.push(`${s.hits} ${s.hits === 1 ? "hit" : "hits"}${s.blockbusters ? ` incl. ${s.blockbusters} ${s.blockbusters === 1 ? "blockbuster" : "blockbusters"}` : ""} in ${s.judged} films with a known verdict`);
  }
  if (s.successRatio !== null) parts.push(`${formatMetric("overallSuccessRatio", s.successRatio)} hit ratio`);
  if (s.totalGross !== null) parts.push(`${formatMetric("totalGross", s.totalGross)} reported worldwide gross`);
  const rank = s.tollyRank !== null && s.tollyIndex !== null ? ` Tolly Index #${s.tollyRank} of ${s.tollyRanked} (${s.tollyIndex.toFixed(1)}/100).` : s.starScore !== null ? ` Star Score ${formatMetric("starScore", s.starScore)}.` : "";
  return `${s.name} box office record: ${parts.join(", ")}.${rank} Every film with its verdict and source.`;
}

/** Short share title with the headline numbers. */
export function heroSocialTitle(s: HeroSeoStats): string {
  const lead = s.tollyRank !== null ? `Tolly Index #${s.tollyRank}` : s.starScore !== null ? `Star Score ${formatMetric("starScore", s.starScore)}` : null;
  const record = s.hits !== null && s.judged > 0 ? `${s.hits} hits in ${s.judged} films` : `${s.films} films as lead`;
  return [`${s.name}`, lead, record].filter(Boolean).join(" · ") + ` | ${SITE_NAME}`;
}

export function heroKeywords(name: string, familyLabel?: string | null): string[] {
  return [
    `${name} hits and flops`,
    `${name} box office collection`,
    `${name} hit ratio`,
    `${name} movies list with verdict`,
    `${name} total worldwide gross`,
    `${name} career analysis`,
    `${name} Tolly Index`,
    `${name} Star Score`,
    ...(familyLabel ? [`${familyLabel} heroes box office`] : []),
    "Telugu cinema",
    "Tollywood",
  ];
}

const VERDICT_LABEL: Record<string, string> = {
  blockbuster: "Blockbuster",
  super_hit: "Super hit",
  hit: "Hit",
  above_average: "Above average",
  average: "Average",
  below_average: "Below average",
  flop: "Flop",
  disaster: "Disaster",
};

/** Creative Commons licence code (as stored in the photo credits) to its deed URL. */
export function licenseUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase().replace(/\s+/g, "-");
  if (c === "CC0" || c === "CC0-1.0" || c === "PUBLIC-DOMAIN") return "https://creativecommons.org/publicdomain/zero/1.0/";
  const m = /^CC-(BY(?:-SA)?)-(\d\.\d)$/.exec(c);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/` : null;
}

function movieNode(f: FilmEvidenceRow, heroId: string): JsonLdNode {
  const wiki = wikipediaUrl(f.details?.wikiArticle ?? null);
  const wd = wikidataUrl(f.details?.wikidataId ?? null);
  const verdict = f.commercial.verdict ? VERDICT_LABEL[f.commercial.verdict] : f.commercial.label ? VERDICT_LABEL[f.commercial.label] : null;
  const facts = [
    f.commercial.grossCrore !== null ? `Reported worldwide gross ${formatMetric("topGross", f.commercial.grossCrore)}` : null,
    f.commercial.budgetCrore !== null ? `budget ${formatMetric("topGross", f.commercial.budgetCrore)}` : null,
    verdict ? `verdict: ${verdict}` : null,
  ].filter(Boolean);
  return {
    "@type": "Movie",
    name: f.title,
    ...(f.releaseDate ? { datePublished: f.releaseDate } : {}),
    ...(wiki ? { url: wiki } : {}),
    ...(wiki || wd ? { sameAs: [wiki, wd].filter(Boolean) } : {}),
    inLanguage: f.originalLanguage,
    ...(f.details?.director ? { director: { "@type": "Person", name: f.details.director } } : {}),
    actor: { "@id": heroId },
    ...(facts.length ? { description: `${facts.join(", ")}.` } : {}),
  };
}

export interface HeroSeo {
  slug: string;
  name: string;
  path: string;
  real: boolean;
  stats: HeroSeoStats | null;
  title: string;
  description: string;
  socialTitle: string;
  keywords: string[];
  image: SeoImage | null;
  sameAs: string[];
  metadata: Metadata;
  jsonLd: JsonLdGraph;
}

function statsOf(hero: HeroView, slug: string, real: boolean): HeroSeoStats {
  const tolly = real && tollyIndexEnabled() ? getTollyHero(slug) : null;
  const sr = hero.m.overallSuccessRatio;
  return {
    name: hero.name,
    films: hero.eligible,
    firstYear: hero.firstYear,
    lastYear: hero.lastYear,
    hits: hero.m.hits.v,
    blockbusters: hero.m.blockbusters.v,
    judged: sr.n,
    successRatio: sr.v,
    totalGross: hero.m.totalGross.v,
    grossFilms: hero.m.totalGross.n,
    starScore: hero.m.starScore.v,
    tollyRank: tolly?.rank ?? null,
    tollyIndex: tolly?.rank ? tolly.index : null,
    tollyRanked: tolly ? getTollyRanking().ranked.length : 0,
  };
}

/** Entity links for a hero: Wikipedia, Wikidata, IMDb, official X / Instagram and website. */
export function heroSameAs(input: { wikiArticle?: string | null; wikidataId?: string | null; imdbNameId?: string | null; instagram?: string | null; x?: string | null; website?: string | null }): string[] {
  const urls = [
    wikipediaUrl(input.wikiArticle),
    wikidataUrl(input.wikidataId),
    input.imdbNameId && /^nm\d+$/.test(input.imdbNameId) ? `https://www.imdb.com/name/${input.imdbNameId}/` : null,
    input.instagram ? `https://www.instagram.com/${input.instagram}/` : null,
    input.x ? `https://x.com/${input.x}` : null,
    input.website && /^https?:\/\//.test(input.website) ? input.website : null,
  ];
  return [...new Set(urls.filter((u): u is string => !!u))];
}

/**
 * Everything search needs for /hero/[slug]: title, description, keywords, portrait, entity links,
 * metadata and the JSON-LD graph (WebPage + Person + BreadcrumbList + highest-grossing films).
 */
export async function getHeroSeo(slug: string): Promise<HeroSeo | null> {
  const person = await getPerson(slug);
  if (!person) return null;
  const [data, films] = await Promise.all([getDashboardData(), getHeroFilms(slug)]);
  const hero = data.windows.all_time.find((h) => h.slug === slug) ?? null;
  const real = data.mode === "real";
  const name = person.displayName;
  const path = heroPath(slug);
  const stats = hero ? statsOf(hero, slug, real) : null;
  const family = FAMILY_GROUPS.find((g) => g.key === (hero?.family ?? person.family) && g.key !== "other") ?? null;

  // Demo numbers are synthetic: describe the page without them.
  const description =
    real && stats
      ? heroDescription(stats)
      : `${name}: Telugu film hero profile on ${SITE_NAME} — films as lead, hits and flops, box office and Star Score, with every source listed.`;
  const socialTitle = real && stats ? heroSocialTitle(stats) : `${name} · ${SITE_NAME}`;
  const keywords = heroKeywords(name, family?.label);

  const photo = hero?.photo ?? heroPhoto(slug);
  const credit = HERO_PHOTOS[slug];
  const image: SeoImage | null = photo ? { url: photo, alt: `${name}, Telugu film actor${credit ? ` (photo: ${credit.author}, Wikimedia Commons)` : ""}` } : null;

  const handles = socialHandles(slug);
  const facts = real ? heroFacts(slug) : null;
  const sameAs = heroSameAs({
    wikiArticle: person.wikiArticle,
    wikidataId: person.wikidataId,
    imdbNameId: person.imdbNameId,
    instagram: handles?.instagram?.username,
    x: handles?.x?.username,
    website: facts?.website,
  });

  const id = personId(slug);
  const lic = licenseUrl(credit?.license);
  const personNode: JsonLdNode = {
    "@type": "Person",
    "@id": id,
    name,
    url: absoluteUrl(path),
    mainEntityOfPage: { "@id": `${absoluteUrl(path)}#webpage` },
    description,
    jobTitle: "Film actor",
    nationality: { "@type": "Country", name: "India" },
    ...(image
      ? {
          image: {
            "@type": "ImageObject",
            url: absoluteUrl(image.url),
            contentUrl: absoluteUrl(image.url),
            caption: image.alt,
            ...(credit ? { creditText: credit.author, creator: { "@type": "Person", name: credit.author }, acquireLicensePage: credit.page } : {}),
            ...(lic ? { license: lic } : {}),
          },
        }
      : {}),
    ...(facts?.birthDate ? { birthDate: facts.birthDate } : {}),
    ...(facts?.birthPlace ? { birthPlace: { "@type": "Place", name: facts.birthPlace } } : {}),
    ...(facts?.deathDate ? { deathDate: facts.deathDate } : {}),
    ...(facts?.awards?.length ? { award: facts.awards.slice(0, 12) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  const topFilms = real
    ? [...films].filter((f) => f.commercial.grossCrore !== null).sort((a, b) => (b.commercial.grossCrore ?? 0) - (a.commercial.grossCrore ?? 0)).slice(0, 10)
    : [];
  const filmList: JsonLdNode | null = topFilms.length
    ? {
        "@type": "ItemList",
        "@id": `${absoluteUrl(path)}#top-films`,
        name: `${name}: highest-grossing films (reported worldwide gross)`,
        numberOfItems: topFilms.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: topFilms.map((f, i) => ({ "@type": "ListItem", position: i + 1, item: movieNode(f, id) })),
      }
    : null;

  const title = heroTitle(name);
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "All heroes", path: "/heroes" },
    { name, path },
  ];
  const jsonLd = jsonLdGraph(
    webPageJsonLd({ path, name: `${title} · ${SITE_NAME}`, description, type: "ProfilePage", aboutId: id, dateModified: data.asOf, breadcrumb: true }),
    personNode,
    breadcrumbJsonLd(crumbs, path),
    filmList,
  );

  return {
    slug,
    name,
    path,
    real,
    stats,
    title,
    description,
    socialTitle,
    keywords,
    image,
    sameAs,
    metadata: pageMetadata({ title, description, path, keywords, socialTitle, type: "profile", images: image ? [image] : [], twitterCard: "summary" }),
    jsonLd,
  };
}

export interface AnnexureHeroSeo {
  title: string;
  description: string;
  metadata: Metadata;
  jsonLd: JsonLdGraph;
}

/** /annexure/heroes/[slug]: the evidence page behind a hero's numbers. */
export async function getAnnexureHeroSeo(slug: string): Promise<AnnexureHeroSeo | null> {
  const person = await getPerson(slug);
  if (!person) return null;
  const [data, films] = await Promise.all([getDashboardData(), getHeroFilms(slug)]);
  const real = data.mode === "real";
  const name = person.displayName;
  const path = annexureHeroPath(slug);
  const yrs = films.map((f) => f.year).filter((y): y is number => y !== null);
  const span = yrs.length ? years({ firstYear: Math.min(...yrs), lastYear: Math.max(...yrs) }) : "";
  const verdicts = films.filter((f) => f.commercial.label !== null).length;
  const grosses = films.filter((f) => f.commercial.grossCrore !== null).length;
  const rated = films.filter((f) => f.audience !== null).length;
  const title = `${name} Filmography & Box-Office Evidence`;
  const description = real
    ? `Film-by-film evidence behind ${name}'s scores: ${films.length} eligible Telugu lead ${films.length === 1 ? "film" : "films"}${span}, ` +
      `${verdicts} with a sourced hit/flop verdict, ${grosses} with a reported worldwide gross${rated ? `, ${rated} with an audience rating` : ""}. ` +
      `Sources, coverage and how every metric is derived.`
    : `Film-by-film evidence for ${name} on ${SITE_NAME}: eligible lead films, verdicts, grosses, sources and how every metric is derived.`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Annexure", path: "/annexure" },
    { name: "Hero detail", path: "/annexure/heroes" },
    { name, path },
  ];
  return {
    title,
    description,
    metadata: pageMetadata({ title, description, path, keywords: [`${name} filmography`, `${name} movies list`, `${name} box office collection`, `${name} hits and flops`], socialTitle: `${title} | ${SITE_NAME}` }),
    jsonLd: jsonLdGraph(
      webPageJsonLd({ path, name: `${title} · ${SITE_NAME}`, description, type: "CollectionPage", aboutId: personId(slug), dateModified: data.asOf, breadcrumb: true }),
      breadcrumbJsonLd(crumbs, path),
    ),
  };
}

// ---------------------------------------------------------------------------------------------
// Listing pages
// ---------------------------------------------------------------------------------------------

/** True when the Tolly Index is live (real data and the feature on), as on the pages that show it. */
export function tollyLive(mode: string): boolean {
  return mode === "real" && tollyIndexEnabled();
}

/** Tolly Index ranking as list entries (best first). */
export async function tollyIndexEntries(limit?: number): Promise<ListEntry[]> {
  const photos = new Map((await getDashboardData()).windows.all_time.map((h) => [h.slug, h.photo]));
  const ranked = getTollyRanking().ranked;
  return (limit ? ranked.slice(0, limit) : ranked).map((h) => ({
    name: h.name,
    path: heroPath(h.slug),
    id: personId(h.slug),
    image: photos.get(h.slug) ?? null,
    description: `Tolly Index #${h.rank}: ${(h.index as number).toFixed(1)}/100`,
  }));
}

/** Star Score ranking (rankable, non-newcomer heroes, best first), as on the Star Score dashboard. */
export async function starScoreEntries(limit?: number): Promise<ListEntry[]> {
  const all = (await getDashboardData()).windows.all_time.filter((h) => !h.isEmerging);
  const ranked = rankBy(all, "starScore");
  return (limit ? ranked.slice(0, limit) : ranked).map((h) => ({
    name: h.name,
    path: heroPath(h.slug),
    id: personId(h.slug),
    image: h.photo,
    description: `Star Score ${formatMetric("starScore", h.m.starScore.v)}`,
  }));
}

export interface HomeSeo {
  metadata: Metadata;
  jsonLd: JsonLdGraph;
}

/** Home page: answers "who is No. 1 in Tollywood" with the live ranking, plus WebSite, Dataset and the top 10. */
export async function getHomeSeo(): Promise<HomeSeo> {
  const data = await getDashboardData();
  const live = tollyLive(data.mode);
  const title = "Tollywood Hero Rankings: Who Is No. 1?";
  if (!live) {
    const real = data.mode === "real";
    const top = real ? await starScoreEntries(10) : [];
    const description = `Who is the No. 1 hero in Tollywood? Telugu heroes ranked on hits and flops, hit ratio and box office, with the Star Score and every source listed.`;
    return {
      metadata: pageMetadata({ title: { absolute: `${title} | ${SITE_NAME}` }, description, path: "/", keywords: SITE_KEYWORDS }),
      jsonLd: jsonLdGraph(
        organizationJsonLd(),
        websiteJsonLd(),
        top.length ? itemListJsonLd({ name: "Top 10 Telugu heroes by Star Score", path: "/", entries: top }) : null,
      ),
    };
  }
  const ranked = getTollyRanking().ranked;
  const [a, b, c] = ranked;
  const m = tollyMeta;
  const lead = a && b && c ? `${a.name} leads (${a.index?.toFixed(1)}), then ${b.name} (${b.index?.toFixed(1)}) and ${c.name} (${c.index?.toFixed(1)}).` : "";
  const description =
    `Who is the No. 1 hero in Tollywood? ${m.heroes.qualified} Telugu heroes ranked on the Tolly Index from ${m.films.complete.toLocaleString("en-IN")} scored films: ${lead} ` +
    `Hits and flops, hit ratio and box office for every hero.`;
  const firstYear = Math.min(...data.windows.all_time.map((h) => h.firstYear ?? Infinity));
  const top10 = await tollyIndexEntries(10);
  return {
    metadata: pageMetadata({ title: { absolute: `${title} | ${SITE_NAME}` }, description, path: "/", keywords: SITE_KEYWORDS }),
    jsonLd: jsonLdGraph(
      organizationJsonLd(),
      websiteJsonLd(),
      datasetJsonLd({
        asOf: m.asOf,
        version: m.version,
        firstYear: Number.isFinite(firstYear) ? firstYear : 2000,
        heroesRanked: m.heroes.qualified,
        heroesTotal: m.heroes.total,
        filmsTotal: m.films.total,
        filmsScored: m.films.complete,
      }),
      itemListJsonLd({
        name: `Top 10 Telugu heroes: Tolly Index ranking (${m.asOf})`,
        description: `Who is the No. 1 hero in Tollywood: the ten highest Tolly Index scores out of ${m.heroes.qualified} ranked Telugu heroes.`,
        path: "/",
        entries: top10,
      }),
    ),
  };
}

// ---------------------------------------------------------------------------------------------
// Methodology FAQ (answers mirror the text shown on /methodology)
// ---------------------------------------------------------------------------------------------

export function methodologyFaq(mode: "demo" | "live" | "real"): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  const m = tollyMeta;
  if (tollyLive(mode)) {
    out.push({
      question: "What is the Tolly Index?",
      answer:
        `One score out of 100 for each Telugu hero, from fifteen numbers in five groups: how much audiences love his films, how often and how big his films hit at the box office, ` +
        `how his latest films did, how many fans follow him, and how steady, long and busy his career is. Data as of ${m.asOf}: ${m.films.complete.toLocaleString("en-IN")} of ` +
        `${m.films.total.toLocaleString("en-IN")} films scored, ${m.heroes.qualified} of ${m.heroes.total} heroes ranked.`,
    });
    const w = m.weights;
    out.push({
      question: "How is each film's audience score worked out?",
      answer:
        `Each film is scored out of 100 on audience rating (${Math.round(w.rating * 100)}%), reach (${Math.round(w.reach * 100)}%) and staying power (${Math.round(w.stay * 100)}%). ` +
        `Rating is the IMDb audience rating, pulled toward the average of its time when few people voted; reach is the number of voters and how many Wikipedia languages cover it; ` +
        `staying power is how many people read about it on Wikipedia today. Films are only compared with films released within a year of them.`,
    });
  }
  const parts = STAR_PARTS.filter((p) => p.key !== "fans" || userRankingEnabled());
  out.push({
    question: "What is the Star Score?",
    answer:
      `The Star Score (out of 100) blends every KPI into one number: ${parts.map((p) => `${p.label.toLowerCase()} (${p.weight}%)`).join(", ")}. ` +
      `Missing data is never counted as zero: a part with no data is left out and its weight is shared among the parts the hero does have.`,
  });
  out.push({
    question: "How do you decide whether a Telugu film is a hit or a flop?",
    answer:
      `A reported verdict comes first: "blockbuster" or "industry hit" = Blockbuster; "hit", "super hit", "commercial success" = Hit; "average", "above/below average", ` +
      `"moderate success" = Average; "flop", "disaster", "box-office bomb" = Flop. When no source states a verdict but both budget and worldwide gross are reported, the ratio decides: ` +
      `gross at least 3× budget = Blockbuster, 2–3× = Hit, 1–2× = Average, under 1× = Flop. Films with neither are "result unknown" and are never counted as flops.`,
  });
  out.push({
    question: "Who counts as a hero, and which films count?",
    answer:
      `An actor counts only for films where he is the main lead or one of two genuine co-leads; cameos, supporting, song-only and voice-only roles do not count. ` +
      `Feature films released from 1 January 2000 count, made in Telugu or released dubbed in Telugu, including direct-to-OTT films. ` +
      `The charts show heroes with at least ${METHODOLOGY.minEligibleFilmsForDefaultRoster} films.`,
  });
  if (mode === "real") {
    out.push({
      question: "Where does the data come from?",
      answer:
        `Real, public sources. Each hero's films come from his Wikipedia filmography; release dates, budgets and worldwide box-office grosses from each film's Wikipedia article; ` +
        `film IDs, languages, runtimes and X follower counts from Wikidata; photos from Wikimedia Commons. Each film's result comes from its own English Wikipedia article, ` +
        `then the hero's article, then Telugu Wikipedia, then a Telugu box-office blog (lowest confidence), and every film links to the source used.`,
    });
  }
  return out;
}
