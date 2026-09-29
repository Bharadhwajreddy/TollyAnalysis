import { INITIAL_ROSTER } from "@/lib/constants/roster";
import { croreToMinor } from "@/lib/import/money";
import type {
  CommercialEvidence,
  Credit,
  Dataset,
  Film,
  Person,
  SocialSnapshot,
  Source,
  TradeVerdict,
} from "@/lib/domain/types";
import snapshot from "./snapshot.json";

/**
 * Real dataset built from lib/data/real/snapshot.json (produced by
 * `npm run data:import` from Wikipedia and Wikidata). No synthetic values.
 */

interface SnapHero {
  slug: string;
  name: string;
  qid: string | null;
  article: string;
  debutYear: number | null;
  social: {
    x: { followers: number | null; date: string | null; username: string | null } | null;
    instagram: { followers: number | null; date: string | null; username: string | null } | null;
  };
}

interface SnapFilm {
  key: string;
  article: string | null;
  title: string;
  year: number;
  releaseDate: string | null;
  dateApproximate: boolean;
  languages: string[];
  director: string | null;
  music: string | null;
  runtimeMin: number | null;
  genres: string[];
  imdbId: string | null;
  qid: string | null;
  budget: { low: number; high: number; text: string } | null;
  gross: { low: number; high: number; text: string; isShare?: boolean } | null;
  verdict: { verdict: string; sentence: string } | null;
  starring: string[];
}

interface SnapCredit {
  hero: string;
  film: string;
  year: number;
  displayTitle: string;
  role: string;
  notes: string;
  scope: "lead" | "cameo" | "supporting";
  include: boolean;
  excludeReason: string | null;
  billing?: string;
}

const SOURCES: Source[] = [
  {
    id: "src-wikipedia",
    name: "Wikipedia (English)",
    type: "manual_editorial",
    baseUrl: "https://en.wikipedia.org",
    licensingNote: "Filmographies, release dates, budgets, box-office grosses and verdict sentences. Text licensed CC BY-SA 4.0.",
    reliabilityTier: 3,
  },
  {
    id: "src-wikidata",
    name: "Wikidata",
    type: "licensed_dataset",
    baseUrl: "https://www.wikidata.org",
    licensingNote: "Film identifiers, release dates, languages, runtimes, IMDb ids and recorded social-media follower counts. CC0.",
    reliabilityTier: 2,
  },
  {
    id: "src-commons",
    name: "Wikimedia Commons",
    type: "licensed_dataset",
    baseUrl: "https://commons.wikimedia.org",
    licensingNote: "Hero portraits under free licences; see photo credits.",
    reliabilityTier: 2,
  },
];

const wikiUrl = (article: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, "_"))}`;
const VERDICTS = new Set<TradeVerdict>(["disaster", "flop", "below_average", "average", "above_average", "hit", "super_hit", "blockbuster"]);

export function buildRealDataset(): Dataset {
  const snap = snapshot as unknown as { generatedAt: string; heroes: SnapHero[]; films: SnapFilm[]; credits: SnapCredit[] };
  const roster = new Map(INITIAL_ROSTER.map((r) => [r.slug, r]));
  const withFilms = new Set(snap.credits.filter((c) => c.include).map((c) => c.hero));

  const people: Person[] = snap.heroes
    .filter((h) => roster.has(h.slug) && withFilms.has(h.slug))
    .map((h) => ({
      id: `p-${h.slug}`,
      slug: h.slug,
      displayName: roster.get(h.slug)!.name,
      industry: "telugu",
      status: roster.get(h.slug)!.status,
      visibility: "public",
      tmdbPersonId: null,
      wikidataId: h.qid,
      imdbNameId: null,
      family: roster.get(h.slug)!.family,
      debutYear: h.debutYear,
      wikiArticle: h.article,
    }));
  const personIds = new Set(people.map((p) => p.id));

  const filmId = (key: string) => `f-${key}`;
  const creditByFilm = new Map<string, SnapCredit[]>();
  for (const c of snap.credits) creditByFilm.set(c.film, [...(creditByFilm.get(c.film) ?? []), c]);

  const films: Film[] = [];
  const commercial: CommercialEvidence[] = [];
  for (const f of snap.films) {
    const credits = creditByFilm.get(f.key) ?? [];
    if (!credits.length) continue;
    const date = f.releaseDate ?? `${f.year}-07-01`;
    const isTelugu = !f.languages.length || f.languages.some((l) => /telugu/i.test(l));
    const firstBilling = credits.find((c) => c.include)?.billing ?? credits[0]?.billing ?? null;
    films.push({
      id: filmId(f.key),
      slug: f.key,
      title: f.title,
      originalLanguage: isTelugu ? "te" : (f.languages[0] ?? "").slice(0, 2).toLowerCase() || "xx",
      releaseRoute: "theatrical",
      featureType: "feature",
      status: date <= snap.generatedAt.slice(0, 10) ? "released" : "upcoming",
      teluguRelease: {
        releaseType: "original",
        releaseDate: date,
        route: "theatrical",
        isEligibleTeluguRelease: isTelugu,
        isReRelease: false,
      },
      tmdbMovieId: null,
      imdbTitleId: f.imdbId,
      isDemo: false,
      details: {
        wikiArticle: f.article,
        wikidataId: f.qid,
        director: f.director,
        music: f.music,
        runtimeMin: f.runtimeMin,
        genres: f.genres,
        languages: f.languages,
        dateApproximate: f.dateApproximate,
        budgetText: f.budget?.text ?? null,
        grossText: f.gross?.text ?? null,
        verdictSentence: f.verdict?.sentence ?? null,
        billing: firstBilling,
      },
    });
    const url = f.article ? wikiUrl(f.article) : null;
    const ev = (over: Partial<CommercialEvidence>): CommercialEvidence => ({
      filmId: filmId(f.key),
      sourceId: "src-wikipedia",
      metricType: "trade_verdict",
      versionScope: "telugu_original",
      territory: "worldwide",
      currency: "INR",
      amountLowMinor: null,
      amountHighMinor: null,
      valueText: null,
      syntheticScore: null,
      confidence: "low",
      approvalStatus: "approved",
      observedAt: snap.generatedAt,
      sourceUrl: url,
      ...over,
    });
    // Ranges are stored as low–high; the engine uses the conservative low end for money.
    if (f.gross && !f.gross.isShare)
      commercial.push(ev({ metricType: "worldwide_gross", amountLowMinor: croreToMinor(f.gross.low), amountHighMinor: croreToMinor(f.gross.low), valueText: f.gross.text }));
    if (f.budget)
      commercial.push(ev({ metricType: "production_budget", amountLowMinor: croreToMinor(f.budget.high), amountHighMinor: croreToMinor(f.budget.high), valueText: f.budget.text }));
    // A reported distributors' share is compared with the budget directly (share ÷ cost).
    if (f.gross?.isShare && f.budget) {
      commercial.push(ev({ metricType: "telugu_distributor_share", amountLowMinor: croreToMinor(f.gross.low), valueText: f.gross.text }));
      commercial.push(ev({ metricType: "telugu_theatrical_business", amountLowMinor: croreToMinor(f.budget.high), valueText: f.budget.text }));
    }
    if (f.verdict && VERDICTS.has(f.verdict.verdict as TradeVerdict)) commercial.push(ev({ metricType: "trade_verdict", valueText: f.verdict.verdict }));
  }

  const credits: Credit[] = snap.credits
    .filter((c) => personIds.has(`p-${c.hero}`))
    .map((c) => ({
      filmId: filmId(c.film),
      personId: `p-${c.hero}`,
      roleScope: c.include ? (c.billing && /#[23]/.test(c.billing) ? "co_principal_male_lead" : "principal_male_lead") : c.scope === "cameo" ? "cameo" : "supporting",
      eligibilityStatus: c.include ? "approved" : "rejected",
      evidenceNote: c.include
        ? `Wikipedia filmography${c.role ? `, role "${c.role}"` : ""}; ${c.billing ?? "billing unknown"}. Auto-classified — pending editorial check.`
        : `Excluded: ${c.excludeReason}${c.notes ? ` (notes: ${c.notes})` : ""}`,
      sourceId: "src-wikipedia",
    }));

  const social: SocialSnapshot[] = [];
  for (const h of snap.heroes) {
    if (!personIds.has(`p-${h.slug}`)) continue;
    for (const [platform, v] of [
      ["x", h.social.x],
      ["instagram", h.social.instagram],
    ] as const) {
      if (v?.followers && v.date)
        social.push({
          personId: `p-${h.slug}`,
          platform,
          profileUrl: platform === "x" ? `https://x.com/${v.username}` : `https://www.instagram.com/${v.username}/`,
          isOfficial: true,
          followersCount: v.followers,
          snapshotAt: v.date,
          sourceMethod: "wikidata_P8687",
        });
    }
  }

  return {
    mode: "real",
    asOf: snap.generatedAt.slice(0, 10),
    sources: SOURCES,
    people,
    films,
    credits,
    reception: [],
    commercial,
    legacy: [],
    social,
    syntheticSocial: [],
    changeLog: [
      {
        id: "cl-real-1",
        entityType: "dataset",
        entityId: "real-snapshot",
        action: "imported",
        reason: `Real data imported from Wikipedia and Wikidata (${films.length} films, ${credits.filter((c) => c.eligibilityStatus === "approved").length} counted lead credits). Lead roles auto-classified from billing order; pending editorial review.`,
        createdAt: snap.generatedAt,
        actor: "importer",
      },
      {
        id: "cl-real-2",
        entityType: "people",
        entityId: "roster",
        action: "scoped",
        reason: "Roster limited to Telugu film heroes; only films released from 1 January 2000 count.",
        createdAt: snap.generatedAt,
        actor: "editorial",
      },
    ],
  };
}

/** Social handles (for hero pages), including handles without a recorded follower count. */
export function socialHandles(slug: string) {
  const snap = snapshot as unknown as { heroes: SnapHero[] };
  return snap.heroes.find((h) => h.slug === slug)?.social ?? null;
}
