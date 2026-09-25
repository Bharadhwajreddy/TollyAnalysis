import "server-only";
import { serverEnv } from "@/lib/env";
import { fetchJson, ProviderDisabledError } from "./http";
import type { SocialMetricsResult } from "./social";

/** X API v2 user public metrics. Requires an approved access tier. */
export async function fetchX(username: string): Promise<SocialMetricsResult> {
  const env = serverEnv();
  if (!env.FEATURE_X) throw new ProviderDisabledError("x", "FEATURE_X is not enabled");
  if (!env.X_BEARER_TOKEN) throw new ProviderDisabledError("x", "X_BEARER_TOKEN missing");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) throw new Error("Invalid X username");
  const data = await fetchJson<{
    data: { id: string; verified?: boolean; public_metrics: { followers_count: number; tweet_count: number } };
  }>(`https://api.x.com/2/users/by/username/${username}?user.fields=public_metrics,verified`, {
    provider: "x",
    headers: { authorization: `Bearer ${env.X_BEARER_TOKEN}` },
  });
  return {
    platform: "x",
    platformUserId: data.data.id,
    followersCount: data.data.public_metrics.followers_count,
    subscribersCount: null,
    postCount: data.data.public_metrics.tweet_count,
    verifiedState: data.data.verified === undefined ? null : String(data.data.verified),
    snapshotAt: new Date().toISOString(),
    sourceMethod: "x_api_v2_user_public_metrics",
    rawPayload: data,
  };
}
