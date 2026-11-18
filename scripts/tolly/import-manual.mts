/**
 * Tolly Index — imports the two files filled in by hand or in the Claude desktop app
 * (docs/data-entry/PROMPT.md) and checks every row before anything is used.
 *
 *   hero-social.csv       → lib/data/real/hero-followers.json   (official follower counts, dated; public facts)
 *   hero-social*.csv      → (several files allowed, e.g. hero-social-new-heroes.csv; merged by hero_id)
 *   films-to-look-up.csv  → lib/data/tolly/manual-links.json    (IMDb ids found by an editor; ids only)
 *   film-verdicts.csv     → lib/data/tolly/verdict-overrides.json (box-office results checked against trade
 *                           reports, with source links; applied by scripts/fix-credits.mts)
 *                         → .cache/tolly/manual-letterboxd.json  (Letterboxd ratings: kept out of the public repo)
 * The filled files themselves are copied to data-private/ (gitignored, included in tolly:snapshot).
 *
 * Usage: npx tsx scripts/tolly/import-manual.mts <folder with the two filled CSV files>
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: import-manual.mts <folder with hero-social.csv and films-to-look-up.csv>");
  process.exit(1);
}

/** Minimal RFC 4180 CSV reader (quoted fields, doubled quotes, commas and newlines inside quotes). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim().replace(/^﻿/, ""), (r[i] ?? "").trim()])));
}

/** "28.4M" → 28400000, "1.2K" → 1200, "12,345" → 12345; null when it is not a count. */
function parseCount(s: string): number | null {
  const m = s.replace(/,/g, "").trim().match(/^(\d+(?:\.\d+)?)\s*([kmb]|lakh|lakhs|crore|cr)?$/i);
  if (!m) return null;
  const mult: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, lakh: 1e5, lakhs: 1e5, crore: 1e7, cr: 1e7 };
  return Math.round(Number(m[1]) * (m[2] ? mult[m[2].toLowerCase()] : 1));
}

/** Half the last digit of a display like "28.4M". Profiles round or cut off, so a full digit is allowed. */
function toleranceOf(shown: string): number {
  const m = shown.replace(/,/g, "").trim().match(/^\d+(?:\.(\d+))?\s*([kmb]|lakh|lakhs|crore|cr)?$/i);
  if (!m) return 0;
  const mult: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, lakh: 1e5, lakhs: 1e5, crore: 1e7, cr: 1e7 };
  return 0.5 * 10 ** -(m[1]?.length ?? 0) * (m[2] ? mult[m[2].toLowerCase()] : 1);
}

const problems: string[] = [];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const known = new Set((snap.heroes as { slug: string }[]).map((h) => h.slug));
const facts = JSON.parse(readFileSync("lib/data/real/hero-facts.json", "utf8")).heroes as Record<string, { deathDate?: string }>;

// ── Heroes ──
const heroFiles = (existsSync(dir) ? readdirSync(dir) : []).filter((f) => /^hero-social.*\.csv$/.test(f)).map((f) => join(dir, f));
type Count = { platform: "instagram" | "x" | "youtube" | "facebook"; followers: number; date: string; url: string | null };
const heroes: Record<string, { counts: Count[]; noAccount: boolean; usernames: { instagram: string | null; x: string | null }; notes: string | null }> = {};
if (heroFiles.length) {
  for (const r of heroFiles.flatMap((f) => parseCsv(readFileSync(f, "utf8")))) {
    const slug = r.hero_id;
    if (!known.has(slug)) {
      problems.push(`hero-social: unknown hero_id "${slug}"`);
      continue;
    }
    const date = r.checked_on;
    const counts: Count[] = [];
    const take = (platform: Count["platform"], n: string, shown: string | undefined, url: string | null) => {
      if (!n && !shown) return;
      const a = n ? parseCount(n) : null;
      const b = shown ? parseCount(shown) : null;
      const value = a ?? b;
      if (value === null) return problems.push(`${slug}: ${platform} count "${n || shown}" is not a number`);
      if (a !== null && b !== null && Math.abs(a - b) > 2 * toleranceOf(shown as string) + 0.01 * a) problems.push(`${slug}: ${platform} ${a} does not match "${shown}" (kept ${a})`);
      if (!isDate(date)) return problems.push(`${slug}: ${platform} count has no checked_on date (YYYY-MM-DD); not used`);
      counts.push({ platform, followers: value, date, url });
    };
    if (r.instagram_verified && !/^y/i.test(r.instagram_verified) && (r.instagram_followers || r.instagram_followers_as_shown)) {
      problems.push(`${slug}: Instagram account is not verified; not used`);
    } else take("instagram", r.instagram_followers, r.instagram_followers_as_shown, r.instagram_username ? `https://www.instagram.com/${r.instagram_username}/` : null);
    // An account the editor could not confirm is the hero's own is never used.
    if (/\bX: uncertain/i.test(r.notes ?? "") && (r.x_followers || r.x_followers_as_shown)) problems.push(`${slug}: X account is marked uncertain; not used`);
    else take("x", r.x_followers, r.x_followers_as_shown, r.x_username ? `https://x.com/${r.x_username}` : null);
    take("youtube", r.youtube_subscribers, undefined, r.youtube_channel_url || null);
    take("facebook", r.facebook_followers, undefined, r.facebook_page_url || null);
    // Fame uses Instagram and X only (the two checked for every hero), so "no account" means neither.
    const noAccount = !counts.some((c) => c.platform === "instagram" || c.platform === "x") && (/no (official |verified )?account|not on (instagram|x|social)/i.test(r.notes ?? "") || !!facts[slug]?.deathDate);
    heroes[slug] = { counts, noAccount, usernames: { instagram: r.instagram_username || null, x: r.x_username || null }, notes: r.notes || null };
  }
  // Merge: heroes not in these files keep their earlier checked counts.
  const earlier = existsSync("lib/data/real/hero-followers.json") ? JSON.parse(readFileSync("lib/data/real/hero-followers.json", "utf8")).heroes : {};
  const merged = { ...earlier, ...heroes };
  writeFileSync(
    "lib/data/real/hero-followers.json",
    JSON.stringify({ source: "Official profiles, checked by an editor on the dates given", heroes: Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]])) }, null, 1) + "\n",
  );
}

// ── Films ──
const filmFile = join(dir, "films-to-look-up.csv");
const films = new Set((JSON.parse(readFileSync("lib/data/tolly/films.json", "utf8")).films as { key: string }[]).map((f) => f.key));
const links: Record<string, { imdb: string; checkedOn: string | null }> = {};
const letterboxd: Record<string, { url: string; avg: number; count: number; checkedOn: string | null }> = {};
if (existsSync(filmFile)) {
  for (const r of parseCsv(readFileSync(filmFile, "utf8"))) {
    const key = r.film_key;
    if (!films.has(key)) {
      problems.push(`films: unknown film_key "${key}"`);
      continue;
    }
    if (r.imdb_id_found) {
      if (/^tt\d{6,9}$/.test(r.imdb_id_found)) links[key] = { imdb: r.imdb_id_found, checkedOn: r.checked_on || null };
      else problems.push(`${key}: "${r.imdb_id_found}" is not an IMDb id (tt…)`);
    }
    if (r.letterboxd_avg_rating_out_of_5 || r.letterboxd_ratings_count) {
      const avg = Number(r.letterboxd_avg_rating_out_of_5);
      const count = parseCount(r.letterboxd_ratings_count);
      if (!(avg >= 0.5 && avg <= 5)) problems.push(`${key}: Letterboxd average "${r.letterboxd_avg_rating_out_of_5}" is not between 0.5 and 5`);
      else if (count === null) problems.push(`${key}: Letterboxd count "${r.letterboxd_ratings_count}" is not a number`);
      else letterboxd[key] = { url: r.letterboxd_url, avg, count, checkedOn: r.checked_on || null };
    }
  }
  writeFileSync("lib/data/tolly/manual-links.json", JSON.stringify({ source: "IMDb ids found by an editor", films: links }, null, 1) + "\n");
  mkdirSync(".cache/tolly", { recursive: true });
  writeFileSync(".cache/tolly/manual-letterboxd.json", JSON.stringify(letterboxd, null, 1));
}

// ── Box-office results checked against trade reports ──
const verdictFile = join(dir, "film-verdicts.csv");
const RESULTS = ["blockbuster", "super_hit", "hit", "above_average", "average", "below_average", "flop", "disaster"];
let verdictsImported = 0;
if (existsSync(verdictFile)) {
  const snapFilms = new Set((snap.films as { key: string }[]).map((f) => f.key));
  const path = "lib/data/tolly/verdict-overrides.json";
  const out: Record<string, unknown> = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")).films : {};
  const crore = (s: string) => {
    const m = s.replace(/[,₹\s]|crores?|cr/gi, "").match(/^(\d+(?:\.\d+)?)(?:[-–](\d+(?:\.\d+)?))?$/);
    return m ? { low: Number(m[1]), high: Number(m[2] ?? m[1]), text: `₹${s.replace(/[₹]|crores?|cr/gi, "").trim()} crore` } : null;
  };
  for (const r of parseCsv(readFileSync(verdictFile, "utf8"))) {
    const key = r.film_key;
    if (!snapFilms.has(key)) {
      problems.push(`film-verdicts: unknown film_key "${key}"`);
      continue;
    }
    const result = (r.verified_result || "").toLowerCase().replace(/[\s-]+/g, "_");
    const release = (r.telugu_release || "").toLowerCase();
    if (!result && !release) continue;
    if (result && !RESULTS.includes(result)) {
      problems.push(`${key}: result "${r.verified_result}" is not one of ${RESULTS.join(", ")}`);
      continue;
    }
    const urls = [r.source_url_1, r.source_url_2].filter((u) => /^https?:\/\//.test(u || ""));
    if (result && !urls.length) {
      problems.push(`${key}: a result needs at least one source link; not used`);
      continue;
    }
    if (release && !["original", "bilingual", "dubbed", "none"].includes(release)) problems.push(`${key}: telugu_release "${r.telugu_release}" should be original, bilingual, dubbed or none`);
    const gross = r.worldwide_gross_crore ? crore(r.worldwide_gross_crore) : null;
    const budget = r.budget_crore ? crore(r.budget_crore) : null;
    if (r.worldwide_gross_crore && !gross) problems.push(`${key}: gross "${r.worldwide_gross_crore}" is not a number of crore`);
    out[key] = { result: result || null, gross, budget, urls, teluguRelease: release || null, checkedOn: r.checked_on || null, notes: r.notes || null };
    verdictsImported++;
  }
  writeFileSync(path, JSON.stringify({ source: "Box-office results checked by an editor against trade reports (links per film)", films: out }, null, 1) + "\n");
}

mkdirSync("data-private", { recursive: true });
for (const f of [...heroFiles, filmFile, verdictFile]) if (existsSync(f)) copyFileSync(f, join("data-private", f.split("/").pop() as string));

const withCounts = Object.values(heroes).filter((h) => h.counts.length).length;
console.log(`heroes: ${Object.keys(heroes).length} rows, ${withCounts} with a follower count, ${Object.values(heroes).filter((h) => h.noAccount).length} with no account`);
console.log(`films: ${Object.keys(links).length} IMDb ids found, ${Object.keys(letterboxd).length} Letterboxd ratings; box-office results imported: ${verdictsImported}`);
if (problems.length) {
  console.log(`\n${problems.length} rows need a look (they were left out, nothing was guessed):`);
  for (const p of problems) console.log(`  - ${p}`);
}
