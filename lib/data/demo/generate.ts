import { INITIAL_ROSTER, type RosterCandidate } from "@/lib/constants/roster";
import type {
  ChangeLogEntry,
  ClaimConfidence,
  CommercialEvidence,
  Credit,
  Dataset,
  Film,
  LegacyAssessment,
  LegacyStatus,
  Person,
  ReceptionEvidence,
  Source,
  SyntheticSocialIndex,
} from "@/lib/domain/types";
import { between, chance, createRng, gaussian, intBetween, pick, type Rng } from "./prng";

/**
 * Synthetic demo dataset.
 *
 * Every film is a fictional placeholder ("Demo Title …"). Ratings, votes, outcome
 * scores and social indices are generated, internally consistent, and stored
 * under the "Synthetic demo generator" source. No real-world collections,
 * ratings or follower counts are used or implied.
 */

export const DEMO_AS_OF = "2026-09-15";

const LANG = { telugu: "te", tamil: "ta", malayalam: "ml", kannada: "kn", hindi: "hi" } as const;
const SEED = "tollywood-analysis-demo-v1";

export const DEMO_SOURCES: Source[] = [
  {
    id: "src-demo",
    name: "Synthetic demo generator",
    type: "synthetic_demo",
    baseUrl: null,
    licensingNote: "Generated placeholder data for visual verification only. Not factual.",
    reliabilityTier: 3,
  },
  {
    id: "src-tmdb",
    name: "TMDb API",
    type: "official_api",
    baseUrl: "https://www.themoviedb.org",
    licensingNote:
      "Primary metadata/credits source in live mode. Requires attribution; commercial use needs TMDb licence review.",
    reliabilityTier: 2,
  },
  {
    id: "src-imdb",
    name: "IMDb (licensed source only)",
    type: "licensed_dataset",
    baseUrl: "https://www.imdb.com",
    licensingNote: "Disabled by default. No scraping. Enabled only with a permitted API/data licence.",
    reliabilityTier: 1,
  },
  {
    id: "src-editorial",
    name: "Editorial desk",
    type: "manual_editorial",
    baseUrl: null,
    licensingNote: "Manually reviewed claims with source URL and retrieval date.",
    reliabilityTier: 2,
  },
];

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .map((p) => p.slice(0, 3))
    .join("")
    .slice(0, 3)
    .toUpperCase();

function isoDate(year: number, dayOfYear: number): string {
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(d.getUTCDate() + Math.floor(dayOfYear));
  return d.toISOString().slice(0, 10);
}

interface HeroShape {
  quality: number; // latent mean film quality 0–100
  volatility: number;
  cadence: number; // films per year
  pull: number; // audience vote pull multiplier
  trend: number; // quality drift per year (momentum)
}

function heroShape(rng: Rng, c: RosterCandidate): HeroShape {
  const dubbed = c.industry !== "telugu";
  return {
    quality: between(rng, 40, 78),
    volatility: between(rng, 7, 17),
    cadence: dubbed ? between(rng, 0.35, 0.8) : between(rng, 0.5, 1.35),
    pull: between(rng, 0.4, 2.2),
    trend: between(rng, -1.1, 1.1),
  };
}

function confidenceDraw(rng: Rng): ClaimConfidence {
  const r = rng();
  if (r < 0.03) return "disputed";
  if (r < 0.45) return "high";
  if (r < 0.85) return "medium";
  return "low";
}

export function generateDemoDataset(): Dataset {
  const rng = createRng(SEED);
  const asOfYear = Number(DEMO_AS_OF.slice(0, 4));
  const people: Person[] = [];
  const films: Film[] = [];
  const credits: Credit[] = [];
  const reception: ReceptionEvidence[] = [];
  const commercial: CommercialEvidence[] = [];
  const legacy: LegacyAssessment[] = [];
  const syntheticSocial: SyntheticSocialIndex[] = [];
  const latent = new Map<string, number>();
  const shapes = new Map<string, HeroShape>();

  const addEvidence = (film: Film, quality: number, pull: number, r: Rng) => {
    latent.set(film.id, quality);
    const ageYears = asOfYear - Number(film.teluguRelease.releaseDate!.slice(0, 4));
    // Audience reception (film-wide, synthetic).
    if (chance(r, 0.93)) {
      const rating = Math.min(9.4, Math.max(3.2, 3.5 + (quality / 100) * 5.8 + gaussian(r, 0, 0.45)));
      const votes = Math.round(
        Math.max(40, Math.exp(gaussian(r, 8.1, 0.9)) * pull * (film.teluguRelease.releaseType === "dubbed" ? 1.4 : 1) * (ageYears < 1 ? 0.35 : 1)),
      );
      reception.push({
        filmId: film.id,
        sourceId: "src-demo",
        provider: "synthetic_demo",
        scope: "film_wide",
        rating: Math.round(rating * 10) / 10,
        voteCount: votes,
        observedAt: DEMO_AS_OF,
        retrievedAt: DEMO_AS_OF,
        approvalStatus: "approved",
      });
    }
    // Commercial / platform outcome (synthetic score, Telugu-version scope only when "reported").
    const isDub = film.teluguRelease.releaseType === "dubbed";
    const isOtt = film.teluguRelease.route === "ott";
    const reported = isOtt ? chance(r, 0.5) : isDub ? chance(r, 0.55) : chance(r, 0.84);
    if (reported) {
      const conf = confidenceDraw(r);
      commercial.push({
        filmId: film.id,
        sourceId: "src-demo",
        metricType: "synthetic_outcome_score",
        versionScope: isDub ? "telugu_dub" : "telugu_original",
        territory: isOtt ? "platform:global" : "AP/TS + overseas Telugu",
        currency: null,
        amountLowMinor: null,
        amountHighMinor: null,
        valueText: isOtt ? "Synthetic platform outcome" : "Synthetic theatrical outcome",
        syntheticScore: Math.round(Math.min(100, Math.max(2, quality + gaussian(r, 0, 12))) * 10) / 10,
        confidence: conf,
        approvalStatus: "approved",
        observedAt: DEMO_AS_OF,
        sourceUrl: null,
      });
    } else if (isDub) {
      // Only an all-language total exists: must NOT be credited to the Telugu version.
      commercial.push({
        filmId: film.id,
        sourceId: "src-demo",
        metricType: "worldwide_all_language",
        versionScope: "all_language",
        territory: "worldwide",
        currency: null,
        amountLowMinor: null,
        amountHighMinor: null,
        valueText: "Reported only at all-language scope (demo placeholder)",
        syntheticScore: null,
        confidence: "medium",
        approvalStatus: "approved",
        observedAt: DEMO_AS_OF,
        sourceUrl: null,
      });
    }
    // Legacy: editorially reviewed for older titles only.
    if (ageYears >= 6) {
      let status: LegacyStatus = "none";
      if (quality > 72 && chance(r, 0.2)) status = pick(r, ["enduring_popularity", "cult_favourite"] as const);
      else if (quality < 50 && chance(r, 0.07)) status = "reappraised";
      if (status !== "none" || chance(r, 0.7))
        legacy.push({
          filmId: film.id,
          status,
          rationale:
            status === "none"
              ? "Demo: reviewed, no distinct legacy signal."
              : "Demo editorial note — placeholder, not a real assessment.",
          approvalStatus: "approved",
        });
    }
  };

  const makeFilm = (
    id: string,
    title: string,
    date: string,
    opts: { dubbed: boolean; lang: string; ott: boolean },
  ): Film => ({
    id,
    slug: id.replace(/^f-/, ""),
    title,
    originalLanguage: opts.lang,
    releaseRoute: opts.ott ? "ott" : "theatrical",
    featureType: "feature",
    status: "released",
    teluguRelease: {
      releaseType: opts.dubbed ? "dubbed" : "original",
      releaseDate: date,
      route: opts.ott ? "ott" : "theatrical",
      isEligibleTeluguRelease: true,
      isReRelease: false,
    },
    tmdbMovieId: null,
    imdbTitleId: null,
    isDemo: true,
  });

  for (const c of INITIAL_ROSTER) {
    const r = createRng(`${SEED}:${c.slug}`);
    const shape = heroShape(r, c);
    shapes.set(c.slug, shape);
    const personId = `p-${c.slug}`;
    people.push({
      id: personId,
      slug: c.slug,
      displayName: c.name,
      industry: c.industry,
      status: c.status,
      visibility: c.demoFilmCount && c.demoFilmCount < 3 ? "emerging_only" : "public",
      tmdbPersonId: null,
      wikidataId: null,
      imdbNameId: null,
    });

    const startYear = c.demoStartYear;
    const endYear = Math.min(asOfYear, c.demoEndYear ?? asOfYear);
    const activeYears = endYear - startYear + 1;
    const count =
      c.demoFilmCount ?? Math.max(3, Math.min(42, Math.round(activeYears * shape.cadence + gaussian(r, 0, 1.5))));
    const lang = LANG[c.industry];
    const dubbed = c.industry !== "telugu";
    const code = initials(c.name);

    // Spread release dates across the active span; allow bunching so some years hold 3+ releases.
    const dates = Array.from({ length: count }, () => {
      const year = intBetween(r, startYear, endYear);
      const maxDay = year === asOfYear ? 255 : 364;
      return isoDate(year, between(r, 0, maxDay));
    }).sort();

    dates.forEach((date, i) => {
      const id = `f-${c.slug}-${String(i + 1).padStart(2, "0")}`;
      const year = Number(date.slice(0, 4));
      const ott = !dubbed && year >= 2020 && chance(r, 0.18);
      const film = makeFilm(id, `Demo Title ${code}-${String(i + 1).padStart(2, "0")}`, date, { dubbed, lang, ott });
      films.push(film);
      credits.push({
        filmId: id,
        personId,
        roleScope: "principal_male_lead",
        eligibilityStatus: "approved",
        evidenceNote: "Demo credit — fictional title.",
        sourceId: "src-demo",
      });
      const q = Math.min(98, Math.max(5, gaussian(r, shape.quality + shape.trend * (year - 2013), shape.volatility)));
      addEvidence(film, q, shape.pull, r);
    });

    syntheticSocial.push({
      personId,
      index: Math.round(Math.min(96, Math.max(12, between(r, 28, 60) + shape.pull * 14)) * 10) / 10,
      snapshotAt: DEMO_AS_OF,
    });
  }

  // Multi-hero titles: a genuine co-lead film counts once for every verified lead.
  const leadPool = INITIAL_ROSTER.filter((c) => !c.demoFilmCount);
  for (let i = 1; i <= 12; i++) {
    const a = pick(rng, leadPool);
    const end = (x: RosterCandidate) => Math.min(asOfYear - 1, x.demoEndYear ?? asOfYear - 1);
    const candidates = leadPool.filter(
      (b) => b.slug !== a.slug && Math.max(a.demoStartYear, b.demoStartYear) <= Math.min(end(a), end(b)),
    );
    const b = pick(rng, candidates);
    const year = intBetween(rng, Math.max(a.demoStartYear, b.demoStartYear), Math.min(end(a), end(b)));
    const id = `f-multi-${String(i).padStart(2, "0")}`;
    const bothDubbed = a.industry !== "telugu" && b.industry !== "telugu";
    const film = makeFilm(id, `Demo Multi-Hero Title M-${String(i).padStart(2, "0")}`, isoDate(year, between(rng, 0, 360)), {
      dubbed: bothDubbed,
      lang: bothDubbed ? LANG[a.industry] : "te",
      ott: false,
    });
    films.push(film);
    for (const [idx, h] of [a, b].entries())
      credits.push({
        filmId: id,
        personId: `p-${h.slug}`,
        roleScope: idx === 0 ? "principal_male_lead" : "co_principal_male_lead",
        eligibilityStatus: "approved",
        evidenceNote: "Demo co-lead credit — both leads verified as principal.",
        sourceId: "src-demo",
      });
    const sa = shapes.get(a.slug)!;
    const sb = shapes.get(b.slug)!;
    addEvidence(film, (sa.quality + sb.quality) / 2 + gaussian(rng, 4, 8), (sa.pull + sb.pull) / 2 + 0.6, rng);
  }

  // Records that exist in the registry but must NOT count (for Annexure & tests).
  const excludedRecords: { film: Film; credit: Omit<Credit, "filmId"> }[] = [
    {
      film: { ...makeFilm("f-x-cameo-01", "Demo Title (cameo appearance)", "2018-05-11", { dubbed: false, lang: "te", ott: false }) },
      credit: { personId: "p-venkatesh", roleScope: "cameo", eligibilityStatus: "rejected", evidenceNote: "Cameo — excluded.", sourceId: "src-demo" },
    },
    {
      film: { ...makeFilm("f-x-special-01", "Demo Title (special appearance)", "2021-02-19", { dubbed: false, lang: "te", ott: false }) },
      credit: { personId: "p-ram-charan", roleScope: "special_appearance", eligibilityStatus: "rejected", evidenceNote: "Special appearance — excluded.", sourceId: "src-demo" },
    },
    {
      film: { ...makeFilm("f-x-support-01", "Demo Title (supporting role)", "2016-09-09", { dubbed: false, lang: "te", ott: false }) },
      credit: { personId: "p-rana-daggubati", roleScope: "supporting", eligibilityStatus: "approved", evidenceNote: "Supporting role — not a principal lead.", sourceId: "src-demo" },
    },
    {
      film: {
        ...makeFilm("f-x-series-01", "Demo Web Series (excluded format)", "2023-07-07", { dubbed: false, lang: "te", ott: true }),
        featureType: "excluded_series",
      },
      credit: { personId: "p-nani", roleScope: "principal_male_lead", eligibilityStatus: "approved", evidenceNote: "Web series — format excluded.", sourceId: "src-demo" },
    },
    {
      film: (() => {
        const f = makeFilm("f-x-rerelease-01", "Demo Title (re-release screening)", "2024-08-09", { dubbed: false, lang: "te", ott: false });
        return { ...f, teluguRelease: { ...f.teluguRelease, isReRelease: true } };
      })(),
      credit: { personId: "p-mahesh-babu", roleScope: "principal_male_lead", eligibilityStatus: "approved", evidenceNote: "Re-release — not a new credit.", sourceId: "src-demo" },
    },
  ];
  for (const x of excludedRecords) {
    films.push(x.film);
    credits.push({ ...x.credit, filmId: x.film.id });
  }

  const changeLog: ChangeLogEntry[] = [
    {
      id: "cl-1",
      entityType: "methodology_version",
      entityId: "mv-2026-09-demo",
      action: "activated",
      reason: "Baseline weights from the product brief (critic reviews excluded in v1).",
      createdAt: "2026-09-01T09:00:00Z",
      actor: "editorial",
    },
    {
      id: "cl-2",
      entityType: "people",
      entityId: "roster",
      action: "seeded",
      reason: "Initial curated roster seeded in demo mode; lead credits pending verification.",
      createdAt: "2026-09-01T09:05:00Z",
      actor: "editorial",
    },
    {
      id: "cl-3",
      entityType: "people",
      entityId: "panja-vaisshnav-tej",
      action: "excluded",
      reason: "Editorial decision: excluded from the initial roster and seed data.",
      createdAt: "2026-09-01T09:06:00Z",
      actor: "editorial",
    },
    {
      id: "cl-4",
      entityType: "people",
      entityId: "p-mouli-tanuj-prasanth",
      action: "flagged_emerging",
      reason: "Registry candidate with fewer than 3 eligible lead films; visible only with 'Include emerging heroes'.",
      createdAt: "2026-09-01T09:07:00Z",
      actor: "editorial",
    },
  ];

  return {
    mode: "demo",
    asOf: DEMO_AS_OF,
    sources: DEMO_SOURCES,
    people,
    films,
    credits,
    reception,
    commercial,
    legacy,
    social: [],
    syntheticSocial,
    changeLog,
  };
}
