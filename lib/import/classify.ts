/** Roles that never count as a lead credit. */
const EXCLUDE_ROLE = /\b(cameo|special appearance|guest appearance|guest role|guest|friendly appearance|voice(?:-| )?(?:over|only|role)?|narrat|uncredited|item (?:song|number)|song appearance|in the song|special song|also (?:singer|lyricist) only|archive footage)\b/i;
/** "Also dubbed for X" says the hero voiced someone else; "Dubbed" alone says the credit is voice-only. */
const DUBBED_ONLY = /\bdubbed\b/i;
const ALSO_DUBBED = /\balso\b[^.;]*\bdubbed\b/i;
const UNRELEASED = /\b(post-production|filming|pre-production|upcoming|announced|delayed|shelved|unreleased|completed|in production|releasing soon|yet to (?:be )?release[d]?|to be released)\b|†/i;
const SUPPORTING = /\bsupporting role\b/i;

/**
 * Decides whether a filmography row is a lead credit. The Notes column is authoritative
 * ("Cameo appearance", "Voice-over", "Special appearance"); the Role column only counts
 * when the whole role is a non-lead marker (e.g. "Himself", "Narrator"), because a lead
 * role can mention a cameo of a second character.
 */
export function classifyRole(role: string, notes: string): "lead" | "cameo" | "supporting" {
  if (EXCLUDE_ROLE.test(notes) || (DUBBED_ONLY.test(notes) && !ALSO_DUBBED.test(notes))) return "cameo";
  if (/^\s*(himself|narrator|voice|cameo|special appearance|guest)\b[^/,]*$/i.test(role)) return "cameo";
  if (SUPPORTING.test(notes)) return "supporting";
  return "lead";
}

export function looksUnreleased(...parts: string[]) {
  return parts.some((p) => UNRELEASED.test(p));
}

/**
 * Languages whose films count: Telugu, and Hindi films where a Telugu hero plays the lead.
 * Other languages count only through an editorial include (a film also released in Telugu).
 */
export const COUNTED_LANGUAGE = /\b(telugu|hindi)\b/i;
export const isCountedLanguage = (text: string) => COUNTED_LANGUAGE.test(text);
