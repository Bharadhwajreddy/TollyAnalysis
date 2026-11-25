/**
 * The lead-role check from billing order, shared by the full import (scripts/import-real-data.mts)
 * and the credit fixer (scripts/fix-credits.mts). A hero's film counts when he is billed first in
 * the film's infobox, or is a genuine co-lead billed right after other roster heroes.
 */

export const squash = (x: string) => x.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z]/g, "");

export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export interface BillingHero {
  slug: string;
  /** Display name, Wikipedia article titles and any aliases the hero is billed under. */
  names: string[];
  /** Actors who now play character roles: they count only when billed first. */
  strict?: boolean;
}

/**
 * Drops HTML comments from an infobox "starring" list (they sit between the names and are not cast).
 * Older snapshots kept the comment as one or two broken entries ("<!--Order as per the opening
 * credits", "See description at youtube.com/...-->"); the closing marker may be missing, so a
 * comment continues only while the entries still read like comment text.
 */
export function withoutComments(names: string[]): string[] {
  const out: string[] = [];
  let inComment = false;
  const looksLikeComment = (n: string) => /-->|https?:|youtube\.com|^(see|order|as per|source|ref)\b/i.test(n);
  for (const n of names) {
    if (!inComment && n.includes("<!--")) {
      const before = n.slice(0, n.indexOf("<!--")).trim();
      if (before) out.push(before);
      inComment = !n.includes("-->");
      const after = n.includes("-->") ? n.slice(n.indexOf("-->") + 3).trim() : "";
      if (after) out.push(after);
      continue;
    }
    if (inComment) {
      if (n.includes("-->")) {
        inComment = false;
        const after = n.slice(n.indexOf("-->") + 3).trim();
        if (after) out.push(after);
        continue;
      }
      if (looksLikeComment(n)) continue;
      inComment = false;
    }
    if (n.includes("-->")) continue; // the stray end of a comment
    out.push(n);
  }
  return out;
}

export function makeBilling(heroes: BillingHero[], articleTitles: Iterable<string>) {
  const articles = new Set(articleTitles);
  const words = (x: string) => x.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean).length;
  const aliasesOf = new Map(heroes.map((h) => [h.slug, h.names.filter((n) => squash(n).length >= 3).map((n) => ({ s: squash(n), w: words(n) }))]));
  const strictOf = new Map(heroes.map((h) => [h.slug, !!h.strict]));
  const isHero = (entry: string, slug: string) => {
    const e = squash(entry);
    if (e.length < 3) return false;
    const ew = words(entry);
    // A one-word name never prefix-matches a longer name: "Vijay" is not "Vijay Sethupathi" or "Vijay Shankar".
    const prefixOk = (aw: number) => (aw > 1 && ew > 1) || aw === ew;
    return (aliasesOf.get(slug) ?? []).some(
      ({ s: a, w: aw }) => e === a || (e.length >= 5 && prefixOk(aw) && (a.startsWith(e) || e.startsWith(a))) || (e.length >= 8 && Math.abs(e.length - a.length) <= 2 && editDistance(e, a) <= 2),
    );
  };
  const rosterSlugOf = (entry: string) => heroes.find((h) => isHero(entry, h.slug))?.slug;
  /** Position (0-based, -1 = not listed) and whether he is a co-lead billed straight after other roster heroes. */
  return function check(hero: string, starring: string[]) {
    const pos = starring.findIndex((n) => isHero(n, hero));
    const before = starring.slice(0, Math.max(0, pos));
    const coLead = !strictOf.get(hero) && pos > 0 && pos <= 2 && before.every((n) => articles.has(n) || !!rosterSlugOf(n));
    return { pos, coLead };
  };
}
