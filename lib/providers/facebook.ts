import "server-only";
import { serverEnv } from "@/lib/env";
import { fetchJson, ProviderDisabledError } from "./http";
import type { SocialMetricsResult } from "./social";

/** Meta Graph API page followers — only where permitted for the page. */
export async function fetchFacebook(pageId: string): Promise<SocialMetricsResult> {
  const env = serverEnv();
  if (!env.FEATURE_FACEBOOK) throw new ProviderDisabledError("facebook", "FEATURE_FACEBOOK is not enabled");
  if (!env.META_GRAPH_ACCESS_TOKEN) throw new ProviderDisabledError("facebook", "META_GRAPH_ACCESS_TOKEN missing");
  if (!/^[0-9]{5,25}$/.test(pageId)) throw new Error("Invalid Facebook page id");
  const data = await fetchJson<{ id: string; followers_count: number }>(`https://graph.facebook.com/v21.0/${pageId}?fields=followers_count`, {
    provider: "facebook",
    headers: { authorization: `Bearer ${env.META_GRAPH_ACCESS_TOKEN}` },
  });
  return {
    platform: "facebook",
    platformUserId: data.id,
    followersCount: data.followers_count,
    subscribersCount: null,
    postCount: null,
    verifiedState: null,
    snapshotAt: new Date().toISOString(),
    sourceMethod: "meta_graph_page_followers",
    rawPayload: data,
  };
}
