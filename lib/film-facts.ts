import "server-only";
import { load } from "@/lib/repositories";
import { inr } from "@/lib/format";
import type { FilmAtom } from "@/lib/ledger-types";
import { getTollyFilm } from "@/lib/tolly/view";

/**
 * The details a film page or an expanded film row needs beyond the ledger atom: credits, the reported
 * verdict sentence and where it came from, money as reported (ranges kept), and the film score's three
 * pillars. Never the raw audience rating or vote count.
 */
export interface FilmFacts {
  music: string | null;
  runtime: number | null;
  genres: string[];
  /** The sentence the verdict was read from, or how it was calculated. */
  why: string | null;
  source: { label: string; url: string | null } | null;
  wiki: string | null;
  grossText: string;
  budgetText: string;
  multiple: number | null;
  pillars: { audience: number | null; reach: number | null; stay: number | null } | null;
  scoreStatus: string | null;
}

const SOURCE_TEXT: Record<string, string> = {
  "wikipedia-film": "Wikipedia film article",
  "wikipedia-hero": "Wikipedia hero article",
  "telugu-wikipedia": "Telugu Wikipedia",
  "trade-blog": "Trade blog (low confidence)",
  "editor-check": "Checked against trade reports",
};

const SKIP_GENRE = new Set(["soundtrack", "religious art", "drama film"]);

/** "action film" → "Action"; keeps at most three, most specific first. */
export function cleanGenres(raw: string[]): string[] {
  const out: string[] = [];
  for (const g of raw) {
    if (SKIP_GENRE.has(g)) continue;
    const t = g.replace(/ film$/i, "").trim();
    const nice = t.charAt(0).toUpperCase() + t.slice(1);
    if (!out.includes(nice)) out.push(nice);
  }
  if (!out.length && raw.includes("drama film")) out.push("Drama");
  return out.slice(0, 3);
}

/**
 * Money as reported: keeps a range the source gave ("₹25–35 crore" → "₹25–35 cr"), otherwise formats the value.
 * Lakh figures and notes ("distributors' share") fall back to the value the ledger uses.
 */
export function moneyText(text: string | null | undefined, value: number | null): string {
  const m = text ? /₹\s*([\d.,]+)\s*[–-]\s*([\d.,]+)\s*crore/i.exec(text) : null;
  if (m) {
    const a = Number(m[1].replace(/,/g, ""));
    const b = Number(m[2].replace(/,/g, ""));
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return `${inr(a, { unit: false })}–${inr(b, { unit: false }).replace("₹", "")} cr`;
  }
  return inr(value);
}

export async function getFilmFacts(f: FilmAtom): Promise<FilmFacts> {
  const l = await load();
  const fm = l.engine.films.get(f.id);
  const d = fm?.film.details;
  const c = fm?.commercial;
  const t = f.id.startsWith("f-") ? getTollyFilm(f.id.slice(2)) : null;
  const trade = c?.basis === "trade_verdict";
  const why = trade ? (d?.verdictSentence ?? c?.reason ?? null) : c?.label ? (c.reason ?? null) : null;
  const src = d?.verdictSource ?? null;
  const wiki = d?.wikiArticle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(d.wikiArticle.replace(/ /g, "_"))}` : null;
  return {
    music: d?.music ?? null,
    runtime: d?.runtimeMin ?? null,
    genres: cleanGenres(d?.genres ?? []),
    why: f.outcome === "recent" ? "Released recently: the result is not settled yet." : f.outcome === "ott" ? "Premiered straight on a streaming service, so there is no box-office result." : why,
    source: f.outcome === "recent" || f.outcome === "ott" ? null : trade && src ? { label: SOURCE_TEXT[src] ?? "Reported", url: d?.verdictUrl ?? wiki } : c?.basis === "gross_to_budget" ? { label: "Reported gross ÷ budget (Wikipedia)", url: wiki } : null,
    wiki,
    grossText: moneyText(d?.grossText, f.gross),
    budgetText: moneyText(d?.budgetText, f.budget),
    multiple: f.gross && f.budget ? f.gross / f.budget : null,
    pillars: t ? { audience: t.rating, reach: t.reach, stay: t.stay } : null,
    scoreStatus: t?.status ?? null,
  };
}
