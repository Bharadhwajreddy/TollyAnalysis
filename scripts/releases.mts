/**
 * Telugu releases, year by year: every Telugu film (in theatres or direct to OTT) and the films dubbed into
 * Telugu that we know of, from 2000 on. Feeds the Releases page (lib/data/releases/releases.json).
 *
 * Sources, merged in this order (a later source fills gaps, never duplicates a film):
 *   1. Wikipedia "List of Telugu films of <year>" (CC BY-SA): title, release date, director, cast. A film is
 *      marked direct-to-OTT when its row says so (OTT / streaming premiere, or a streaming service's name).
 *   2. Our own film data (lib/data/real/snapshot.json): Telugu films the lists miss, and Tamil, Malayalam,
 *      Kannada or Hindi films with a confirmed Telugu release (dubbed).
 *   3. lib/data/releases/manual.csv: films added or corrected by hand each week (dubbed releases the
 *      sources above miss, new OTT premieres, fixes). A manual row with the same title and year wins.
 *
 * Usage: npx tsx scripts/releases.mts            (all years; re-downloads only the current year's page)
 *        npx tsx scripts/releases.mts --refresh  (re-download every year)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseCsv } from "@/lib/csv";
import { editDistance } from "@/lib/import/billing";
import { firstLink, parseWikitables, plainText } from "@/lib/import/wikitext";

const UA = `TollywoodAnalysis/0.2 (research project; https://github.com/Bharadhwajreddy/TollyAnalysis${process.env.TOLLY_CONTACT ? `; ${process.env.TOLLY_CONTACT}` : ""})`;
const CACHE = ".cache/releases";
const OUT = "lib/data/releases/releases.json";
const MANUAL = "lib/data/releases/manual.csv";
const TODAY = new Date().toISOString().slice(0, 10);
const THIS_YEAR = Number(TODAY.slice(0, 4));
const FIRST_YEAR = 2000;
mkdirSync(CACHE, { recursive: true });

type Kind = "theatrical" | "ott" | "dubbed";
export interface Release {
  title: string;
  date: string | null;
  year: number;
  kind: Kind;
  /** Original language for dubbed films. */
  language: string | null;
  director: string | null;
  cast: string[];
  wiki: string | null;
  source: "wikipedia-list" | "film-data" | "manual";
}

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function listPage(year: number, refresh: boolean): Promise<string | null> {
  const file = `${CACHE}/${year}.wiki`;
  if (existsSync(file) && !refresh && year < THIS_YEAR) return readFileSync(file, "utf8");
  const body = new URLSearchParams({ pages: `List of Telugu films of ${year}`, curonly: "1", action: "submit" });
  for (let i = 0; i < 6; i++) {
    const res = await fetch("https://en.wikipedia.org/w/index.php?title=Special:Export", { method: "POST", body, headers: { "user-agent": UA } });
    if (res.ok) {
      const m = /<text[^>]*>([\s\S]*?)<\/text>/.exec(await res.text());
      if (!m) return null;
      const text = decode(m[1]);
      writeFileSync(file, text);
      return text;
    }
    await sleep(4000 * 2 ** i);
  }
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const monthOf = (cell: string) => {
  const letters = plainText(cell).replace(/[^A-Za-z]/g, "").toUpperCase();
  const i = MONTHS.findIndex((m) => letters.startsWith(m));
  return i < 0 ? null : i + 1;
};
// Direct-to-OTT only on explicit wording in the row's references. Not enough on its own: a streaming service
// among the producers (ETV Win co-produced Little Hearts, a theatrical hit), or "OTT release" news, which is
// usually about the streaming date after a theatrical run.
const SERVICES = "Aha|'Aha'|Netflix|Amazon Prime(?: Video)?|Prime Video|ZEE5|Zee5|Disney\\+ ?Hotstar|Hotstar|SonyLIV|Sony LIV|ETV Win|JioCinema|JioHotstar";
const OTT = new RegExp(
  `direct[- ]to[- ](?:OTT|digital|streaming)|direct (?:OTT|digital|streaming)|skip(?:s|ped|ping)? (?:a |the )?theatrical|(?:premiere|release)s? directly on|(?:to|will) (?:premiere|release) on (?:${SERVICES})|premieres? on (?:${SERVICES})`,
  "i",
);
/** Wording that says the film was in theatres: overrides any OTT hint in the same row. */
const THEATRES = /\b(?:theatres|theaters|theatrical(?! rights)|big screens?|in cinemas|box office)\b/i;
const castOf = (cell: string) =>
  plainText(cell.replace(/\{\{\s*(?:hlist|ubl|unbulleted list|plainlist)\s*\|([^}]*)\}\}/gi, (_, x: string) => x.split("|").filter((p) => !/=/.test(p)).join(", ")))
    .split(/\s*,\s*|\s*\n\s*|\*\s*/)
    .map((x) => x.trim())
    .filter((x) => x && x.length < 60);
const norm = (t: string) => t.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

function parseYear(year: number, text: string): Release[] {
  const out: Release[] = [];
  for (const t of parseWikitables(text)) {
    const h = t.headers.map((x) => x.toLowerCase().replace(/^[|\s]+/, "").trim());
    const ti = h.findIndex((x) => x === "title" || x === "film");
    const di = h.findIndex((x) => x.startsWith("director"));
    if (ti < 0 || di < 0 || !h.some((x) => x.startsWith("opening"))) continue;
    const ci = h.findIndex((x) => x.startsWith("cast") || x.startsWith("starring"));
    const oi = h.indexOf("opening");
    for (const row of t.rows) {
      const raw = row[ti] ?? "";
      const title = plainText(raw).replace(/†/g, "").trim();
      if (!title || /^(title|tba)$/i.test(title)) continue;
      const month = oi >= 0 ? monthOf(row[oi] ?? "") : null;
      const day = oi >= 0 ? Number(plainText(row[oi + 1] ?? "").replace(/\D/g, "")) || null : null;
      const date = month && day && day <= 31 ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
      const link = firstLink(raw);
      out.push({
        title,
        date,
        year,
        kind: OTT.test(row.join(" ")) && !THEATRES.test(row.join(" ")) ? "ott" : "theatrical",
        language: null,
        director: plainText(row[di] ?? "") || null,
        cast: ci >= 0 ? castOf(row[ci] ?? "").slice(0, 6) : [],
        wiki: link ? link.target : null,
        source: "wikipedia-list",
      });
    }
  }
  return out;
}

const refresh = process.argv.includes("--refresh");
const all: Release[] = [];
const key = (r: { title: string; year: number }) => `${norm(r.title)}|${r.year}`;
const seen = new Map<string, Release>();
/** Same film written differently ("Athidi" / "Athidhi", "Baahubali: The Conclusion" / "Baahubali 2: The Conclusion"). */
const near = (r: Release) => {
  const n = norm(r.title);
  if (n.length < 5) return undefined;
  return all.find((x) => {
    if (Math.abs(x.year - r.year) > (r.date && x.date ? 0 : 1)) return false;
    if (r.date && x.date && Math.abs(Date.parse(r.date) - Date.parse(x.date)) > 45 * 864e5) return false;
    const m = norm(x.title);
    return m.length >= 5 && (editDistance(n, m) <= (Math.min(n.length, m.length) >= 9 ? 2 : 1) || ((n.startsWith(m) || m.startsWith(n)) && !!r.director && r.director === x.director));
  });
};
const add = (r: Release) => {
  const k = key(r);
  const wk = r.wiki ? `w:${r.wiki}` : null;
  const twin = seen.get(k) ?? (wk ? seen.get(wk) : undefined) ?? (r.source !== "wikipedia-list" ? near(r) : undefined);
  if (twin) {
    if (r.source === "manual") Object.assign(twin, r);
    return;
  }
  all.push(r);
  seen.set(k, r);
  if (wk) seen.set(wk, r);
};

for (let y = FIRST_YEAR; y <= THIS_YEAR; y++) {
  const text = await listPage(y, refresh);
  if (!text) {
    console.log(`  ! no list page for ${y}`);
    continue;
  }
  const rows = parseYear(y, text);
  rows.forEach(add);
  console.log(`  ${y}: ${rows.length} films on the list (${rows.filter((r) => r.kind === "ott").length} direct to OTT)`);
}

// 2. Our film data.
const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8")) as {
  films: { key: string; title: string; year: number; releaseDate: string | null; languages: string[]; director: string | null; starring: string[]; article: string | null; route?: string; teluguRelease?: string }[];
  credits: { film: string; include: boolean }[];
};
const counted = new Set(snap.credits.filter((c) => c.include).map((c) => c.film));
let fromData = 0;
for (const f of snap.films) {
  if (!counted.has(f.key) || !f.year || f.year < FIRST_YEAR) continue;
  const telugu = f.languages.some((l) => /telugu/i.test(l));
  // A Tamil/Malayalam/Kannada film whose language list also names Telugu, but which the Telugu list does not
  // carry, is its Telugu-dubbed version (Sivaji: The Boss, Remo); a bilingual shot in Telugu is on the list.
  const home = f.languages[0] && !/telugu/i.test(f.languages[0]) ? f.languages[0] : null;
  const dubbed = (!telugu && f.teluguRelease === "dubbed") || (telugu && !!home && !/hindi/i.test(home));
  if (!telugu && !dubbed) continue;
  if (dubbed && !(home ?? f.languages[0])) continue; // no language on record (e.g. a silent film): not a dub
  const before = all.length;
  add({
    title: f.title,
    // A festival premiere date from another year is not the release date: keep the year only.
    date: f.releaseDate && f.releaseDate.startsWith(String(f.year)) ? f.releaseDate : null,
    year: f.year,
    kind: dubbed ? "dubbed" : f.route === "ott" ? "ott" : "theatrical",
    language: dubbed ? (home ?? f.languages[0] ?? null) : null,
    director: f.director,
    cast: f.starring.slice(0, 4).map((s) => s.replace(/ \(.*\)$/, "")),
    wiki: f.article,
    source: "film-data",
  });
  if (all.length > before) fromData++;
}

// 3. Manual additions and fixes.
let manual = 0;
if (existsSync(MANUAL)) {
  for (const r of parseCsv(readFileSync(MANUAL, "utf8"))) {
    if (!r.title || !r.date) continue;
    const kind = (r.kind || "theatrical").toLowerCase() as Kind;
    if (!["theatrical", "ott", "dubbed"].includes(kind)) {
      console.log(`  ! manual.csv: "${r.title}" has kind "${r.kind}" (use theatrical, ott or dubbed)`);
      continue;
    }
    add({
      title: r.title.trim(),
      date: r.date.trim(),
      year: Number(r.date.slice(0, 4)),
      kind,
      language: r.original_language?.trim() || null,
      director: r.director?.trim() || null,
      cast: (r.cast ?? "").split(/\s*;\s*/).filter(Boolean),
      wiki: null,
      source: "manual",
    });
    manual++;
  }
}

// 4. Checked release types (lib/data/releases/checked/*.csv, from docs/data-entry/releases-check.csv): a person
// confirmed theatrical / OTT / not released and the date. These win over everything above.
const CHECKED_DIR = "lib/data/releases/checked";
let checked = 0;
if (existsSync(CHECKED_DIR)) {
  for (const file of readdirSync(CHECKED_DIR).filter((f) => f.endsWith(".csv")).sort()) {
    for (const r of parseCsv(readFileSync(`${CHECKED_DIR}/${file}`, "utf8"))) {
      const kind = (r.verified_kind || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (!kind || !/^https?:\/\//.test(r.source_url || "")) continue; // needs a source
      const year = Number(r.year);
      const i = all.findIndex((x) => x.year === year && norm(x.title) === norm(r.title || ""));
      if (i < 0) {
        console.log(`  ! ${file}: "${r.title}" (${r.year}) not found`);
        continue;
      }
      if (kind === "not_released" || kind === "duplicate" || kind === "not_telugu") {
        all.splice(i, 1);
      } else if (["theatrical", "ott", "dubbed"].includes(kind)) {
        all[i].kind = kind as Kind;
        if (/^\d{4}-\d{2}-\d{2}$/.test(r.verified_date || "")) all[i].date = r.verified_date;
      } else {
        console.log(`  ! ${file}: "${r.title}" has verified_kind "${r.verified_kind}"`);
        continue;
      }
      checked++;
    }
  }
}

all.sort((a, b) => (a.date ?? `${a.year}-12-31`).localeCompare(b.date ?? `${b.year}-12-31`) || a.title.localeCompare(b.title));
mkdirSync("lib/data/releases", { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      asOf: TODAY,
      sources: [
        "Wikipedia: List of Telugu films of each year (CC BY-SA 4.0)",
        "Tollywood Analysis film data (dubbed releases of the heroes we track)",
        "Editor additions (lib/data/releases/manual.csv)",
      ],
      films: all,
    },
    null,
    1,
  ) + "\n",
);
const released = all.filter((r) => (r.date ?? `${r.year}-12-31`) <= TODAY);
console.log(`\nSaved ${OUT}: ${all.length} films (${released.length} released by ${TODAY}); ${fromData} added from our film data, ${manual} manual rows, ${checked} checked rows.`);
