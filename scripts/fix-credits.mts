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
import { classifyRole } from "@/lib/import/classify";

const dry = process.argv.includes("--dry");
const path = "lib/data/real/snapshot.json";
const snap = JSON.parse(readFileSync(path, "utf8"));
type Credit = { hero: string; film: string; year: number; role: string; notes: string; scope: string; include: boolean; excludeReason: string | null; billing?: string };
const credits: Credit[] = snap.credits;
const films = new Map<string, { starring: string[]; languages: string[]; releaseDate: string | null; year: number }>(snap.films.map((f: { key: string; starring: string[]; languages: string[]; releaseDate: string | null; year: number }) => [f.key, f]));
const norm = (t: string) => t.replace(/_/g, " ").trim();

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
  if (editorial || !(billingExcluded || (wasCameo && classifyRole(c.role, c.notes) !== "cameo"))) continue;
  // Back to the start of the eligibility checks (steps 5 and 5b of the importer).
  const date = f.releaseDate ?? `${c.year}-07-01`;
  if (date > TODAY || date < "2000-01-01" || (f.languages.length && !f.languages.some((l) => /telugu/i.test(l)))) continue;
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
applyIncludedCredits(credits);
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

// 4. One credit per hero and film: drop excluded duplicates of an included credit.
const counted = new Set(credits.filter((c) => c.include).map((c) => `${c.hero}|${c.film}`));
const kept = credits.filter((c) => c.include || !counted.has(`${c.hero}|${c.film}`));
const dropped = credits.length - kept.length;
snap.credits = kept;

console.log(`starring lists cleaned: ${cleaned}; credits now counted: ${kept.filter((c) => c.include).length}; duplicate rows dropped: ${dropped}`);
for (const l of changes.sort()) console.log(l);
if (!dry) {
  writeFileSync(path, JSON.stringify(snap, null, 1) + "\n");
  console.log("snapshot.json updated");
}
