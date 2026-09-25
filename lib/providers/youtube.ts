import "server-only";
import { serverEnv } from "@/lib/env";
import { fetchJson, ProviderDisabledError } from "./http";
import type { SocialMetricsResult } from "./social";

/** YouTube Data API v3 channel statistics for an official channel id. */
export async function fetchYouTube(channelId: string): Promise<SocialMetricsResult> {
  const env = serverEnv();
  if (!env.FEATURE_YOUTUBE) throw new ProviderDisabledError("youtube", "FEATURE_YOUTUBE is not enabled");
  if (!env.YOUTUBE_API_KEY) throw new ProviderDisabledError("youtube", "YOUTUBE_API_KEY missing");
  if (!/^UC[A-Za-z0-9_-]{20,24}$/.test(channelId)) throw new Error("Invalid YouTube channel id");
  const data = await fetchJson<{ items: { id: string; statistics: { subscriberCount?: string; hiddenSubscriberCount: boolean; videoCount: string } }[] }>(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${env.YOUTUBE_API_KEY}`,
    { provider: "youtube" },
  );
  const item = data.items[0];
  if (!item) throw new Error("Channel not found");
  const subs = item.statistics.hiddenSubscriberCount || !item.statistics.subscriberCount ? null : Number(item.statistics.subscriberCount);
  return {
    platform: "youtube",
    platformUserId: item.id,
    followersCount: subs,
    subscribersCount: subs,
    postCount: Number(item.statistics.videoCount),
    verifiedState: null,
    snapshotAt: new Date().toISOString(),
    sourceMethod: "youtube_data_api_v3_channels",
    rawPayload: data,
  };
}
