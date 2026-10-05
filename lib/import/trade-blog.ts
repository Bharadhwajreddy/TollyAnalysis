import type { TradeVerdict } from "@/lib/domain/types";

/**
 * Parses film verdict lists from mtwikiblog.com (a Telugu box-office blog): yearly
 * "Telugu Movies Hits and Flops" round-ups, yearly box-office tables and per-hero
 * filmography tables. Used only for films that Wikipedia gives no result for, and always
 * shown with a link to the page it came from (low confidence).
 */

export interface TradeRow {
  title: string;
  year: number | null;
  verdict: TradeVerdict;
  raw: string;
}

const ent = (x: string) =>
  x
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#039;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;|&mdash;/g, "-");
const text = (h: string) => ent(h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/** Maps the blog's wording ("Super Hitt", "All Time Industry Hit", "Semi Hit", "Averge") to our scale. */
export function normaliseTradeVerdict(raw: string): TradeVerdict | null {
  const v = raw.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!v || /upcoming|ott|not released|unreleased|tba|none|n a|running|releas|shelved|direct/.test(v)) return null;
  if (/industry|all time|blockbuster|block buster/.test(v)) return "blockbuster";
  if (/super ?hitt?|superhit/.test(v)) return "super_hit";
  if (/disaster|utter flop|bomb|debacle/.test(v)) return "disaster";
  if (/below/.test(v)) return "below_average";
  if (/above/.test(v)) return "above_average";
  if (/semi ?hit/.test(v)) return "above_average";
  if (/flop/.test(v)) return "flop";
  if (/aver?a?ge|averge/.test(v)) return "average";
  if (/\bhitt?\b/.test(v)) return "hit";
  return null;
}

function yearOf(s: string): number | null {
  const m = /\b(19|20)(\d{2})\b/.exec(s);
  if (m) return Number(m[1] + m[2]);
  const short = /[-/ ](\d{2})\s*$/.exec(s.trim());
  return short ? 2000 + Number(short[1]) : null;
}

/** Extracts (title, year, verdict) rows from one blog page. `pageYear` is used when rows have no year. */
export function parseTradePage(html: string, pageYear: number | null = null): TradeRow[] {
  const rows: TradeRow[] = [];
  // 1. "<li>POKIRI : ALL TIME INDUSTRY HIT</li>"
  for (const m of html.matchAll(/<li[^>]*>([\s\S]{2,160}?)<\/li>/g)) {
    const t = text(m[1]);
    const mm = /^(.{2,80}?)\s*[:–-]\s*([A-Za-z ]{3,40})$/.exec(t);
    if (!mm) continue;
    const verdict = normaliseTradeVerdict(mm[2]);
    if (verdict) rows.push({ title: mm[1].trim(), year: pageYear, verdict, raw: mm[2].trim() });
  }
  // 2. Tables with a header row naming the movie and verdict columns.
  for (const table of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
    const trs = [...table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) => [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])));
    const hi = trs.findIndex((r) => r.some((c) => /verdict|hit or flop|result/i.test(c)) && r.some((c) => /movie|film|title|name/i.test(c)));
    if (hi < 0) continue;
    const head = trs[hi].map((c) => c.toLowerCase());
    const ti = head.findIndex((c) => /movie|film|title|name/.test(c));
    const vi = head.findIndex((c) => /verdict|hit or flop|result/.test(c));
    const yi = head.findIndex((c) => /year|release|date/.test(c));
    for (const r of trs.slice(hi + 1)) {
      if (r.length !== head.length || !r[ti]) continue;
      const verdict = normaliseTradeVerdict(r[vi] ?? "");
      if (!verdict) continue;
      rows.push({ title: r[ti].replace(/\s*\((?:19|20)\d{2}\)\s*$/, ""), year: (yi >= 0 ? yearOf(r[yi]) : null) ?? yearOf(r[ti]) ?? pageYear, verdict, raw: r[vi] });
    }
  }
  return rows;
}

/** Per-film posts ("<Film> Telugu Movie (2024) Budget, Hit or Flop…"): the stated final verdict, if any. */
export function parseFilmPost(html: string): { verdict: TradeVerdict; raw: string } | null {
  const body = text(html.slice(Math.max(0, html.indexOf("post-body"))));
  const m =
    /(?:final )?(?:box office )?verdict\s*[:\-–]?\s*(?:is\s*)?((?:all time |triple |double )?(?:industry hit|blockbuster|super ?hitt?|semi ?hit|hit|above average|average|below average|flop|disaster))\b/i.exec(body) ??
    /declared (?:as )?(?:an? )?((?:all time |triple |double )?(?:industry hit|blockbuster|super ?hit|semi ?hit|hit|above average|average|below average|flop|disaster))\b/i.exec(body);
  if (!m) return null;
  const verdict = normaliseTradeVerdict(m[1]);
  return verdict ? { verdict, raw: m[1] } : null;
}
