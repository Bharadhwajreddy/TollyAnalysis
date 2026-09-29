import type { TradeVerdict } from "@/lib/domain/types";

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

/**
 * Reads a box-office verdict from article prose (box-office section and lead).
 * Only sentences about box office / commercial performance are considered.
 */
export function classifyVerdict(prose: string): { verdict: TradeVerdict; sentence: string } | null {
  const sentences = prose
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => /box[- ]office|commercial|gross|collection|profit|loss|verdict|success|flop|bomb|blockbuster|hit\b|disaster/i.test(s))
    // Not about this film's box office: songs, the original film of a remake, critics' reviews.
    .filter((s) => !/\b(song|soundtrack|album|music)\b/i.test(s))
    .filter((s) => !/\bremake of|remade (?:from|in)|original (?:film|version)\b/i.test(s))
    .filter((s) => !/\brated\b|\/5\b|out of (?:5|five)|\bstars\b|\bwrote\b|\bcritic/i.test(s) || /box[- ]office/i.test(s));
  const negated = (s: string, re: RegExp) => {
    const m = re.exec(s);
    return !!m && /\b(not|never|no|hardly|n't)\s+(?:\w+\s+){0,2}$/i.test(s.slice(Math.max(0, m.index - 30), m.index));
  };
  // Explicit verdict words first; "highest-grossing" rank statements only as a last resort.
  const rules: [RegExp, TradeVerdict][] = [
    [/\b(all[- ]time blockbuster|industry hit|blockbuster)\b/i, "blockbuster"],
    [/\b(super ?hit|major commercial success|huge (?:commercial )?success|massive (?:commercial )?success)\b/i, "super_hit"],
    [/\b(disaster|box[- ]office bomb|major (?:commercial )?failure|huge loss)\b/i, "disaster"],
    [/\b(flop|commercial failure|box[- ]office failure|failed (?:commercially|at the box office)|commercially unsuccessful|underperformed|failure at the box office|loss(?:es)? to (?:the )?distributors)\b/i, "flop"],
    [/\b(below average|mixed box[- ]office)\b/i, "below_average"],
    [/\b(above average)\b/i, "above_average"],
    [/\b(average grosser|average at the box office|moderate (?:commercial )?success|moderately successful)\b/i, "average"],
    [/\b(commercial success|commercially successful|box[- ]office success|was a hit|became a hit|emerged (?:as )?a hit|successful at the box office|profitable venture|sleeper hit|hit at the box office)\b/i, "hit"],
    [/\bhighest[- ]grossing telugu films? (?:of|in) (?:the year|\d{4})\b/i, "hit"],
  ];
  for (const [re, verdict] of rules) {
    const s = sentences.find((x) => re.test(x) && !negated(x, re));
    if (s) return { verdict, sentence: s.slice(0, 240) };
  }
  return null;
}
