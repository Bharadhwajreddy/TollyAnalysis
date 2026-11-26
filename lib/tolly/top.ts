/**
 * The home page's film lists. Both keep to films made in Telugu (not dubbed releases or Hindi films),
 * so a Tamil OTT hit cannot top a Telugu cinema list.
 * Server-only: reads the snapshot and the Tolly results.
 */
import snapshot from "@/lib/data/real/snapshot.json";
import { getTopTollyFilms } from "@/lib/tolly/view";

type SnapFilm = { key: string; title: string; year: number | null; languages: string[]; teluguRelease?: string; gross: { low: number; text: string } | null; verdict: { verdict: string } | null };
type SnapCredit = { hero: string; film: string; include: boolean };

const films = snapshot.films as unknown as SnapFilm[];
const byKey = new Map(films.map((f) => [f.key, f]));
const madeInTelugu = (f: SnapFilm | undefined) => !!f && f.teluguRelease !== "dubbed" && f.languages.some((l) => /telugu/i.test(l));
const leads = new Map<string, string[]>();
for (const c of snapshot.credits as SnapCredit[]) if (c.include) leads.set(c.film, [...(leads.get(c.film) ?? []), c.hero]);

/** Best-loved films made in Telugu, by film score. */
export function topLovedTeluguFilms(n: number) {
  return getTopTollyFilms(400).filter((f) => madeInTelugu(byKey.get(f.key))).slice(0, n);
}

/** Biggest films made in Telugu by reported worldwide gross (lower figure of a range), one row per title. */
export function topGrossingTeluguFilms(n: number) {
  // One row per title: a film listed under two article names keeps every lead hero.
  const rows = new Map<string, { key: string; title: string; year: number; gross: number; result: string | null; heroes: string[] }>();
  for (const f of films) {
    if (!leads.has(f.key) || !f.gross || !madeInTelugu(f)) continue;
    const id = `${f.title.toLowerCase()}|${f.year}`;
    const row = rows.get(id) ?? { key: f.key, title: f.title, year: f.year as number, gross: f.gross.low, result: f.verdict?.verdict ?? null, heroes: [] };
    row.gross = Math.max(row.gross, f.gross.low);
    row.heroes = [...new Set([...row.heroes, ...(leads.get(f.key) ?? [])])];
    rows.set(id, row);
  }
  return [...rows.values()].sort((a, b) => b.gross - a.gross).slice(0, n);
}
