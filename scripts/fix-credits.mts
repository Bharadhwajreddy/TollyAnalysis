/**
 * Applies the lead-credit fixes to the existing snapshot (lib/data/real/snapshot.json) without
 * re-fetching Wikipedia. The same fixes are built into scripts/import-real-data.mts, so a full
 * `npm run data:import` gives the same result; this is the quick path after a rule changes.
 *
 *   1. HTML comments inside an infobox "starring" list are not cast: remove them, then recheck billing.
 *   2. "Also dubbed for X" in the notes no longer turns a lead credit into a voice-only one.
 *   3. Editorial includes (INCLUDED_CREDITS) and excludes (EXCLUDED_CREDITS) are applied.
 *   4. A film listed twice for one hero keeps only the credit that counts.
 *   5. A film from this year or later with no release date counts only if IMDb already has audience
 *      ratings for it (it is out); otherwise it is treated as not yet released.
 *   0. Box-office results checked by an editor (lib/data/tolly/verdict-overrides.json) replace the
 *      film's result, gross and budget, and can confirm or rule out a Telugu release.
 *   6. Heroes from other industries (homeLanguage in the roster): a Tamil or Malayalam film counts only
 *      with evidence of a Telugu release: a Telugu title on IMDb or a Telugu Wikipedia article.
 *
 * Usage: npx tsx scripts/fix-credits.mts [--dry]
 * Then:  npm run tolly:update -- <folder> or: tolly:link, tolly:pageviews, tolly:compute, tolly:workbook
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { applyIncludedCredits, EXCLUDED_CREDITS } from "@/lib/constants/editorial";
import { INITIAL_ROSTER } from "@/lib/constants/roster";
import { makeBilling, withoutComments } from "@/lib/import/billing";
import { classifyRole, isCountedLanguage } from "@/lib/import/classify";

const dry = process.argv.includes("--dry");
const path = "lib/data/real/snapshot.json";
const snap = JSON.parse(readFileSync(path, "utf8"));
type Credit = { hero: string; film: string; year: number; role: string; notes: string; scope: string; include: boolean; excludeReason: string | null; billing?: string };
const credits: Credit[] = snap.credits;
const films = new Map<string, { starring: string[]; languages: string[]; releaseDate: string | null; year: number }>(snap.films.map((f: { key: string; starring: string[]; languages: string[]; releaseDate: string | null; year: number }) => [f.key, f]));
const norm = (t: string) => t.replace(/_/g, " ").trim();

// 0. Editor-checked box-office results (film-verdicts.csv via scripts/tolly/import-manual.mts).
const overridesPath = "lib/data/tolly/verdict-overrides.json";
const overrides: Record<string, { result: string | null; gross: { low: number; high: number; text: string } | null; budget: { low: number; high: number; text: string } | null; urls: string[]; teluguRelease: string | null; notes: string | null; checkedOn: string | null }> =
  existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")).films : {};
let overridden = 0;
for (const f of snap.films as { key: string; verdict: unknown; gross: unknown; budget: unknown; teluguRelease?: string; languages: string[] }[]) {
  const o = overrides[f.key];
  if (!o) continue;
  if (o.result) {
    f.verdict = { verdict: o.result, sentence: `Checked against trade reports${o.checkedOn ? ` on ${o.checkedOn}` : ""}${o.notes ? `: ${o.notes}` : "."}`, source: "editor-check", url: o.urls[0] ?? null };
    overridden++;
  }
  if (o.gross) f.gross = o.gross;
  if (o.budget) f.budget = o.budget;
  if (o.teluguRelease === "dubbed") f.teluguRelease = "dubbed";
  if ((o.teluguRelease === "original" || o.teluguRelease === "bilingual") && !f.languages.some((l) => /telugu/i.test(l))) f.languages.push("Telugu");
}

// 1. Clean every film's starring list.
let cleaned = 0;
for (const f of films.values()) {
  const c = withoutComments(f.starring);
  if (c.length !== f.starring.length) cleaned++;
  f.starring = c;
}

const heroInfo = new Map<string, string>(snap.heroes.map((h: { slug: string; article: string }) => [h.slug, h.article]));
const roster = new Map(INITIAL_ROSTER.map((h) => [h.slug, h]));
const check = makeBilling(
  snap.heroes.map((h: { slug: string; name: string; article: string }) => ({ slug: h.slug, names: [h.name, ...(roster.get(h.slug)?.wiki ?? []), h.article], strict: roster.get(h.slug)?.strictBilling })),
  [...heroInfo.values()].map(norm),
);
void heroInfo;

const TODAY = new Date().toISOString().slice(0, 10);
const changes: string[] = [];
const label = (c: Credit) => `${c.hero}: ${c.film} (${c.year})`;
for (const c of credits) {
  if (c.include) continue;
  const f = films.get(c.film);
  if (!f) continue;
  const editorial = /^Editorial:/.test(c.excludeReason ?? "");
  const wasCameo = c.scope === "cameo";
  const billingExcluded = c.scope === "supporting" && /^(billed #\d+ \(supporting role\)|not listed in the film's starring credits)$/.test(c.excludeReason ?? "");
  // Hindi films now count when the hero is the lead: re-check credits dropped only for their language.
  const languageExcluded = c.scope === "lead" && (/\bfilm$/.test(c.excludeReason ?? "") || c.excludeReason === "not a Telugu film") && /\bhindi\b/i.test(`${c.excludeReason} ${c.notes}`);
  // (A Tamil version of a bilingual film stays out: its Telugu version already counts.)
  if (editorial || !(billingExcluded || languageExcluded || (wasCameo && classifyRole(c.role, c.notes) !== "cameo"))) continue;
  // Back to the start of the eligibility checks (steps 5 and 5b of the importer).
  const date = f.releaseDate ?? `${c.year}-07-01`;
  if (date > TODAY || date < "2000-01-01" || (f.languages.length && !f.languages.some((l) => isCountedLanguage(l)))) continue;
  if (!f.starring.length) continue;
  const { pos, coLead } = check(c.hero, f.starring);
  c.billing = pos < 0 ? "not in starring list" : `billed #${pos + 1}`;
  if (pos === 0 || coLead) {
    c.include = true;
    c.scope = "lead";
    c.excludeReason = null;
    changes.push(`+ ${label(c)}  [${c.billing}${wasCameo ? ", was marked a cameo" : ""}]`);
  } else {
    c.scope = "supporting";
    c.excludeReason = pos < 0 ? "not listed in the film's starring credits" : `billed #${pos + 1} (supporting role)`;
  }
}

// 3. Editorial excludes, then includes.
for (const c of credits) {
  const o = EXCLUDED_CREDITS[c.hero]?.find((x) => norm(x.film) === c.film);
  if (o && c.include) {
    c.include = false;
    c.scope = "supporting";
    c.excludeReason = `Editorial: ${o.reason}`;
    changes.push(`- ${label(c)}  [editorial exclude]`);
  }
}
const before = new Set(credits.filter((c) => c.include).map((c) => `${c.hero}|${c.film}`));
applyIncludedCredits(credits, films);
for (const c of credits) if (c.include && !before.has(`${c.hero}|${c.film}`)) changes.push(`+ ${label(c)}  [editorial include]`);

// 5. Undated films from this year on: released only if IMDb shows audience ratings for the hero's matching title.
const thisYear = new Date().getUTCFullYear();
const undated = credits.filter((c) => c.include && c.year >= thisYear && !films.get(c.film)?.releaseDate);
if (undated.length) {
  const castPath = ".cache/tolly/imdb-cast.json";
  const imdbDir = ".cache/tolly/imdb";
  const released = new Set<string>(); // hero|squashed title
  if (existsSync(castPath) && existsSync(`${imdbDir}/title.basics.tsv.gz`) && existsSync(`${imdbDir}/title.ratings.tsv.gz`)) {
    const cast = JSON.parse(readFileSync(castPath, "utf8")).heroes as Record<string, { tconst: string; ordering: number }[]>;
    const heroesOf = new Map<string, string[]>();
    for (const [h, rows] of Object.entries(cast)) for (const r of rows) heroesOf.set(r.tconst, [...(heroesOf.get(r.tconst) ?? []), h]);
    const lines = (f: string) => createInterface({ input: createReadStream(`${imdbDir}/${f}`).pipe(createGunzip()) });
    const rated = new Set<string>();
    for await (const line of lines("title.ratings.tsv.gz")) {
      const [t, , votes] = line.split("\t");
      if (heroesOf.has(t) && Number(votes) > 0) rated.add(t);
    }
    const sq = (x: string) => x.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");
    for await (const line of lines("title.basics.tsv.gz")) {
      const p = line.split("\t");
      if (!rated.has(p[0]) || Number(p[5]) < thisYear - 1) continue;
      for (const h of heroesOf.get(p[0]) ?? []) for (const t of [p[2], p[3]]) released.add(`${h}|${sq(t)}`);
    }
    const titleOf = (c: Credit) => sq(c.film.startsWith("unlinked:") ? c.film.slice(9).split("|")[0] : c.film);
    for (const c of undated) {
      if (released.has(`${c.hero}|${titleOf(c)}`)) continue;
      c.include = false;
      c.excludeReason = "not yet released (no release date yet)";
      changes.push(`- ${label(c)}  [no release date and no IMDb ratings yet]`);
    }
  } else console.log("IMDb cache missing: undated films left as they are (run npm run tolly:all first)");
}

// 6. Other-industry heroes: keep a home-language film only when it was released in Telugu.
{
  const cast = existsSync(".cache/tolly/imdb-cast.json") ? JSON.parse(readFileSync(".cache/tolly/imdb-cast.json", "utf8")) : {};
  const teluguTitles = new Set<string>(cast.teluguTitles ?? []);
  const wd = existsSync(".cache/tolly/wikidata.json") ? JSON.parse(readFileSync(".cache/tolly/wikidata.json", "utf8")) : { films: {} };
  const teArticle = (qid: string | null) => !!(qid && wd.films?.[qid]?.te);
  const home = new Map(INITIAL_ROSTER.filter((h) => h.homeLanguage).map((h) => [h.slug, h.homeLanguage as string]));
  const raw = new Map<string, { imdbId: string | null; qid: string | null; teluguRelease?: string }>(snap.films.map((f: { key: string; imdbId: string | null; qid: string | null }) => [f.key, f]));
  if (!cast.teluguTitles) console.log("IMDb Telugu titles not downloaded yet (run npm run tolly:cast): other-industry films checked on Telugu Wikipedia only");
  for (const c of credits) {
    if (!home.has(c.hero) || !c.include) continue;
    const f = films.get(c.film);
    const r = raw.get(c.film);
    if (!f || !r || f.languages.some((l) => isCountedLanguage(l))) continue; // Telugu, bilingual or Hindi: counts as it is
    if (overrides[c.film]?.teluguRelease === "none") {
      c.include = false;
      c.excludeReason = "no Telugu release (checked)";
      changes.push(`- ${label(c)}  [checked: no Telugu release]`);
      continue;
    }
    if (r.teluguRelease === "dubbed" || (r.imdbId && teluguTitles.has(r.imdbId)) || teArticle(r.qid)) {
      r.teluguRelease = "dubbed";
      continue;
    }
    c.include = false;
    c.excludeReason = "no Telugu release found";
    changes.push(`- ${label(c)}  [no Telugu release found]`);
  }
}

// 4. One credit per hero and film: drop excluded duplicates of an included credit.
// A film listed twice in one filmography (two rows) must count once: keep the first counted row.
const counted = new Set(credits.filter((c) => c.include).map((c) => `${c.hero}|${c.film}`));
const seen = new Set<string>();
const kept = credits.filter((c) => {
  const k = `${c.hero}|${c.film}`;
  if (!c.include) return !counted.has(k);
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
const dropped = credits.length - kept.length;
snap.credits = kept;

// Save first, so a closed output pipe (e.g. piping into head) can never lose the result.
if (!dry) writeFileSync(path, JSON.stringify(snap, null, 1) + "\n");
console.log(`editor-checked box-office results: ${overridden}; starring lists cleaned: ${cleaned}; credits now counted: ${kept.filter((c) => c.include).length}; duplicate rows dropped: ${dropped}${dry ? " (dry run)" : "; snapshot.json updated"}`);
for (const l of changes.sort()) console.log(l);
