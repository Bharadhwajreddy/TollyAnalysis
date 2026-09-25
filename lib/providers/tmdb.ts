import "server-only";
import { serverEnv } from "@/lib/env";
import { fetchJson, ProviderDisabledError, sha256Hex } from "./http";

/**
 * TMDb adapter (primary discovery / metadata layer). Server-side only.
 * Requires FEATURE_TMDB=true and TMDB_API_READ_TOKEN. Respect TMDb terms and show
 * the attribution notice wherever TMDb data or images are displayed.
 */

const BASE = "https://api.themoviedb.org/3";

export interface TmdbCastCredit {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date?: string;
  character?: string;
  order?: number;
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbPerson {
  id: number;
  name: string;
  also_known_as?: string[];
  imdb_id?: string | null;
  known_for_department?: string;
}

export interface TmdbReleaseDates {
  results: { iso_3166_1: string; release_dates: { release_date: string; type: number; note?: string; iso_639_1?: string }[] }[];
}

function config() {
  const env = serverEnv();
  if (!env.FEATURE_TMDB) throw new ProviderDisabledError("tmdb", "FEATURE_TMDB is not enabled");
  if (!env.TMDB_API_READ_TOKEN) throw new ProviderDisabledError("tmdb", "TMDB_API_READ_TOKEN is missing");
  return { headers: { authorization: `Bearer ${env.TMDB_API_READ_TOKEN}` } };
}

const get = <T>(path: string) => fetchJson<T>(`${BASE}${path}`, { provider: "tmdb", ...config() });

export const tmdb = {
  searchPerson: (query: string) =>
    get<{ results: TmdbPerson[] }>(`/search/person?query=${encodeURIComponent(query)}&include_adult=false&language=en-US`),
  person: (id: number) => get<TmdbPerson>(`/person/${id}`),
  personMovieCredits: (id: number) => get<{ cast: TmdbCastCredit[] }>(`/person/${id}/movie_credits?language=en-US`),
  movie: (id: number) => get<{ id: number; title: string; original_language: string; runtime: number | null; imdb_id: string | null; status: string }>(`/movie/${id}`),
  movieCredits: (id: number) => get<{ cast: { id: number; name: string; order: number; character: string }[] }>(`/movie/${id}/credits`),
  movieExternalIds: (id: number) => get<{ imdb_id: string | null; wikidata_id: string | null }>(`/movie/${id}/external_ids`),
  movieReleaseDates: (id: number) => get<TmdbReleaseDates>(`/movie/${id}/release_dates`),
  movieTranslations: (id: number) => get<{ translations: { iso_639_1: string; data: { title: string } }[] }>(`/movie/${id}/translations`),
};

export interface CandidateFilm {
  tmdbMovieId: number;
  title: string;
  originalTitle: string;
  originalLanguage: string;
  releaseDate: string | null;
  releaseType: "original" | "dubbed";
  castOrder: number | null;
  character: string | null;
  tmdbRating: number | null;
  tmdbVotes: number | null;
}

/**
 * Maps a person's TMDb cast credits to candidate films from 2000 onward.
 * Telugu originals are marked `original`; other languages are candidates for a
 * Telugu dub that an editor must confirm. Lead status is NEVER inferred here —
 * every imported credit starts as `pending` for editorial review.
 */
export function mapCandidateFilms(cast: TmdbCastCredit[], sinceIso = "2000-01-01"): CandidateFilm[] {
  const seen = new Set<number>();
  return cast
    .filter((c) => (c.release_date ?? "") >= sinceIso)
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .map((c) => ({
      tmdbMovieId: c.id,
      title: c.title,
      originalTitle: c.original_title,
      originalLanguage: c.original_language,
      releaseDate: c.release_date || null,
      releaseType: c.original_language === "te" ? ("original" as const) : ("dubbed" as const),
      castOrder: c.order ?? null,
      character: c.character ?? null,
      tmdbRating: typeof c.vote_average === "number" && (c.vote_count ?? 0) > 0 ? c.vote_average : null,
      tmdbVotes: c.vote_count ?? null,
    }))
    .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
}

export async function payloadHash(payload: unknown) {
  return sha256Hex(JSON.stringify(payload));
}
