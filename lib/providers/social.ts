import "server-only";

/** Common shape every social adapter returns for an explicit official profile. */
export interface SocialMetricsResult {
  platform: "instagram" | "x" | "youtube" | "facebook";
  platformUserId: string | null;
  followersCount: number | null;
  subscribersCount: number | null;
  postCount: number | null;
  verifiedState: string | null;
  snapshotAt: string;
  sourceMethod: string;
  rawPayload: unknown;
}
