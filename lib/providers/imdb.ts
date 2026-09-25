import "server-only";
import { serverEnv } from "@/lib/env";
import { fetchJson, ProviderDisabledError } from "./http";

/**
 * IMDb adapter. Modes:
 *  - "disabled" (default): no automated ingestion. Editors may enter a rating and vote
 *    count manually with a source URL and retrieval date.
 *  - "licensed_or_permitted_source": enabled only when the owner supplies a compliant
 *    API/data licence via IMDB_LICENSED_ENDPOINT + IMDB_LICENSED_API_KEY.
 * IMDb HTML is never scraped.
 */
export type ImdbMode = "disabled" | "licensed_or_permitted_source";

export function imdbMode(): ImdbMode {
  const env = serverEnv();
  return env.FEATURE_IMDB_LICENSED && env.IMDB_LICENSED_ENDPOINT && env.IMDB_LICENSED_API_KEY ? "licensed_or_permitted_source" : "disabled";
}

export interface ImdbRating {
  imdbTitleId: string;
  rating: number;
  votes: number;
  retrievedAt: string;
}

export async function fetchImdbRating(imdbTitleId: string): Promise<ImdbRating> {
  if (imdbMode() === "disabled") throw new ProviderDisabledError("imdb", "no licensed or permitted source configured");
  if (!/^tt\d{6,10}$/.test(imdbTitleId)) throw new Error("Invalid IMDb title id");
  const env = serverEnv();
  // The licensed provider's contract defines the exact shape; adapt here.
  const data = await fetchJson<{ rating: number; votes: number }>(
    `${env.IMDB_LICENSED_ENDPOINT!.replace(/\/$/, "")}/titles/${imdbTitleId}/ratings`,
    { provider: "imdb", headers: { authorization: `Bearer ${env.IMDB_LICENSED_API_KEY}` } },
  );
  return { imdbTitleId, rating: data.rating, votes: data.votes, retrievedAt: new Date().toISOString() };
}
