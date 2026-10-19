/**
 * Feature switches. NEXT_PUBLIC_ values are inlined at build time, so changing one
 * needs a redeploy (on Vercel: edit the env var, then Redeploy).
 */
export function userRankingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_USER_RANKING === "true";
}

/** The Tolly Index (lib/data/tolly). On unless NEXT_PUBLIC_FEATURE_TOLLY_INDEX is "false"; real data only. */
export function tollyIndexEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_TOLLY_INDEX !== "false";
}
