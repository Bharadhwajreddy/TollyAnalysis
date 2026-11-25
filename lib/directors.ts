import "server-only";
import { load } from "@/lib/repositories";

/**
 * Directors: the same career analysis as heroes, built from the films the site already tracks.
 *
 * - Films: Telugu films (made in Telugu, including bilinguals) released from 2000 on, that star at least one
 *   hero we track as lead. Dubbed films of heroes from other industries are left out: they are not the
 *   director's Telugu work.
 * - A hit is a hit, super hit or blockbuster, the same rule as for heroes. Films too recent to judge, direct to
 *   OTT, or with no reported result do not count towards the hit rate.
 * - Ranking (editorial rule): hit rate first; on a tie, more films with a known result; then more hits; then
 *   the larger total reported worldwide gross. A director needs MIN_JUDGED films with a known result to be
 *   ranked, so one lucky film cannot top the table.
 */
export const MIN_JUDGED = 4;

/** The same person written two ways in film articles. Key: name as written; value: name we show. */
const ALIASES: Record<string, string> = {
  "Boyapati Sreenu": "Boyapati Srinu",
  "Sreenu Vaitla": "Srinu Vaitla",
  "Vamsi Paidipally": "Vamshi Paidipally",
  "Vamsikrishna Akella": "Vamsi Krishna Akella",
  "Anish R Krishna": "Anish R. Krishna",
  "Anudeep K. V.": "K. V. Anudeep",
  "P.A. Arun Prasad": "P. A. Arun Prasad",
  "E. Satthi Babu": "E. Satti Babu",
  "E.Satti Babu": "E. Satti Babu",
  "Mahesh Babu P.": "Mahesh Babu Pachigolla",
  "Ravi Chavali": "Ravikumar Chavali",
  "B Chinni Krishna": "Chinni Krishna",
  "A.S. Ravi Kumar Chowdary": "A. S. Ravi Kumar Chowdary",
  "Y. V. Satyanarayana. Chowdary": "Y. V. S. Chowdary",
  "Gunnam Gangaraju": "Gangaraju Gunnam",
  "Mohana Krishna Indraganti": "Mohan Krishna Indraganti",
  "Mohanakrishna Indraganti": "Mohan Krishna Indraganti",
  "Jeevitha Rajashekar": "Jeevitha Rajasekhar",
  "Jonnalagadda Srinivas": "Jonnalagadda Srinivasa Rao",
  "Kalyan Krishna": "Kalyan Krishna Kurasala",
  "Y. Kasi Viswanath": "Kasi Viswanath",
  "Pegallapati Koushik": "Koushik Pegallapati",
  "Muppalaneni Siva": "Muppalaneni Shiva",
  "G.Nageswara Reddy": "G. Nageswara Reddy",
  "Nandini Reddy": "B. V. Nandini Reddy",
  "Sai Rajesh Neelam (credited as Steven Shankar)": "Sai Rajesh Neelam",
  "Kovelamudi Raghavendra Rao": "K. Raghavendra Rao",
  "S. S. Rajamouli K. Raghavendra Rao (supervision)": "S. S. Rajamouli",
  "Parachuri Murali": "Paruchuri Murali",
  "B.V. Ramana": "B. V. Ramana",
  "Suresh Krishna": "Suresh Krissna",
  "Rudraraju Suresh Varma": "R. Suresh Varma",
  Bhaskar: "Bommarillu Bhaskar",
  "K. Rajarathnam (Tamil) R. K. Selvamani (Telugu)": "R. K. Selvamani",
};

export const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export interface DirectorFilm {
  id: string;
  title: string;
  date: string | null;
  year: number;
  /** Fine verdict (super_hit, below_average…) when reported, else the coarse label. */
  result: string | null;
  /** hit | miss | unknown (too recent, OTT or not reported). */
  outcome: "hit" | "miss" | "unknown";
  recent: boolean;
  gross: number | null;
  grossText: string | null;
  heroes: { slug: string; name: string }[];
  wiki: string | null;
}

export interface Director {
  slug: string;
  name: string;
  films: DirectorFilm[];
  judged: number;
  hits: number;
  blockbusters: number;
  hitRate: number | null;
  totalGross: number;
  grossFilms: number;
  biggest: DirectorFilm | null;
  firstYear: number;
  lastYear: number;
  heroes: { slug: string; name: string; films: number; hits: number }[];
  /** Hit rate of the latest (up to) 5 judged films. */
  recentHitRate: number | null;
  /** Median months between releases. */
  gapMonths: number | null;
  ranked: boolean;
  rank: number | null;
}

const HIT = new Set(["hit", "blockbuster"]);

/** Ranking order used everywhere: hit rate, then films with a result, then hits, then total gross, then name. */
export function compareDirectors(a: Director, b: Director) {
  return (
    (b.hitRate ?? -1) - (a.hitRate ?? -1) ||
    b.judged - a.judged ||
    b.hits - a.hits ||
    b.totalGross - a.totalGross ||
    a.name.localeCompare(b.name)
  );
}

let cached: Director[] | null = null;

export async function getDirectors(): Promise<Director[]> {
  if (cached) return cached;
  const l = await load();
  const people = new Map(l.dataset.people.map((p) => [p.id, p]));
  const leadsByFilm = new Map<string, { slug: string; name: string }[]>();
  for (const [personId, rows] of l.engine.heroFilms) {
    const p = people.get(personId);
    if (!p) continue;
    for (const r of rows) leadsByFilm.set(r.filmId, [...(leadsByFilm.get(r.filmId) ?? []), { slug: p.slug, name: p.displayName }]);
  }

  const byDirector = new Map<string, DirectorFilm[]>();
  for (const [filmId, heroes] of leadsByFilm) {
    const fm = l.engine.films.get(filmId);
    if (!fm) continue;
    const f = fm.film;
    const date = f.teluguRelease.releaseDate;
    if (!date || date < "2000-01-01" || f.status !== "released") continue;
    if (f.originalLanguage !== "te") continue; // Telugu films only (bilinguals included); no dubbed films
    const raw = f.details?.director?.trim();
    if (!raw) continue;
    const name = ALIASES[raw] ?? raw;
    const recent = fm.success.status === "not_yet_final";
    const ott = f.teluguRelease.route === "ott" && !fm.commercial.label;
    const label = recent || ott ? null : fm.commercial.label;
    const film: DirectorFilm = {
      id: filmId,
      title: f.title,
      date: f.details?.dateApproximate ? null : date,
      year: Number(date.slice(0, 4)),
      result: recent ? null : (fm.commercial.verdict ?? fm.commercial.label ?? null),
      outcome: label ? (HIT.has(label) ? "hit" : "miss") : "unknown",
      recent,
      gross: fm.commercial.grossCrore,
      grossText: f.details?.grossText ?? null,
      heroes: [...heroes].sort((a, b) => a.name.localeCompare(b.name)),
      wiki: f.details?.wikiArticle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(f.details.wikiArticle.replace(/ /g, "_"))}` : null,
    };
    // The same film can sit under two keys (one per hero's filmography, e.g. "RRR" and "RRR (film)"): count it once.
    const list = byDirector.get(name) ?? [];
    const twin = list.find((x) => x.year === film.year && x.title.toLowerCase() === film.title.toLowerCase());
    if (twin) {
      for (const h of film.heroes) if (!twin.heroes.some((x) => x.slug === h.slug)) twin.heroes.push(h);
      twin.heroes.sort((a, b) => a.name.localeCompare(b.name));
      if (twin.gross === null && film.gross !== null) Object.assign(twin, { gross: film.gross, grossText: film.grossText });
      if (twin.result === null && film.result !== null) Object.assign(twin, { result: film.result, outcome: film.outcome });
      continue;
    }
    byDirector.set(name, [...list, film]);
  }

  const out: Director[] = [...byDirector].map(([name, list]) => {
    const films = list.sort((a, b) => (a.date ?? `${a.year}-07-01`).localeCompare(b.date ?? `${b.year}-07-01`));
    const judgedFilms = films.filter((f) => f.outcome !== "unknown");
    const hits = judgedFilms.filter((f) => f.outcome === "hit").length;
    const withGross = films.filter((f) => f.gross !== null);
    const heroMap = new Map<string, { slug: string; name: string; films: number; hits: number }>();
    for (const f of films)
      for (const h of f.heroes) {
        const e = heroMap.get(h.slug) ?? { ...h, films: 0, hits: 0 };
        e.films++;
        if (f.outcome === "hit") e.hits++;
        heroMap.set(h.slug, e);
      }
    const last5 = judgedFilms.slice(-5);
    const dated = films.filter((f) => f.date).map((f) => new Date(`${f.date}T00:00:00Z`).getTime());
    const gaps = dated.slice(1).map((t, i) => (t - dated[i]) / (30.44 * 864e5)).sort((a, b) => a - b);
    const gapMonths = gaps.length ? (gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2) : null;
    return {
      slug: slugify(name),
      name,
      films,
      judged: judgedFilms.length,
      hits,
      blockbusters: films.filter((f) => f.result === "blockbuster").length,
      hitRate: judgedFilms.length ? hits / judgedFilms.length : null,
      totalGross: withGross.reduce((s, f) => s + (f.gross ?? 0), 0),
      grossFilms: withGross.length,
      biggest: [...withGross].sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0))[0] ?? null,
      firstYear: films[0].year,
      lastYear: films[films.length - 1].year,
      heroes: [...heroMap.values()].sort((a, b) => b.films - a.films || b.hits - a.hits || a.name.localeCompare(b.name)),
      recentHitRate: last5.length ? last5.filter((f) => f.outcome === "hit").length / last5.length : null,
      gapMonths,
      ranked: judgedFilms.length >= MIN_JUDGED,
      rank: null,
    };
  });

  const ranked = out.filter((d) => d.ranked).sort(compareDirectors);
  ranked.forEach((d, i) => (d.rank = i + 1));
  cached = [...ranked, ...out.filter((d) => !d.ranked).sort((a, b) => b.films.length - a.films.length || compareDirectors(a, b))];
  return cached;
}

export async function getDirector(slug: string): Promise<Director | null> {
  return (await getDirectors()).find((d) => d.slug === slug) ?? null;
}

/** Director slug for a film's director as written, so other pages can link to the director page. */
export function directorSlug(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return slugify(ALIASES[raw.trim()] ?? raw.trim());
}
