import "server-only";
import { directorSlug, getDirectors } from "@/lib/directors";
import { load } from "@/lib/repositories";
import { getTollyFilm, getTollyRanking } from "@/lib/tolly/view";
import { slugify } from "@/lib/directors";
import type { FilmAtom, FilmDot, Outcome } from "@/lib/ledger-types";

export type { FilmAtom, FilmDot, Outcome } from "@/lib/ledger-types";

/**
 * The film ledger: every film the site tracks, as one atom with the same four coordinates everywhere —
 * when (release date), who (heroes, director), how it did (verdict, gross, budget) and how it is
 * remembered (film score). Heroes, directors and years are all views of this one list.
 */

const OUTCOME: Record<string, Outcome> = {
  blockbuster: "blockbuster",
  super_hit: "hit",
  hit: "hit",
  above_average: "average",
  average: "average",
  below_average: "average",
  flop: "flop",
  disaster: "disaster",
};

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

interface Ledger {
  films: FilmAtom[];
  bySlug: Map<string, FilmAtom>;
  byId: Map<string, FilmAtom>;
  byHero: Map<string, FilmAtom[]>;
  byDirector: Map<string, FilmAtom[]>;
}

let cached: Ledger | null = null;

export async function getLedger(): Promise<Ledger> {
  if (cached) return cached;
  const l = await load();
  const directorPages = new Set((await getDirectors()).map((d) => d.slug));
  const people = new Map(l.dataset.people.map((p) => [p.id, p]));
  const leads = new Map<string, { slug: string; name: string }[]>();
  for (const [pid, rows] of l.engine.heroFilms) {
    const p = people.get(pid);
    if (!p) continue;
    for (const r of rows) leads.set(r.filmId, [...(leads.get(r.filmId) ?? []), { slug: p.slug, name: p.displayName }]);
  }

  const films: FilmAtom[] = [];
  const twins = new Map<string, FilmAtom>();
  const byId = new Map<string, FilmAtom>();
  for (const [filmId, heroes] of leads) {
    const fm = l.engine.films.get(filmId);
    if (!fm) continue;
    const f = fm.film;
    const date = f.teluguRelease.releaseDate;
    if (!date) continue;
    const year = Number(date.slice(0, 4));
    const recent = fm.success.status === "not_yet_final";
    const ott = f.teluguRelease.route === "ott" && !fm.commercial.label;
    const fine = recent || ott ? null : (fm.commercial.verdict ?? fm.commercial.label ?? null);
    const outcome: Outcome = recent ? "recent" : ott ? "ott" : fine ? (OUTCOME[fine] ?? "unknown") : "unknown";
    const t = filmId.startsWith("f-") ? getTollyFilm(filmId.slice(2)) : null;
    const rawDir = f.details?.director?.trim() || null;
    const dslug = directorSlug(rawDir);
    const atom: FilmAtom = {
      id: filmId,
      slug: "",
      title: f.title,
      date: f.details?.dateApproximate ? null : date,
      year,
      outcome,
      verdict: fine,
      gross: fm.commercial.grossCrore,
      budget: fm.commercial.budgetCrore,
      score: t && t.status === "complete" ? t.index : null,
      heroes: [...heroes].sort((a, b) => a.name.localeCompare(b.name)),
      director: rawDir ? { slug: dslug && directorPages.has(dslug) ? dslug : null, name: rawDir } : null,
      language: f.originalLanguage,
      dubbed: f.teluguRelease.releaseType === "dubbed",
      route: f.teluguRelease.route,
    };
    // The same film can sit under two keys (one per hero's filmography): keep one atom.
    const tk = `${norm(atom.title)}|${year}`;
    const twin = twins.get(tk);
    if (twin) {
      for (const h of atom.heroes) if (!twin.heroes.some((x) => x.slug === h.slug)) twin.heroes.push(h);
      twin.heroes.sort((a, b) => a.name.localeCompare(b.name));
      twin.gross ??= atom.gross;
      twin.budget ??= atom.budget;
      twin.score ??= atom.score;
      if (twin.outcome === "unknown" && atom.outcome !== "unknown") Object.assign(twin, { outcome: atom.outcome, verdict: atom.verdict });
      byId.set(filmId, twin);
      continue;
    }
    twins.set(tk, atom);
    byId.set(filmId, atom);
    films.push(atom);
  }

  films.sort((a, b) => (a.date ?? `${a.year}-07-01`).localeCompare(b.date ?? `${b.year}-07-01`) || a.title.localeCompare(b.title));
  const bySlug = new Map<string, FilmAtom>();
  for (const f of films) {
    let s = slugify(`${f.title}-${f.year}`);
    for (let i = 2; bySlug.has(s); i++) s = slugify(`${f.title}-${f.year}-${i}`);
    f.slug = s;
    bySlug.set(s, f);
  }
  const byHero = new Map<string, FilmAtom[]>();
  const byDirector = new Map<string, FilmAtom[]>();
  for (const f of films) {
    for (const h of f.heroes) byHero.set(h.slug, [...(byHero.get(h.slug) ?? []), f]);
    if (f.director?.slug) byDirector.set(f.director.slug, [...(byDirector.get(f.director.slug) ?? []), f]);
  }
  cached = { films, bySlug, byId, byHero, byDirector };
  return cached;
}

export const isHit = (f: FilmAtom) => f.outcome === "hit" || f.outcome === "blockbuster";
export const isJudged = (f: FilmAtom) => f.outcome !== "unknown" && f.outcome !== "recent" && f.outcome !== "ott";

/** Compact film shape for client charts. */
export const toDot = (f: FilmAtom): FilmDot => ({
  s: f.slug,
  t: f.title,
  dt: f.date,
  y: f.year,
  o: f.outcome,
  g: f.gross,
  v: f.verdict,
  sc: f.score,
  d: f.director?.name ?? null,
  ds: f.director?.slug ?? null,
  h: f.heroes.map((h) => h.slug),
});

/** Longest run of consecutive hits among judged films (unjudged films are skipped, not breaking a run). */
export function longestStreak(films: FilmAtom[]): { length: number; from: FilmAtom | null; to: FilmAtom | null } {
  let best = { length: 0, from: null as FilmAtom | null, to: null as FilmAtom | null };
  let run = 0;
  let start: FilmAtom | null = null;
  for (const f of films) {
    if (!isJudged(f)) continue;
    if (isHit(f)) {
      if (run === 0) start = f;
      run++;
      if (run > best.length) best = { length: run, from: start, to: f };
    } else run = 0;
  }
  return best;
}

/** The ranked Telugu heroes, for ordering and peeks. */
export function rankedSlugs(): string[] {
  return getTollyRanking().ranked.map((h) => h.slug);
}
