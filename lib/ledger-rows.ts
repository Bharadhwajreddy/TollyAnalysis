import "server-only";
import { heroThumb } from "@/components/hero/hero-avatar";
import { heroPhoto } from "@/lib/constants/photos";
import { getDirectors } from "@/lib/directors";
import { getLedger, isHit, isJudged, toDot } from "@/lib/ledger";
import { getDashboardData, getHeroExcluded } from "@/lib/repositories";
import { getTollyHero } from "@/lib/tolly/view";
import { releasesAsOf } from "@/lib/releases";

/** Fractional-year end of the spine (today) and where the running year starts. */
export function spineEnd(): { end: number; partialFrom: number } {
  const [y, m, d] = releasesAsOf.split("-").map(Number);
  return { end: y + (m - 1) / 12 + d / 365 + 0.15, partialFrom: y };
}

export interface HeroSummary {
  slug: string;
  name: string;
  img: string | null;
  rank: number | null;
  index: number | null;
  band: number | null;
  audience: number | null;
  fame: number | null;
  films: number;
  judged: number;
  hits: number;
  hitRate: number | null;
  gross: number;
  debut: number | null;
  industry: string;
  family: string;
  qualified: boolean;
  reason: string | null;
}

let summaries: HeroSummary[] | null = null;

/** Every hero the site tracks, with the numbers the Ledger sorts by — computed from the same films the marks show. */
export async function getHeroSummaries(): Promise<HeroSummary[]> {
  if (summaries) return summaries;
  const [dash, ledger] = await Promise.all([getDashboardData(), getLedger()]);
  summaries = dash.windows.all_time.map((h) => {
    const t = getTollyHero(h.slug);
    const films = ledger.byHero.get(h.slug) ?? [];
    const judged = films.filter(isJudged);
    const hits = judged.filter(isHit).length;
    return {
      slug: h.slug,
      name: h.name,
      img: heroThumb(heroPhoto(h.slug)),
      rank: t?.rank ?? null,
      index: t?.index ?? null,
      band: t?.band ?? null,
      audience: t?.factors?.audience.value ?? t?.filmIndex ?? null,
      fame: t?.fame ?? null,
      films: films.length,
      judged: judged.length,
      hits,
      hitRate: judged.length >= 3 ? hits / judged.length : null,
      gross: films.reduce((s, f) => s + (f.gross ?? 0), 0),
      debut: films[0]?.year ?? h.firstYear,
      industry: h.industry,
      family: h.family,
      qualified: !!t?.qualified && t.rank !== null,
      reason: t?.reason ?? null,
    };
  });
  return summaries;
}

/** The next announced film for a hero, if any (shown as a dashed "?" mark; never scored). */
export async function nextFilm(slug: string): Promise<{ title: string; year: number } | null> {
  const ex = await getHeroExcluded(slug);
  const n = ex.filter((e) => /not yet released/i.test(e.reason ?? "") && !/[="]/.test(e.title) && e.year !== null).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))[0];
  if (!n) return null;
  return { title: n.title.replace(/^unlinked:/, "").replace(/\|\d{4}$/, "").replace(/ \((\d{4} )?(Indian |Telugu |Tamil |Malayalam )?film\)$/, ""), year: n.year as number };
}

export async function heroLedgerRows(filter?: (h: HeroSummary) => boolean) {
  const [list, ledger] = await Promise.all([getHeroSummaries(), getLedger()]);
  const picked = filter ? list.filter(filter) : list;
  return Promise.all(
    picked.map(async (h) => ({
      key: h.slug,
      href: `/hero/${h.slug}`,
      name: h.name,
      img: h.img,
      kind: "hero" as const,
      films: (ledger.byHero.get(h.slug) ?? []).map(toDot),
      values: { index: h.index, audience: h.audience, hitRate: h.hitRate === null ? null : h.hitRate * 100, gross: h.gross || null, films: h.films, fame: h.fame },
      bands: { index: h.band },
      note: h.qualified ? `${h.films} films · ${h.hits} hits` : `${h.films} films · ${h.industry === "telugu" ? "not ranked yet" : "outside the Telugu index"}`,
      upcoming: await nextFilm(h.slug),
    })),
  );
}

export async function directorLedgerRows() {
  const [dirs, ledger] = await Promise.all([getDirectors(), getLedger()]);
  return dirs
    .filter((d) => d.films.length >= 3)
    .map((d) => ({
      key: d.slug,
      href: `/director/${d.slug}`,
      name: d.name,
      img: null,
      kind: "director" as const,
      films: (ledger.byDirector.get(d.slug) ?? []).filter((f) => f.language === "te" && f.year >= 2000).map(toDot),
      values: { hitRate: d.ranked && d.hitRate !== null ? d.hitRate * 100 : null, hits: d.hits, films: d.films.length, gross: d.totalGross || null },
      note: `${d.films.length} films · ${d.hits} of ${d.judged} hits`,
    }));
}
