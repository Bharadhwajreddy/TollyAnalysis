/**
 * Real-data importer: builds lib/data/real/snapshot.json from
 *   • English Wikipedia (CC BY-SA): hero filmography tables (year, title, role, notes),
 *     film infoboxes (release date, budget, gross) and box-office prose (verdict)
 *   • Wikidata (CC0): film IDs, release dates, languages, director, runtime, IMDb id;
 *     hero photos (P18) and recorded social-media follower counts (P8687)
 *   • Telugu Wikipedia (CC BY-SA): verdict sentences for films the English article doesn't judge
 *   • mtwikiblog.com yearly / per-hero "hits and flops" lists: last-resort verdicts, low confidence
 *
 * A film's result comes from the first source that states one, in this order:
 *   English film article → hero's English article → Telugu film article → trade blog.
 *
 * Usage: npm run data:import      (cached in .cache/, re-runs are fast)
 * Nothing is scraped from IMDb, BookMyShow or social networks.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { EXCLUDED_CREDITS } from "@/lib/constants/editorial";
import { INITIAL_ROSTER } from "@/lib/constants/roster";
import { classifyRole, looksUnreleased } from "@/lib/import/classify";
import { parseFilmPost, parseTradePage, type TradeRow } from "@/lib/import/trade-blog";
import { articleVerdict, heroProseVerdicts, teluguVerdict } from "@/lib/import/verdict";
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

type VerdictSource = "wikipedia-film" | "wikipedia-hero" | "telugu-wikipedia" | "trade-blog";
const wikiUrl = (title: string, host = "en.wikipedia.org") => `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

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

/* ───────────── extra verdict sources ───────────── */

interface FilmVerdictTarget {
  key: string;
  article: string | null;
  title: string;
  year: number;
  releaseDate: string | null;
  qid: string | null;
  verdict: { verdict: string; sentence: string; source: VerdictSource; url: string | null } | null;
  route?: "theatrical" | "ott";
}

/** Direct-to-streaming releases have no box office; they are labelled, not left "unknown". */
const DIRECT_OTT = /direct(?:ly)?[- ]to[- ](?:OTT|streaming|digital|video)|released directly (?:on|via|through)|skipp(?:ed|ing) (?:a |its )?theatrical release|bypass(?:ed|ing) (?:a |its )?theatrical|instead of a theatrical release|world premiere on (?:\[\[)?(?:Netflix|Amazon|Prime|Aha|ZEE5|Zee5|Disney|Hotstar|Sony|ETV)/i;

const TRADE_BLOG = "https://www.mtwikiblog.com";
/** Yearly round-ups and per-hero filmography tables on the trade blog (hero slug → page). */
const TRADE_YEAR_PAGES = [
  ...Array.from({ length: 10 }, (_, i) => `/2021/05/${2000 + i}-Telugu-Movies-Hits-and-Flops.html`),
  "/2015/05/telugu-movie-2015-hit-or-flop-at-box-office-budget-profit.html",
  "/2019/01/telugu-box-office-collection-2017-budget-verdict-hit-or-flop.html",
  "/2020/02/telugu-box-office-collection-2018.html",
  "/p/telugu-box-office-hit-or-flop-2019.html",
  "/p/telugu-box-office-hit-or-flop-2020.html",
  "/p/telugu-box-office-hit-or-flop-2021.html",
  "/p/telugu-movies-hits-and-flops-2021.html",
  "/p/telugu-movies-hits-and-flops-2022.html",
  "/p/telugu-movies-hits-and-flops-2023.html",
];
const TRADE_HERO_PAGES: Record<string, string> = {
  "allu-arjun": "/2016/12/allu-arjun-movies-list-hits-or-flops-box-office-records.html",
  "jr-ntr": "/2016/12/jr-ntr-movies-list-hits-flops-box-office-records.html",
  "pawan-kalyan": "/2016/12/pawan-kalyan-movies-list-hits-flops-box-office-records.html",
  prabhas: "/2017/10/prabhas-movies-list-hits-flops-blockbusters-box-office-records.html",
  "ram-charan": "/2018/06/ram-charan-movies-list-hits-flops-box-office-collection-records.html",
  "kalyan-ram": "/p/nandamuri-kalyan-ram-filmography.html",
  "aadi-saikumar": "/p/aadi-filmography.html",
  chiranjeevi: "/p/chiranjeevi-filmography.html",
  "jagapathi-babu": "/p/jagapathi-babu-filmography.html",
  karthikeya: "/p/kartikeya-gummakonda-filmography.html",
  "mahesh-babu": "/p/mahesh-babu-filmography.html",
  "nikhil-siddhartha": "/p/nikhil-siddharth-filmography.html",
  nithiin: "/p/nithiin-filmography.html",
  "ram-pothineni": "/p/ram-pothineni-filmography.html",
  "ravi-teja": "/p/ravi-teja-filmography.html",
  satyadev: "/p/satyadev-kancharana-filmography.html",
  sharwanand: "/p/sharwanand-filmography.html",
  "sundeep-kishan": "/p/sundeep-kishan-filmography.html",
  venkatesh: "/p/venkatesh-filmography.html",
  "vijay-deverakonda": "/p/vijay-deverakonda-filmography.html",
};

async function cachedGet(url: string, dir: string): Promise<string | null> {
  mkdirSync(dir, { recursive: true });
  const f = `${dir}/${url.replace(/^https?:\/\/[^/]+\//, "").replace(/[^a-zA-Z0-9.-]+/g, "_")}`;
  if (existsSync(f)) return readFileSync(f, "utf8") || null;
  const res = await fetchRetry(url);
  const body = res.ok ? await res.text() : "";
  writeFileSync(f, body);
  await sleep(500);
  return body || null;
}

const squashTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/th/g, "t")
    .replace(/dh/g, "d");

function matchTrade(f: FilmVerdictTarget, rows: TradeRow[], sameHeroPage: boolean): TradeRow | null {
  const k = squashTitle(f.title);
  if (k.length < 2) return null;
  const year = f.releaseDate ? Number(f.releaseDate.slice(0, 4)) : f.year;
  const near = (r: TradeRow) => r.year === null || Math.abs(r.year - year) <= 1;
  const exact = rows.filter((r) => squashTitle(r.title) === k && (near(r) || sameHeroPage));
  if (exact.length) return exact.sort((a, b) => Math.abs((a.year ?? year) - year) - Math.abs((b.year ?? year) - year))[0];
  if (k.length >= 8) {
    const fuzzy = rows.filter((r) => near(r) && r.year !== null && Math.abs(squashTitle(r.title).length - k.length) <= 2 && editDistance(squashTitle(r.title), k) <= 2);
    if (fuzzy.length === 1) return fuzzy[0];
  }
  return null;
}

async function fillVerdicts(
  heroes: typeof INITIAL_ROSTER,
  heroInfo: Record<string, { article: string; filmographyPage: string | null }>,
  credits: Credit[],
  films: Map<string, FilmVerdictTarget>,
) {
  const counted = (pred: (c: Credit) => boolean) => [...new Set(credits.filter((c) => c.include && pred(c)).map((c) => c.film))].map((k) => films.get(k)!);
  const missing = () => counted(() => true).filter((f) => !f.verdict);
  console.log(`Verdicts: ${counted(() => true).length - missing().length} from English film articles, ${missing().length} still missing`);

  // a. The hero's own article and filmography page ("commercial successes such as …").
  for (const h of heroes) {
    const info = heroInfo[h.slug];
    if (!info) continue;
    const mine = counted((c) => c.hero === h.slug);
    for (const title of [info.article, info.filmographyPage].filter((x): x is string => !!x)) {
      const p = await page(title);
      if (!p) continue;
      for (const [key, v] of heroProseVerdicts(p.text, mine)) {
        const f = films.get(key)!;
        if (!f.verdict) f.verdict = { ...v, source: "wikipedia-hero", url: wikiUrl(p.title) };
      }
    }
  }
  console.log(`  after hero articles: ${missing().length} missing`);

  // b. Telugu Wikipedia film articles (found through Wikidata sitelinks).
  const needTe = missing().filter((f) => f.qid);
  const teTitle = new Map<string, string>();
  for (let i = 0; i < needTe.length; i += 150) {
    const rows = await sparql(
      `SELECT ?f ?t WHERE { VALUES ?f { ${needTe.slice(i, i + 150).map((f) => `wd:${f.qid}`).join(" ")} } ?a schema:about ?f; schema:isPartOf <https://te.wikipedia.org/>; schema:name ?t. }`,
    );
    for (const r of rows) teTitle.set(r.f.value.split("/").pop()!, r.t.value);
  }
  const tePath = `${CACHE}/tepages.json`;
  const teCache: Record<string, string | null> = existsSync(tePath) ? JSON.parse(readFileSync(tePath, "utf8")) : {};
  const teTodo = [...new Set(teTitle.values())].filter((t) => !(t in teCache));
  for (let i = 0; i < teTodo.length; i += 40) {
    const batch = teTodo.slice(i, i + 40);
    const res = await fetchRetry("https://te.wikipedia.org/wiki/Special:Export", { method: "POST", body: new URLSearchParams({ pages: batch.join("\n"), curonly: "1", action: "submit" }) });
    const xml = await res.text();
    for (const t of batch) teCache[t] = null;
    for (const m of xml.matchAll(/<page>[\s\S]*?<title>([^<]*)<\/title>[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>[\s\S]*?<\/page>/g)) teCache[decodeXml(m[1])] = decodeXml(m[2]);
    writeFileSync(tePath, JSON.stringify(teCache));
    await sleep(1500);
  }
  for (const f of needTe) {
    const t = teTitle.get(f.qid!);
    const text = t ? teCache[t] : null;
    const v = text ? teluguVerdict(text) : null;
    if (v) f.verdict = { ...v, source: "telugu-wikipedia", url: wikiUrl(t!, "te.wikipedia.org") };
  }
  console.log(`  after Telugu Wikipedia: ${missing().length} missing`);

  // c. Trade blog: per-hero tables first (most specific), then yearly round-ups, then per-film posts.
  const dir = `${CACHE}/mtwiki/pages`;
  for (const h of heroes) {
    const path = TRADE_HERO_PAGES[h.slug];
    if (!path) continue;
    const html = await cachedGet(TRADE_BLOG + path, dir);
    if (!html) continue;
    const rows = parseTradePage(html);
    for (const f of counted((c) => c.hero === h.slug)) {
      if (f.verdict) continue;
      const r = matchTrade(f, rows, true);
      if (r) f.verdict = { verdict: r.verdict, sentence: `Listed as "${r.raw}" in the blog's ${h.name} filmography.`, source: "trade-blog", url: TRADE_BLOG + path };
    }
  }
  const yearRows: { url: string; rows: TradeRow[] }[] = [];
  for (const path of TRADE_YEAR_PAGES) {
    const html = await cachedGet(TRADE_BLOG + path, dir);
    if (!html) continue;
    const y = Number(/(20[0-2]\d)/.exec(path.replace(/^\/20\d\d\/\d\d\//, ""))?.[1]) || null;
    yearRows.push({ url: TRADE_BLOG + path, rows: parseTradePage(html, y) });
  }
  for (const f of missing()) {
    for (const { url, rows } of yearRows) {
      const r = matchTrade(f, rows, false);
      if (r) {
        f.verdict = { verdict: r.verdict, sentence: `Listed as "${r.raw}" in the blog's ${r.year ?? ""} Telugu hits-and-flops list.`.replace("  ", " "), source: "trade-blog", url };
        break;
      }
    }
  }
  // Per-film posts ("<Film> Telugu Movie (2024) Budget, Hit or Flop…") for recent films.
  const sitemap = await cachedGet(`${TRADE_BLOG}/sitemap.xml`, dir);
  const postMaps = [...(sitemap ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const posts: string[] = [];
  for (const u of postMaps) posts.push(...[...((await cachedGet(u, dir)) ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const filmPosts = posts.filter((u) => /telugu/i.test(u) && /hit|flop|budget/i.test(u));
  for (const f of missing().filter((x) => (x.releaseDate ?? `${x.year}`) >= "2019")) {
    const slug = f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (slug.length < 3) continue;
    const url = filmPosts.find((u) => new RegExp(`/${slug}-(?:telugu|hit|box|movie|\\d{4})`, "i").test(u));
    if (!url) continue;
    const html = await cachedGet(url, dir);
    const v = html ? parseFilmPost(html) : null;
    if (v) f.verdict = { verdict: v.verdict, sentence: `The blog's film page gives the verdict "${v.raw}".`, source: "trade-blog", url };
  }
  console.log(`  after trade blog: ${missing().length} missing`);
  // d. Films still without a result: mark direct-to-OTT releases (only when nothing else applies,
  //    since theatrical films also mention their later streaming premiere).
  for (const f of missing()) {
    const p = f.article ? await page(f.article) : null;
    if (p && DIRECT_OTT.test(p.text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ""))) f.route = "ott";
  }
  console.log(`  direct-to-OTT: ${missing().filter((f) => f.route === "ott").length}`);
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
    verdict: { verdict: string; sentence: string; source: VerdictSource; url: string | null } | null;
    route?: "theatrical" | "ott";
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
          verdict: ((v) => (v ? { ...v, source: "wikipedia-film" as const, url: wikiUrl(p.title) } : null))(articleVerdict(p.text)),
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

  await fillVerdicts(heroes, heroInfo, credits, films);

  // 6. Hero facts from Wikidata: photo, follower counts, handles, birth date.
  const heroArticles = Object.entries(heroInfo);
  const heroRows = await sparql(`
    SELECT ?name ?p ?img ?birth ?followers ?when ?xnum ?xuser ?iguser ?ytid ?qualX ?qualIG ?qualYT WHERE {
      VALUES ?name { ${heroArticles.map(([, v]) => lit(v.article)).join(" ")} }
      ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?name.
      OPTIONAL { ?p wdt:P18 ?img }
      OPTIONAL { ?p wdt:P569 ?birth }
      OPTIONAL { ?p wdt:P2002 ?xuser }
      OPTIONAL { ?p wdt:P2003 ?iguser }
      OPTIONAL { ?p wdt:P2397 ?ytid }
      OPTIONAL { ?p p:P8687 ?st. ?st ps:P8687 ?followers. OPTIONAL { ?st pq:P585 ?when } OPTIONAL { ?st pq:P6552 ?qualX } OPTIONAL { ?st pq:P2003 ?qualIG } OPTIONAL { ?st pq:P2397 ?qualYT } }
    }`);
  const heroOut = heroes
    .filter((h) => heroInfo[h.slug])
    .map((h) => {
      const rows = heroRows.filter((r) => r.name.value === heroInfo[h.slug].article);
      const latest = (pred: (r: Record<string, { value: string }>) => boolean) =>
        rows
          .filter((r) => r.followers && pred(r))
          .sort((a, b) => (b.when?.value ?? "").localeCompare(a.when?.value ?? ""))[0];
      // P8687 statements are told apart by their qualifier: X user ID (P6552), Instagram
      // username (P2003) or YouTube channel (P2397). Unqualified statements are ignored.
      const xRow = latest((r) => !!r.qualX);
      const igRow = latest((r) => !!r.qualIG);
      const ytRow = latest((r) => !!r.qualYT);
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
          youtubeSubscribers: ytRow ? { followers: Number(ytRow.followers.value), date: ytRow.when?.value.slice(0, 10) ?? null, channel: ytRow.qualYT.value } : null,
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
