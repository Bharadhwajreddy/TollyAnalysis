/**
 * Feature switches. NEXT_PUBLIC_ values are inlined at build time, so changing one
 * needs a redeploy (on Vercel: edit the env var, then Redeploy).
 */
export function userRankingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_USER_RANKING === "true";
}
