/** Roles that never count as a lead credit. */
const EXCLUDE_ROLE = /\b(cameo|special appearance|guest appearance|guest role|guest|friendly appearance|voice(?:-| )?(?:over|only|role)?|narrat|uncredited|item (?:song|number)|song appearance|in the song|special song|also (?:singer|lyricist) only|archive footage|dubbed)\b/i;
const UNRELEASED = /\b(post-production|filming|pre-production|upcoming|announced|delayed|shelved|unreleased|completed|in production|†)\b|†/i;
const SUPPORTING = /\bsupporting role\b/i;

/**
 * Decides whether a filmography row is a lead credit. The Notes column is authoritative
 * ("Cameo appearance", "Voice-over", "Special appearance"); the Role column only counts
 * when the whole role is a non-lead marker (e.g. "Himself", "Narrator"), because a lead
 * role can mention a cameo of a second character.
 */
export function classifyRole(role: string, notes: string): "lead" | "cameo" | "supporting" {
  if (EXCLUDE_ROLE.test(notes)) return "cameo";
  if (/^\s*(himself|narrator|voice|cameo|special appearance|guest)\b[^/,]*$/i.test(role)) return "cameo";
  if (SUPPORTING.test(notes)) return "supporting";
  return "lead";
}

export function looksUnreleased(...parts: string[]) {
  return parts.some((p) => UNRELEASED.test(p));
}
