import "server-only";
import { getDirectors } from "@/lib/directors";
import { getLedger, isHit, isJudged } from "@/lib/ledger";
import { getHeroSummaries } from "@/lib/ledger-rows";
import type { Outcome } from "@/lib/ledger-types";

/**
 * Director × hero pairings: how often a director and a hero made a Telugu film together (since 2000), and how
 * those films did. Built from the same film ledger as every strip, so a cell's films are the marks it lights.
 */

export interface PairFilm {
  s: string;
  t: string;
  y: number;
  o: Outcome;
}
export interface PairCell {
  d: number;
  h: number;
  n: number;
  hits: number;
  judged: number;
  films: PairFilm[];
}
export interface Pairings {
  directors: { slug: string; name: string; films: number }[];
  heroes: { slug: string; name: string; img: string | null; films: number }[];
  cells: PairCell[];
  max: number;
}

export async function getPairings(size = 14): Promise<Pairings> {
  const [ledger, summaries, dirs] = await Promise.all([getLedger(), getHeroSummaries(), getDirectors()]);
  const shown = new Map(dirs.map((d) => [d.slug, d.name]));
  const img = new Map(summaries.map((s) => [s.slug, s.img]));
  type Acc = { d: string; dn: string; h: string; hn: string; films: PairFilm[]; hits: number; judged: number };
  const pairs = new Map<string, Acc>();
  for (const f of ledger.films) {
    if (!f.director?.slug || f.language !== "te" || f.year < 2000) continue;
    for (const h of f.heroes) {
      const k = `${f.director.slug}|${h.slug}`;
      const p = pairs.get(k) ?? { d: f.director.slug, dn: f.director.name, h: h.slug, hn: h.name, films: [], hits: 0, judged: 0 };
      p.films.push({ s: f.slug, t: f.title, y: f.year, o: f.outcome });
      if (isJudged(f)) {
        p.judged++;
        if (isHit(f)) p.hits++;
      }
      pairs.set(k, p);
    }
  }
  // Only repeat pairings decide who is in the matrix; one-off films still show once both are in.
  const repeat = [...pairs.values()].filter((p) => p.films.length >= 2);
  const top = (key: "d" | "h", within: Set<string> | null) => {
    const other = key === "d" ? "h" : "d";
    const score = new Map<string, number>();
    for (const p of repeat) if (!within || within.has(p[other])) score.set(p[key], (score.get(p[key]) ?? 0) + p.films.length ** 2);
    return new Set([...score].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, size).map(([k]) => k));
  };
  // Strong repeat pairings weigh most (films²), so a 4-film partnership beats four one-off pairs.
  let heroes = top("h", null);
  let directors = top("d", heroes);
  for (let i = 0; i < 3; i++) {
    heroes = top("h", directors);
    directors = top("d", heroes);
  }

  const inside = [...pairs.values()].filter((p) => directors.has(p.d) && heroes.has(p.h));
  const total = (key: "d" | "h", k: string) => inside.filter((p) => p[key] === k).reduce((s, p) => s + p.films.length, 0);
  const dList = [...directors].sort((a, b) => total("d", b) - total("d", a) || a.localeCompare(b));
  const hList = [...heroes].sort((a, b) => total("h", b) - total("h", a) || a.localeCompare(b));
  const dName = new Map(inside.map((p) => [p.d, shown.get(p.d) ?? p.dn]));
  const hName = new Map(inside.map((p) => [p.h, p.hn]));
  const dIdx = new Map(dList.map((k, i) => [k, i]));
  const hIdx = new Map(hList.map((k, i) => [k, i]));
  const cells = inside.map((p) => ({ d: dIdx.get(p.d) as number, h: hIdx.get(p.h) as number, n: p.films.length, hits: p.hits, judged: p.judged, films: p.films }));
  return {
    directors: dList.map((k) => ({ slug: k, name: dName.get(k) ?? k, films: total("d", k) })),
    heroes: hList.map((k) => ({ slug: k, name: hName.get(k) ?? k, img: img.get(k) ?? null, films: total("h", k) })),
    cells,
    max: Math.max(1, ...cells.map((c) => c.n)),
  };
}
