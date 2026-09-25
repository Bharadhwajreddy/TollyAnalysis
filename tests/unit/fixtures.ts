import type {
  CommercialEvidence,
  Credit,
  Dataset,
  Film,
  Person,
  ReceptionEvidence,
} from "@/lib/domain/types";

export const AS_OF = "2026-09-15";

export function film(id: string, date: string, over: Partial<Film> = {}, tr: Partial<Film["teluguRelease"]> = {}): Film {
  return {
    id,
    slug: id,
    title: `Film ${id}`,
    originalLanguage: "te",
    releaseRoute: "theatrical",
    featureType: "feature",
    status: "released",
    tmdbMovieId: null,
    imdbTitleId: null,
    isDemo: true,
    ...over,
    teluguRelease: {
      releaseType: "original",
      releaseDate: date,
      route: "theatrical",
      isEligibleTeluguRelease: true,
      isReRelease: false,
      ...tr,
    },
  };
}

export function person(id: string, name = id): Person {
  return {
    id,
    slug: id,
    displayName: name,
    industry: "telugu",
    status: "active",
    visibility: "public",
    tmdbPersonId: null,
    wikidataId: null,
    imdbNameId: null,
  };
}

export function lead(filmId: string, personId: string, over: Partial<Credit> = {}): Credit {
  return {
    filmId,
    personId,
    roleScope: "principal_male_lead",
    eligibilityStatus: "approved",
    evidenceNote: null,
    sourceId: "s1",
    ...over,
  };
}

export function rating(filmId: string, r: number, votes: number, over: Partial<ReceptionEvidence> = {}): ReceptionEvidence {
  return {
    filmId,
    sourceId: "s1",
    provider: "tmdb",
    scope: "film_wide",
    rating: r,
    voteCount: votes,
    observedAt: AS_OF,
    retrievedAt: AS_OF,
    approvalStatus: "approved",
    ...over,
  };
}

export function claim(filmId: string, over: Partial<CommercialEvidence>): CommercialEvidence {
  return {
    filmId,
    sourceId: "s2",
    metricType: "trade_verdict",
    versionScope: "telugu_original",
    territory: "AP/TS",
    currency: "INR",
    amountLowMinor: null,
    amountHighMinor: null,
    valueText: null,
    syntheticScore: null,
    confidence: "high",
    approvalStatus: "approved",
    observedAt: AS_OF,
    sourceUrl: "https://example.org/report",
    ...over,
  };
}

export function dataset(over: Partial<Dataset>): Dataset {
  return {
    mode: "live",
    asOf: AS_OF,
    sources: [],
    people: [],
    films: [],
    credits: [],
    reception: [],
    commercial: [],
    legacy: [],
    social: [],
    syntheticSocial: [],
    changeLog: [],
    ...over,
  };
}
