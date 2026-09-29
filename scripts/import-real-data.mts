/**
 * Real-data importer: builds lib/data/real/snapshot.json from
 *   • English Wikipedia (CC BY-SA): hero filmography tables (year, title, role, notes),
 *     film infoboxes (release date, budget, gross) and box-office prose (verdict)
 *   • Wikidata (CC0): film IDs, release dates, languages, director, runtime, IMDb id;
 *     hero photos (P18) and recorded social-media follower counts (P8687)
 *
 * Usage: npm run data:import      (cached in .cache/, re-runs are fast)
 * Nothing is scraped from IMDb, BookMyShow or social networks.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { EXCLUDED_CREDITS } from "@/lib/constants/editorial";
import { INITIAL_ROSTER } from "@/lib/constants/roster";
import { classifyRole, classifyVerdict, looksUnreleased } from "@/lib/import/classify";
import { parseCrore } from "@/lib/import/money";
import { firstLink, infoboxField, parseWikitables, plainText, splitTop } from "@/lib/import/wikitext";

const UA = "TollywoodAnalysis/0.2 (https://github.com/Bharadhwajreddy/TollyAnalysis; contact saibharadhwajreddy@gmail.com)";
const CACHE = ".cache/import";
const OUT = "lib/data/real/snapshot.json";
const TODAY = new Date().toISOString().slice(0, 10);
mkdirSync(CACHE, { recursive: true });
mkdirSync("lib/data/real", { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url: string, init: RequestInit = {}, tries = 7): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { ...init, headers: { "user-agent": UA, ...(init.headers ?? {}) } });
    if ((res.status !== 429 && res.status < 500) || i >= tries) return res;
    await sleep(4000 * 2 ** i);
  }
}

/* ───────────── Wikipedia bulk export (Special:Export, many pages per request) ───────────── */

const pageCachePath = `${CACHE}/pages.json`;
const pageCache: Record<string, string | null> = existsSync(pageCachePath) ? JSON.parse(readFileSync(pageCachePath, "utf8")) : {};
const norm = (t: string) => {
  const s = t.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function decodeXml(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&");
}

async function exportPages(titles: string[]): Promise<void> {
  const todo = [...new Set(titles.map(norm))].filter((t) => !(t in pageCache));
  for (let i = 0; i < todo.length; i += 40) {
    const batch = todo.slice(i, i + 40);
    const body = new URLSearchParams({ pages: batch.join("\n"), curonly: "1", action: "submit" });
    const res = await fetchRetry("https://en.wikipedia.org/wiki/Special:Export", { method: "POST", body });
    const xml = await res.text();
    for (const t of batch) pageCache[t] = null;
    for (const m of xml.matchAll(/<page>[\s\S]*?<title>([^<]*)<\/title>[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>[\s\S]*?<\/page>/g)) {
      pageCache[norm(decodeXml(m[1]))] = decodeXml(m[2]);
    }
    writeFileSync(pageCachePath, JSON.stringify(pageCache));
    process.stdout.write(`  pages ${Math.min(i + 40, todo.length)}/${todo.length}\r`);
    await sleep(1500);
  }
}

/** Returns page text following up to 2 redirects. */
async function page(title: string): Promise<{ title: string; text: string } | null> {
  let t = norm(title);
  for (let hop = 0; hop < 3; hop++) {
    if (!(t in pageCache)) await exportPages([t]);
    const text = pageCache[t];
    if (!text) return null;
    const r = /^#REDIRECT\s*\[\[([^\]|#]+)/i.exec(text);
    if (!r) return { title: t, text };
    t = norm(r[1]);
  }
  return null;
}

/* ───────────── Wikidata SPARQL ───────────── */

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  const res = await fetchRetry("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: { accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } };
  await sleep(1200);
  return json.results.bindings;
}

const lit = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"@en`;

/* ───────────── helpers ───────────── */

function sectionHeadingBefore(text: string, offset: number): string {
  const before = text.slice(0, offset);
  const headings = [...before.matchAll(/^(={2,4})\s*([^=]+?)\s*\1\s*$/gm)];
  // Include the parent heading so "Television" > "As actor" is still skipped.
  return headings
    .slice(-2)
    .map((h) => h[2])
    .join(" > ");
}

const SKIP_SECTION = /television|web series|\btv\b|music video|dubbing|as (?:a )?(?:producer|singer|director|writer|lyricist|narrator|presenter|host)|discography|awards|nominations|short film|theatre|stage|advert|commercial|voice(?:-over)? (?:work|roles)|hosting|documentar/i;
const SKIP_HEADERS = /network|channel|platform|episode|performer|singer|album|show|artist/;

function filmDate(raw: string | null): string | null {
  if (!raw) return null;
  const fd = /\{\{\s*(?:Film date|Start date|FilmDate)\s*\|(?:[^|}]*=[^|}]*\|)*\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(raw);
  if (fd) return `${fd[1]}-${fd[2].padStart(2, "0")}-${fd[3].padStart(2, "0")}`;
  const t = plainText(raw);
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const m1 = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(t);
  if (m1 && months.includes(m1[2].toLowerCase())) return `${m1[3]}-${String(months.indexOf(m1[2].toLowerCase()) + 1).padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  const m2 = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(t);
  if (m2 && months.includes(m2[1].toLowerCase())) return `${m2[3]}-${String(months.indexOf(m2[1].toLowerCase()) + 1).padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  return null;
}

function boxOfficeProse(text: string): string {
  const sec = /==+\s*(?:Box[- ]office|Box office performance|Commercial performance|Collections?|Release and reception|Reception)\s*==+([\s\S]*?)(?=\n==[^=])/i.exec(text);
  const lead = text.split(/\n==/)[0].split("\n").filter((l) => !/^\s*[{|}]/.test(l)).join(" ");
  return plainText(`${sec?.[1] ?? ""} ${lead}`.replace(/^=+[^=\n]+=+\s*$/gm, " "));
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Ordered cast names from an infobox "starring" value (links resolved to article titles). */
function starringList(raw: string | null): string[] {
  if (!raw) return [];
  const cleaned = raw.replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "");
  const parts = cleaned
    .replace(/\{\{\s*(?:plain ?list|ubl|unbulleted list|flatlist|hlist)\s*\|/gi, "")
    .split(/\n\s*\*|<br\s*\/?>/i)
    .flatMap((p) => splitTop(p, ","))
    .flatMap((p) => splitTop(p, "|"));
  const out: string[] = [];
  for (const part of parts) {
    const link = firstLink(part);
    const name = link ? link.target : plainText(part).replace(/[{}]/g, "").trim();
    if (name && name.length > 1 && !/^(class|style)\s*=/.test(name)) out.push(norm(name));
  }
  return out;
}

/* ───────────── main ───────────── */

interface Credit {
  hero: string;
  film: string; // article title or "unlinked:<title>|<year>"
  year: number;
  displayTitle: string;
  role: string;
  notes: string;
  language: string;
  scope: "lead" | "cameo" | "supporting";
  include: boolean;
  excludeReason: string | null;
  billing?: string;
}

async function main() {
  const heroes = INITIAL_ROSTER.filter((h) => h.industry === "telugu");
  console.log(`Heroes: ${heroes.length}`);

  // 1. Hero articles + filmography pages.
  await exportPages(heroes.flatMap((h) => h.wiki.flatMap((w) => [w, `${w} filmography`])));
  const heroInfo: Record<string, { article: string; filmographyPage: string | null }> = {};
  for (const h of heroes) {
    for (const w of h.wiki) {
      const main = await page(w);
      if (!main || !/actor|film/i.test(main.text.slice(0, 4000))) continue;
      const fp = await page(`${w} filmography`);
      heroInfo[h.slug] = { article: main.title, filmographyPage: fp && fp.title !== main.title ? fp.title : null };
      break;
    }
    if (!heroInfo[h.slug]) console.log(`  ! no article for ${h.slug}`);
  }

  // 2. Parse filmography tables.
  const credits: Credit[] = [];
  const debut: Record<string, number> = {};
  for (const h of heroes) {
    const info = heroInfo[h.slug];
    if (!info) continue;
    const src = (await page(info.filmographyPage ?? info.article))!;
    const tables = parseWikitables(src.text);
    let used = 0;
    for (const tb of tables) {
      const yi = tb.headers.findIndex((x) => /year/.test(x));
      const ti = tb.headers.findIndex((x) => /^(title|film|films|movie)\b/.test(x));
      if (yi < 0 || ti < 0) continue;
      if (tb.headers.some((x) => SKIP_HEADERS.test(x))) continue;
      const heading = sectionHeadingBefore(src.text, tb.offset);
      if (SKIP_SECTION.test(heading)) continue;
      const ri = tb.headers.findIndex((x) => /role|character/.test(x));
      const ni = tb.headers.findIndex((x) => /note/.test(x));
      const li = tb.headers.findIndex((x) => /language/.test(x));
      used++;
      for (const row of tb.rows) {
        const year = Number(/(19|20)\d{2}/.exec(plainText(row[yi] ?? ""))?.[0]);
        if (!year) continue;
        // Debut as a lead: ignore child-artist, cameo and voice rows.
        const preNotes = plainText(row[tb.headers.findIndex((x) => /note/.test(x))] ?? "");
        const preRole = plainText(row[tb.headers.findIndex((x) => /role|character/.test(x))] ?? "");
        if (!/child|young|cameo|special|guest|voice|narrat/i.test(`${preRole} ${preNotes}`) && classifyRole(preRole, preNotes) === "lead")
          debut[h.slug] = Math.min(debut[h.slug] ?? 9999, year);
        if (year < 2000) continue;
        const link = firstLink(row[ti] ?? "");
        const displayTitle = link?.text || plainText(row[ti] ?? "").replace(/†/g, "").trim();
        if (!displayTitle) continue;
        const role = plainText(row[ri] ?? "");
        const notes = plainText(row[ni] ?? "");
        const language = plainText(row[li] ?? "");
        const scope = classifyRole(role, notes);
        let excludeReason: string | null = null;
        if (scope === "cameo") excludeReason = "cameo / special / voice appearance";
        else if (scope === "supporting") excludeReason = "supporting role";
        else if (looksUnreleased(row[ti] ?? "", notes)) excludeReason = "not yet released";
        else if (/re-?release|recut|re-edit|compilation/i.test(notes)) excludeReason = "re-release";
        else if (language && !/telugu/i.test(language)) excludeReason = `${language} film`;
        else if (/\b(hindi|tamil|kannada|malayalam|english|bengali|marathi) film\b/i.test(notes) && !/telugu/i.test(notes)) excludeReason = "not a Telugu film";
        credits.push({
          hero: h.slug,
          film: link ? norm(link.target) : `unlinked:${displayTitle}|${year}`,
          year,
          displayTitle,
          role,
          notes,
          language,
          scope,
          include: !excludeReason,
          excludeReason,
        });
      }
    }
    console.log(`  ${h.slug}: ${used} film table(s), ${credits.filter((c) => c.hero === h.slug && c.include).length} lead films since 2000`);
  }

  // 3. Film articles.
  const filmTitles = [...new Set(credits.filter((c) => !c.film.startsWith("unlinked:")).map((c) => c.film))];
  console.log(`Film articles to read: ${filmTitles.length}`);
  await exportPages(filmTitles);
  // Follow redirects in bulk.
  const redirectTargets = filmTitles
    .map((t) => pageCache[t])
    .map((txt) => (txt ? /^#REDIRECT\s*\[\[([^\]|#]+)/i.exec(txt)?.[1] : null))
    .filter((x): x is string => !!x);
  await exportPages(redirectTargets);

  interface FilmOut {
    key: string;
    article: string | null;
    title: string;
    year: number;
    releaseDate: string | null;
    dateApproximate: boolean;
    languages: string[];
    director: string | null;
    music: string | null;
    runtimeMin: number | null;
    genres: string[];
    imdbId: string | null;
    qid: string | null;
    budget: { low: number; high: number; text: string } | null;
    gross: { low: number; high: number; text: string } | null;
    verdict: { verdict: string; sentence: string } | null;
    /** Billing order from the infobox "starring" field (link targets or names). */
    starring: string[];
  }
  const films = new Map<string, FilmOut>();
  for (const c of credits) {
    if (films.has(c.film)) continue;
    let out: FilmOut = {
      key: c.film,
      article: null,
      title: c.displayTitle,
      year: c.year,
      releaseDate: null,
      dateApproximate: true,
      languages: c.language ? [c.language] : [],
      director: null,
      music: null,
      runtimeMin: null,
      genres: [],
      imdbId: null,
      qid: null,
      budget: null,
      gross: null,
      verdict: null,
      starring: [],
    };
    if (!c.film.startsWith("unlinked:")) {
      const p = await page(c.film);
      if (p && /\{\{\s*Infobox\s+film/i.test(p.text)) {
        const released = filmDate(infoboxField(p.text, "released"));
        const lang = plainText(infoboxField(p.text, "language") ?? "");
        out = {
          ...out,
          article: p.title,
          releaseDate: released,
          dateApproximate: !released,
          languages: lang ? lang.split(/[,/]| and |\s{2,}/).map((x) => x.trim()).filter(Boolean) : out.languages,
          director: plainText(infoboxField(p.text, "director") ?? "").slice(0, 80) || null,
          music: plainText(infoboxField(p.text, "music") ?? "").slice(0, 80) || null,
          runtimeMin: Number(/(\d{2,3})\s*min/i.exec(plainText(infoboxField(p.text, "runtime") ?? ""))?.[1]) || null,
          budget: parseCrore(infoboxField(p.text, "budget")),
          gross: parseCrore(infoboxField(p.text, "gross")),
          verdict: classifyVerdict(boxOfficeProse(p.text)),
          starring: starringList(infoboxField(p.text, "starring")),
        };
      }
    }
    films.set(c.film, out);
  }

  // 4. Wikidata enrichment for film articles.
  const articles = [...films.values()].filter((f) => f.article).map((f) => f.article!);
  for (let i = 0; i < articles.length; i += 120) {
    const batch = articles.slice(i, i + 120);
    const rows = await sparql(`
      SELECT ?name ?film (MIN(?date) AS ?d) (SAMPLE(?imdb) AS ?imdbId) (SAMPLE(?dur) AS ?runtime)
             (GROUP_CONCAT(DISTINCT ?langLabel; separator="|") AS ?langs)
             (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
      WHERE {
        VALUES ?name { ${batch.map(lit).join(" ")} }
        ?article schema:about ?film; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?name.
        OPTIONAL { ?film wdt:P577 ?date }
        OPTIONAL { ?film wdt:P345 ?imdb }
        OPTIONAL { ?film wdt:P2047 ?dur }
        OPTIONAL { ?film wdt:P364 ?lang. ?lang rdfs:label ?langLabel. FILTER(LANG(?langLabel) = "en") }
        OPTIONAL { ?film wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel) = "en") }
      } GROUP BY ?name ?film`);
    for (const r of rows) {
      const f = [...films.values()].find((x) => x.article === r.name.value);
      if (!f) continue;
      f.qid = r.film.value.split("/").pop() ?? null;
      f.imdbId = r.imdbId?.value ?? null;
      if (!f.runtimeMin && r.runtime) f.runtimeMin = Math.round(Number(r.runtime.value)) || null;
      if (!f.releaseDate && r.d) {
        f.releaseDate = r.d.value.slice(0, 10);
        f.dateApproximate = false;
      }
      const wdLangs = r.langs?.value ? r.langs.value.split("|").map((x) => x.replace(/ language$/, "")) : [];
      if (!f.languages.length) f.languages = wdLangs;
      if (wdLangs.length && !f.languages.some((l) => /telugu/i.test(l)) && wdLangs.some((l) => /telugu/i.test(l))) f.languages.push("Telugu");
      f.genres = r.genres?.value ? r.genres.value.split("|").filter((g) => !/film$/i.test(g) || g.split(" ").length <= 3).slice(0, 4) : [];
    }
    console.log(`  wikidata films ${Math.min(i + 120, articles.length)}/${articles.length}`);
  }

  // 5. Final eligibility checks that need film data.
  for (const c of credits) {
    if (!c.include) continue;
    const f = films.get(c.film)!;
    const date = f.releaseDate ?? `${c.year}-07-01`;
    if (date > TODAY) {
      c.include = false;
      c.excludeReason = "not yet released";
    } else if (date < "2000-01-01") {
      c.include = false;
      c.excludeReason = "released before 2000";
    } else if (f.languages.length && !f.languages.some((l) => /telugu/i.test(l))) {
      c.include = false;
      c.excludeReason = `${f.languages.join("/")} film`;
    }
  }

  // 5b. Lead check from billing order. Filmography tables list every acting credit, so a
  // film counts only when the hero is billed first in the infobox, or is a genuine co-lead
  // billed right after other roster heroes (multi-hero films).
  const heroArticleSet = new Map(Object.entries(heroInfo).map(([slug, v]) => [norm(v.article), slug]));
  const squash = (x: string) => x.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z]/g, "");
  const aliasesOf = new Map(heroes.map((h) => [h.slug, [h.name, ...h.wiki, heroInfo[h.slug]?.article ?? ""].map(squash).filter((x) => x.length >= 3)]));
  const isHero = (entry: string, slug: string) => {
    const e = squash(entry);
    if (e.length < 3) return false;
    return aliasesOf.get(slug)!.some(
      (a) => e === a || (e.length >= 5 && (a.startsWith(e) || e.startsWith(a))) || (e.length >= 8 && Math.abs(e.length - a.length) <= 2 && editDistance(e, a) <= 2),
    );
  };
  const rosterSlugOf = (entry: string) => heroes.find((h) => heroInfo[h.slug] && isHero(entry, h.slug))?.slug;
  for (const c of credits) {
    if (!c.include) continue;
    const f = films.get(c.film)!;
    if (!f.starring.length) {
      c.billing = "no starring list (kept, unverified)";
      continue;
    }
    const pos = f.starring.findIndex((n) => isHero(n, c.hero));
    const before = f.starring.slice(0, Math.max(0, pos));
    const strict = heroes.find((h) => h.slug === c.hero)?.strictBilling;
    const coLead = !strict && pos > 0 && pos <= 2 && before.every((n) => heroArticleSet.has(n) || !!rosterSlugOf(n));
    c.billing = pos < 0 ? "not in starring list" : `billed #${pos + 1}`;
    if (pos === 0) c.scope = "lead";
    else if (coLead) c.scope = "lead";
    else {
      c.include = false;
      c.scope = "supporting";
      c.excludeReason = pos < 0 ? "not listed in the film's starring credits" : `billed #${pos + 1} (supporting role)`;
    }
  }

  // 5c. Editorial overrides (e.g. a villain billed second in a two-star film).
  for (const c of credits) {
    const o = EXCLUDED_CREDITS[c.hero]?.find((x) => norm(x.film) === c.film);
    if (o && c.include) {
      c.include = false;
      c.scope = "supporting";
      c.excludeReason = `Editorial: ${o.reason}`;
    }
  }

  // 6. Hero facts from Wikidata: photo, follower counts, handles, birth date.
  const heroArticles = Object.entries(heroInfo);
  const heroRows = await sparql(`
    SELECT ?name ?p ?img ?birth ?followers ?when ?xnum ?xuser ?iguser ?ytid ?qualX ?qualIG WHERE {
      VALUES ?name { ${heroArticles.map(([, v]) => lit(v.article)).join(" ")} }
      ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?name.
      OPTIONAL { ?p wdt:P18 ?img }
      OPTIONAL { ?p wdt:P569 ?birth }
      OPTIONAL { ?p wdt:P2002 ?xuser }
      OPTIONAL { ?p wdt:P2003 ?iguser }
      OPTIONAL { ?p wdt:P2397 ?ytid }
      OPTIONAL { ?p p:P8687 ?st. ?st ps:P8687 ?followers. OPTIONAL { ?st pq:P585 ?when } OPTIONAL { ?st pq:P6552 ?qualX } OPTIONAL { ?st pq:P2003 ?qualIG } }
    }`);
  const heroOut = heroes
    .filter((h) => heroInfo[h.slug])
    .map((h) => {
      const rows = heroRows.filter((r) => r.name.value === heroInfo[h.slug].article);
      const latest = (pred: (r: Record<string, { value: string }>) => boolean) =>
        rows
          .filter((r) => r.followers && pred(r))
          .sort((a, b) => (b.when?.value ?? "").localeCompare(a.when?.value ?? ""))[0];
      const xRow = latest((r) => !r.qualIG);
      const igRow = latest((r) => !!r.qualIG);
      return {
        slug: h.slug,
        name: h.name,
        qid: rows[0]?.p.value.split("/").pop() ?? null,
        article: heroInfo[h.slug].article,
        filmographyPage: heroInfo[h.slug].filmographyPage,
        debutYear: debut[h.slug] ?? null,
        birthDate: rows.find((r) => r.birth)?.birth.value.slice(0, 10) ?? null,
        image: rows.find((r) => r.img)?.img.value ?? null,
        social: {
          x: xRow
            ? { followers: Number(xRow.followers.value), date: xRow.when?.value.slice(0, 10) ?? null, username: rows.find((r) => r.xuser)?.xuser.value ?? null }
            : rows.find((r) => r.xuser)
              ? { followers: null, date: null, username: rows.find((r) => r.xuser)!.xuser.value }
              : null,
          instagram: igRow
            ? { followers: Number(igRow.followers.value), date: igRow.when?.value.slice(0, 10) ?? null, username: igRow.qualIG.value }
            : rows.find((r) => r.iguser)
              ? { followers: null, date: null, username: rows.find((r) => r.iguser)!.iguser.value }
              : null,
          youtube: rows.find((r) => r.ytid)?.ytid.value ?? null,
        },
      };
    });

  const usedFilms = new Set(credits.map((c) => c.film));
  const snapshot = {
    generatedAt: new Date().toISOString(),
    sources: {
      wikipedia: "https://en.wikipedia.org (CC BY-SA 4.0)",
      wikidata: "https://www.wikidata.org (CC0)",
    },
    heroes: heroOut,
    films: [...films.values()].filter((f) => usedFilms.has(f.key)),
    credits,
  };
  writeFileSync(OUT, JSON.stringify(snapshot, null, 1) + "\n");
  const included = credits.filter((c) => c.include);
  console.log(
    `\nSaved ${OUT}: ${heroOut.length} heroes, ${snapshot.films.length} films, ${included.length} counted lead credits, ` +
      `${snapshot.films.filter((f) => f.gross).length} with gross, ${snapshot.films.filter((f) => f.budget).length} with budget, ` +
      `${snapshot.films.filter((f) => f.verdict).length} with a verdict sentence.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
