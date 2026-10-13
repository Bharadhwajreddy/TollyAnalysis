/**
 * Tolly Index — links every counted film across Wikipedia, Wikidata and IMDb and records where
 * each field came from. Films without a Wikipedia article are found through the hero's cast lists
 * on Wikidata and IMDb (same hero, release year ±1, matching title), never by title alone.
 *
 * Needs: .cache/tolly/wikidata.json, .cache/tolly/imdb-cast.json, .cache/tolly/imdb/*.tsv.gz
 * Output: .cache/tolly/films-linked.json, .cache/tolly/heroes-profile.json
 * Usage: npx tsx scripts/tolly/link-films.mts
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { titleKey, titlesLooselyMatch, titlesMatch } from "@/lib/tolly/match";

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const snap = read("lib/data/real/snapshot.json");
const wd = read(".cache/tolly/wikidata.json");
const cast: {
  heroes: Record<string, { tconst: string; ordering: number; category: string }[]>;
  akas: Record<string, string[]>;
} = read(".cache/tolly/imdb-cast.json");
const pages: Record<string, string> = read(".cache/import/pages.json");
const ours: Record<string, { tconst: string; matchedBy: string }> = existsSync(".cache/tolly/imdb-ours.json") ? read(".cache/tolly/imdb-ours.json") : {};
const teTitles: Record<string, string> = existsSync(".cache/import/tewiki-titles.json") ? read(".cache/import/tewiki-titles.json") : {};

async function* rows(file: string) {
  const rl = createInterface({
    input: createReadStream(`.cache/tolly/imdb/${file}`).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let header = true;
  for await (const line of rl) {
    if (header) {
      header = false;
      continue;
    }
    yield line.split("\t");
  }
}

// ── IMDb titles we may need: every title our heroes appear in, plus ids already known.
interface ImdbTitle {
  tconst: string;
  type: string;
  titles: string[];
  year: number | null;
  runtime: number | null;
  genres: string[];
  rating: number | null;
  votes: number;
}
const wanted = new Set<string>(Object.values(cast.heroes).flatMap((r) => r.map((x) => x.tconst)));
for (const f of Object.values(wd.films) as { imdb: string[] }[]) for (const t of f.imdb) wanted.add(t);
for (const f of snap.films) if (f.imdbId) wanted.add(f.imdbId);
for (const v of Object.values(ours)) wanted.add(v.tconst);
const imdb = new Map<string, ImdbTitle>();
for await (const [tconst, type, primary, original, , start, , runtime, genres] of rows("title.basics.tsv.gz")) {
  if (!wanted.has(tconst)) continue;
  imdb.set(tconst, {
    tconst,
    type,
    titles: [...new Set([primary, original, ...(cast.akas[tconst] ?? [])])],
    year: Number(start) || null,
    runtime: Number(runtime) || null,
    genres: genres === "\\N" ? [] : genres.split(","),
    rating: null,
    votes: 0,
  });
}
for await (const [tconst, avg, votes] of rows("title.ratings.tsv.gz")) {
  const t = imdb.get(tconst);
  if (t) Object.assign(t, { rating: Number(avg), votes: Number(votes) });
}
console.log(`IMDb titles loaded: ${imdb.size}`);

// ── Wikidata films and reverse indexes.
interface WdFilm {
  qid: string;
  label: string | null;
  cast: string[];
  dates: string[];
  languages: string[];
  imdb: string[];
  en: string | null;
  te: string | null;
  sitelinks: number;
}
const wdFilms: Record<string, WdFilm> = wd.films;
const qidByTconst = new Map<string, string>();
const qidByEn = new Map<string, string>();
for (const f of Object.values(wdFilms)) {
  for (const t of f.imdb) qidByTconst.set(t, f.qid);
  if (f.en) qidByEn.set(f.en, f.qid);
}

const heroBySlug = new Map<string, { slug: string; qid: string; name: string }>(
  snap.heroes.map((h: { slug: string; qid: string; name: string }) => [h.slug, h]),
);
const counted = snap.credits.filter((c: { include: boolean }) => c.include) as {
  hero: string;
  film: string;
  billing?: string;
  language: string;
}[];
const creditsByFilm = new Map<string, typeof counted>();
for (const c of counted) creditsByFilm.set(c.film, [...(creditsByFilm.get(c.film) ?? []), c]);

type By = "wikipedia" | "wikidata" | "imdb" | "filmography" | "telugu-wikipedia" | null;
export interface LinkedFilm {
  key: string;
  title: string;
  heroes: string[];
  year: number;
  yearSources: {
    filmography: number;
    wikidata: number | null;
    imdb: number | null;
  };
  releaseDate: string | null;
  releaseDateBy: By;
  telugu: boolean | null;
  languageBy: By;
  qid: string | null;
  qidBy: string | null;
  tconst: string | null;
  tconstBy: string | null;
  imdbType: string | null;
  imdbRating: number | null;
  imdbVotes: number;
  imdbBilling: Record<string, number | null>;
  runtimeMin: number | null;
  genres: string[];
  en: string | null;
  te: string | null;
  sitelinks: number | null;
  wikipediaBilling: Record<string, string | null>;
}

const infoboxDate = (wikitext: string | undefined): string | null => {
  if (!wikitext) return null;
  const m = wikitext.match(/\|\s*released\s*=[^\n]*?(?:\{\{\s*film date\s*\|[^|]*?\|?\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2}))/i);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
};

const out: LinkedFilm[] = [];
const stats = {
  films: 0,
  qidFromCast: 0,
  qidFromImdb: 0,
  tconstFromWikidata: 0,
  tconstFromCast: 0,
  tconstAmbiguous: 0,
  tconstFromTitleYear: 0,
};
for (const f of snap.films) {
  const credits = creditsByFilm.get(f.key);
  if (!credits) continue;
  stats.films++;
  const heroes = [...new Set(credits.map((c) => c.hero))];
  const heroQids = heroes.map((h) => heroBySlug.get(h)!.qid);

  // Wikidata item: as imported, else by English article, else a film listing the hero as cast.
  let qid: string | null = f.qid ?? (f.article ? (qidByEn.get(f.article) ?? null) : null);
  let qidBy: string | null = qid ? "wikipedia" : null;
  if (!qid) {
    const hits = Object.values(wdFilms).filter(
      (w) =>
        w.cast.some((c) => heroQids.includes(c)) &&
        w.dates.some((d) => Math.abs(Number(d.slice(0, 4)) - f.year) <= 1) &&
        w.label &&
        titlesMatch(w.label, f.title),
    );
    if (hits.length === 1) {
      qid = hits[0].qid;
      qidBy = "wikidata cast list";
      stats.qidFromCast++;
    }
  }

  // IMDb title: as imported, else Wikidata's IMDb id, else one of the hero's own IMDb titles.
  let tconst: string | null = f.imdbId ?? null;
  let tconstBy: string | null = tconst ? "wikidata" : null;
  const w = qid ? wdFilms[qid] : null;
  // Wikidata sometimes lists several IMDb ids (dubbed versions); keep the one released in our year with most votes.
  const wdIds = (w?.imdb ?? []).filter((t) => {
    const y = imdb.get(t)?.year;
    return y != null && Math.abs(y - f.year) <= 1;
  });
  if (!tconst && wdIds.length) {
    tconst = wdIds.sort((a, b) => (imdb.get(b)?.votes ?? 0) - (imdb.get(a)?.votes ?? 0))[0];
    tconstBy = "wikidata";
    stats.tconstFromWikidata++;
  }
  if (!tconst) {
    const mine = new Set(heroes.flatMap((h) => (cast.heroes[h] ?? []).map((r) => r.tconst)));
    const candidates = [...mine]
      .map((t) => imdb.get(t))
      .filter((t): t is ImdbTitle => !!t && (t.type === "movie" || t.type === "tvMovie") && t.year !== null && Math.abs(t.year - f.year) <= 1);
    // Strict title match first; the looser one (subtitles, two slips) only when strict finds nothing.
    let hits = candidates.filter((t) => t.titles.some((x) => titlesMatch(x, f.title)));
    let how = "imdb cast list";
    if (!hits.length) {
      hits = candidates.filter((t) => t.titles.some((x) => titlesLooselyMatch(x, f.title)));
      how = "imdb cast list (close title)";
    }
    if (hits.length === 1) {
      tconst = hits[0].tconst;
      tconstBy = how;
      stats.tconstFromCast++;
    } else if (hits.length > 1) stats.tconstAmbiguous++;
  }
  // Last resort: the only movie in all of IMDb with this title and year (matched by imdb-ratings.mts).
  if (!tconst && ours[f.key]?.matchedBy === "title-year") {
    tconst = ours[f.key].tconst;
    tconstBy = "unique imdb title and year";
    stats.tconstFromTitleYear++;
  }
  if (!qid && tconst && qidByTconst.has(tconst)) {
    qid = qidByTconst.get(tconst)!;
    qidBy = "imdb id on wikidata";
    stats.qidFromImdb++;
  }
  const wf = qid ? wdFilms[qid] : null;
  const it = tconst ? imdb.get(tconst) : undefined;

  // Release date: Wikipedia infobox as imported, else Wikidata (a date in the filmography year).
  let releaseDate: string | null = f.releaseDate && !f.dateApproximate ? f.releaseDate : null;
  let releaseDateBy: By = releaseDate ? "wikipedia" : null;
  if (!releaseDate) {
    const d = wf?.dates.filter((x) => /^\d{4}-\d\d-\d\d$/.test(x) && !x.endsWith("-01-01") && Math.abs(Number(x.slice(0, 4)) - f.year) <= 1).sort()[0];
    if (d) {
      releaseDate = d;
      releaseDateBy = "wikidata";
    }
  }
  if (!releaseDate) {
    const d = infoboxDate(wf?.en ? pages[wf.en] : undefined);
    if (d) {
      releaseDate = d;
      releaseDateBy = "wikipedia";
    }
  }

  // Original language: Wikipedia infobox, else Wikidata, else the hero's filmography (Telugu unless noted).
  let telugu: boolean | null = f.languages?.length ? f.languages.includes("Telugu") : null;
  let languageBy: By = telugu === null ? null : "wikipedia";
  if (telugu === null && wf?.languages.length) {
    telugu = wf.languages.includes("Telugu");
    languageBy = "wikidata";
  }
  if (telugu === null && credits.every((c) => !c.language || /telugu/i.test(c.language))) {
    telugu = true;
    languageBy = "filmography";
  }

  const wdYears = (wf?.dates ?? []).map((d) => Number(d.slice(0, 4)));
  const imdbBilling: Record<string, number | null> = {};
  for (const h of heroes) imdbBilling[h] = tconst ? ((cast.heroes[h] ?? []).find((r) => r.tconst === tconst)?.ordering ?? null) : null;
  out.push({
    key: f.key,
    title: f.title,
    heroes,
    year: f.year,
    yearSources: {
      filmography: f.year,
      wikidata: wdYears.length ? wdYears.reduce((a, y) => (Math.abs(y - f.year) < Math.abs(a - f.year) ? y : a)) : null,
      imdb: it?.year ?? null,
    },
    releaseDate,
    releaseDateBy,
    telugu,
    languageBy,
    qid,
    qidBy,
    tconst,
    tconstBy,
    imdbType: it?.type ?? null,
    imdbRating: it?.rating ?? null,
    imdbVotes: it?.votes ?? 0,
    imdbBilling,
    runtimeMin: f.runtimeMin ?? it?.runtime ?? null,
    genres: f.genres?.length ? f.genres : (it?.genres ?? []),
    en: f.article ?? wf?.en ?? null,
    te: (f.qid && teTitles[f.qid]) || wf?.te || null,
    sitelinks: wf ? wf.sitelinks : null,
    wikipediaBilling: Object.fromEntries(credits.map((c) => [c.hero, c.billing ?? null])),
  });
}
writeFileSync(".cache/tolly/films-linked.json", JSON.stringify(out));
console.log(stats);
console.log(`unique title keys: ${new Set(out.map((f) => titleKey(f.title))).size}`);

// ── Heroes: profile fields with the source of each.
const birthFromInfobox = (wikitext: string | undefined) => {
  const m = wikitext?.match(/\|\s*birth_date\s*=\s*\{\{\s*birth date(?: and age)?\s*\|(?:\s*df\s*=\s*\w+\s*\|)?\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
};
const profiles = snap.heroes.map(
  (h: { slug: string; qid: string; article: string; birthDate: string | null; debutYear: number | null; image: string | null }) => {
    const d = wd.heroes[h.qid] ?? {};
    const firstCredit = Math.min(...snap.credits.filter((c: { hero: string }) => c.hero === h.slug).map((c: { year: number }) => c.year));
    const birthWiki = birthFromInfobox(pages[h.article]);
    return {
      slug: h.slug,
      imdb: d.imdb ?? [],
      birthDate: h.birthDate ?? d.birth ?? birthWiki,
      birthDateBy: h.birthDate || d.birth ? "wikidata" : birthWiki ? "wikipedia" : null,
      debutYear: h.debutYear ?? (d.careerStart ? Number(d.careerStart) : Number.isFinite(firstCredit) ? firstCredit : null),
      debutYearBy: h.debutYear ? "wikidata" : d.careerStart ? "wikidata" : Number.isFinite(firstCredit) ? "filmography" : null,
      hasFreePhoto: !!(h.image ?? d.image),
    };
  },
);
writeFileSync(".cache/tolly/heroes-profile.json", JSON.stringify(profiles, null, 1));
