import "server-only";
import { getDirectors } from "@/lib/directors";
import { getLedger, isHit, isJudged, longestStreak, toDot, type FilmAtom } from "@/lib/ledger";
import type { FilmDot } from "@/lib/ledger-types";
import { releaseCounts } from "@/lib/releases";
import { getTollyRanking } from "@/lib/tolly/view";

/**
 * Editorial findings, computed from the data at build time so they stay true as the data changes. Each one
 * carries the films behind it, drawn as marks next to the sentence.
 */
export interface Finding {
  id: string;
  big: string;
  title: string;
  body: string;
  href: string;
  linkText: string;
  films?: FilmDot[];
  bars?: { label: string; value: number; partial?: boolean }[];
}

export async function getFindings(): Promise<Finding[]> {
  const ledger = await getLedger();
  const ranked = getTollyRanking().ranked;
  const out: Finding[] = [];

  // 1. Longest run of hits by a ranked Telugu hero.
  let best: { slug: string; name: string; s: ReturnType<typeof longestStreak>; films: FilmAtom[] } | null = null;
  for (const h of ranked) {
    const films = ledger.byHero.get(h.slug) ?? [];
    const s = longestStreak(films);
    if (!best || s.length > best.s.length) best = { slug: h.slug, name: h.name, s, films };
  }
  if (best && best.s.from && best.s.to) {
    const from = best.films.indexOf(best.s.from);
    const to = best.films.indexOf(best.s.to);
    const run = best.films.slice(from, to + 1).filter(isJudged);
    out.push({
      id: "streak",
      big: `${best.s.length} in a row`,
      title: `${best.name}'s unbroken run`,
      body: `${best.s.length} hits back to back, from ${best.s.from.title} (${best.s.from.year}) to ${best.s.to.title} (${best.s.to.year}). No ranked hero has a longer streak.`,
      href: `/hero/${best.slug}`,
      linkText: best.name,
      films: run.map(toDot),
    });
  }

  // 2. A director who has never missed.
  const perfect = (await getDirectors()).filter((d) => d.ranked && d.hitRate === 1).sort((a, b) => b.judged - a.judged)[0];
  if (perfect) {
    out.push({
      id: "perfect",
      big: `${perfect.hits} for ${perfect.judged}`,
      title: `${perfect.name} has never made a non-hit`,
      body: `Every one of his ${perfect.judged} films with a known result was a hit or better, across ${perfect.heroes.length} different heroes.`,
      href: `/director/${perfect.slug}`,
      linkText: perfect.name,
      films: (ledger.byDirector.get(perfect.slug) ?? []).filter((f) => f.language === "te").map(toDot),
    });
  }

  // 3. How many more films release now.
  const counts = releaseCounts().filter((c) => !c.partial);
  const low = counts.filter((c) => c.year >= 2005).reduce((a, b) => (b.total < a.total ? b : a));
  const high = counts.reduce((a, b) => (b.total > a.total ? b : a));
  out.push({
    id: "releases",
    big: `×${(high.total / low.total).toFixed(1)}`,
    title: "Telugu cinema releases far more films than it used to",
    body: `${low.total} releases in ${low.year}; ${high.total} in ${high.year}, counting films dubbed into Telugu and direct-to-OTT premieres.`,
    href: "/releases",
    linkText: "Years",
    bars: releaseCounts().map((c) => ({ label: String(c.year), value: c.total, partial: c.partial })),
  });

  // 4. The biggest reported gross.
  const top = [...ledger.films].filter((f) => f.gross).sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0));
  if (top.length >= 2) {
    out.push({
      id: "gross",
      big: `₹${Math.round(top[0].gross as number).toLocaleString("en-IN")} cr`,
      title: `${top[0].title} is still the biggest reported gross`,
      body: `Ahead of ${top[1].title} (₹${Math.round(top[1].gross as number).toLocaleString("en-IN")} cr) and ${top[2]?.title ?? ""}. Reported worldwide figures, all languages.`,
      href: `/film/${top[0].slug}`,
      linkText: top[0].title,
      films: top.slice(0, 12).map(toDot),
    });
  }

  return out;
}

export { isHit };
