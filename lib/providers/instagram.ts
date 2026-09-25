import "server-only";
import { serverEnv } from "@/lib/env";
import { fetchJson, ProviderDisabledError } from "./http";
import type { SocialMetricsResult } from "./social";

/**
 * Instagram Graph API Business Discovery — public follower count for an eligible
 * professional account, looked up by username from the owner's business account.
 * Only for explicit official profile records; never searches or scrapes.
 */
export async function fetchInstagram(username: string): Promise<SocialMetricsResult> {
  const env = serverEnv();
  if (!env.FEATURE_INSTAGRAM) throw new ProviderDisabledError("instagram", "FEATURE_INSTAGRAM is not enabled");
  if (!env.META_GRAPH_ACCESS_TOKEN || !env.META_IG_BUSINESS_ACCOUNT_ID)
    throw new ProviderDisabledError("instagram", "META_GRAPH_ACCESS_TOKEN / META_IG_BUSINESS_ACCOUNT_ID missing");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) throw new Error("Invalid Instagram username");
  const fields = `business_discovery.username(${username}){id,followers_count,media_count}`;
  const url = `https://graph.facebook.com/v21.0/${env.META_IG_BUSINESS_ACCOUNT_ID}?fields=${encodeURIComponent(fields)}`;
  const data = await fetchJson<{ business_discovery: { id: string; followers_count: number; media_count: number } }>(url, {
    provider: "instagram",
    headers: { authorization: `Bearer ${env.META_GRAPH_ACCESS_TOKEN}` },
  });
  return {
    platform: "instagram",
    platformUserId: data.business_discovery.id,
    followersCount: data.business_discovery.followers_count,
    subscribersCount: null,
    postCount: data.business_discovery.media_count,
    verifiedState: null,
    snapshotAt: new Date().toISOString(),
    sourceMethod: "instagram_graph_business_discovery",
    rawPayload: data,
  };
}
