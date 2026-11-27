import "server-only";
import { GROUPS, groupValue } from "@/components/tolly/tolly-parts";
import type { HeroMetricKey } from "@/lib/calculations/engine";
import type { FilterWindow } from "@/lib/domain/types";
import { getLedger, isHit, isJudged, toDot } from "@/lib/ledger";
import { getHeroSummaries } from "@/lib/ledger-rows";
import type { Outcome } from "@/lib/ledger-types";
import { getDashboardData } from "@/lib/repositories";
import { getTollyHero, getTollyRanking } from "@/lib/tolly/view";
import type { ExplorerHero, PillarKey, WindowedKey } from "@/lib/explorer-types";
import { WINDOWED_KEYS } from "@/lib/explorer-types";

export type { ExplorerHero } from "@/lib/explorer-types";

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "");

/** Find the ledger atom for a "best film" given by title and year. */
async function bestFilm(slug: string, title: string, year: number): Promise<{ slug: string; title: string; year: number; o: Outcome } | null> {
  const ledger = await getLedger();
  const films = ledger.byHero.get(slug) ?? [];
  const n = norm(title);
  const f = films.find((x) => x.year === year && norm(x.title) === n) ?? films.find((x) => norm(x.title) === n) ?? films.find((x) => x.year === year && (norm(x.title).startsWith(n) || n.startsWith(norm(x.title))));
  return f ? { slug: f.slug, title: f.title, year: f.year, o: f.outcome } : null;
}

/**
 * Everything the Index explorer, the Heroes ledger and Compare need per hero, in one client-safe shape:
 * the index and its five parts (0–100 values only; the recipe is not published), the counts behind them,
 * and the box-office/career numbers for each time window.
 */
export async function getExplorerHeroes(opts: { films?: boolean } = {}): Promise<ExplorerHero[]> {
  const [summaries, dash, ledger] = await Promise.all([getHeroSummaries(), getDashboardData(), getLedger()]);
  const byWindow = Object.fromEntries((Object.keys(dash.windows) as FilterWindow[]).map((w) => [w, new Map(dash.windows[w].map((h) => [h.slug, h]))])) as Record<FilterWindow, Map<string, (typeof dash.windows.all_time)[number]>>;
  return Promise.all(
    summaries.map(async (s) => {
      const t = getTollyHero(s.slug);
      const dv = byWindow.all_time.get(s.slug);
      const films = ledger.byHero.get(s.slug) ?? [];
      const judged = films.filter(isJudged);
      const pillars = Object.fromEntries(GROUPS.map((g) => [g.key, t?.factors ? groupValue(t, g.key).value : null])) as Record<PillarKey, number | null>;
      const w = Object.fromEntries(
        (Object.keys(byWindow) as FilterWindow[]).map((win) => {
          const hv = byWindow[win].get(s.slug);
          return [win, Object.fromEntries(WINDOWED_KEYS.map((k) => [k, hv ? (hv.m[k as HeroMetricKey]?.v ?? null) : null])) as Record<WindowedKey, number | null>];
        }),
      ) as ExplorerHero["w"];
      const c = t?.career ?? null;
      const best = t?.best[0] ? await bestFilm(s.slug, t.best[0].title, t.best[0].year) : null;
      const biggest = films.reduce<(typeof films)[number] | null>((b, f) => (f.gross !== null && (b === null || (b.gross ?? 0) < f.gross) ? f : b), null);
      return {
        slug: s.slug,
        name: s.name,
        img: s.img,
        rank: s.qualified ? s.rank : null,
        index: s.qualified ? s.index : null,
        band: s.qualified ? s.band : null,
        pillars,
        industry: s.industry,
        family: s.family,
        debut: dv?.debutYear ?? s.debut,
        films: films.length,
        judged: judged.length,
        hits: judged.filter(isHit).length,
        blockbusters: judged.filter((f) => f.outcome === "blockbuster").length,
        hitRate: s.hitRate === null ? null : s.hitRate * 100,
        gross: s.gross || null,
        grossFilms: films.filter((f) => f.gross !== null).length,
        topGross: biggest?.gross ?? null,
        bigFilms: films.filter((f) => (f.gross ?? 0) >= 100).length,
        followers: t?.followers?.total ?? null,
        yearsActive: c?.yearsActive ?? null,
        releaseGap: c?.releaseGap ?? null,
        peakFilms: c?.peakFilms ?? null,
        recentHits: c?.recentHits ?? null,
        recentJudged: c?.recentJudged ?? null,
        best,
        biggest: biggest ? { slug: biggest.slug, title: biggest.title, year: biggest.year, o: biggest.outcome } : null,
        reason: s.qualified ? null : reasonText(s.industry, t?.reason ?? null, films.length),
        complete: t?.complete ?? 0,
        completeOf: t?.judged ?? 0,
        w,
        dots: opts.films ? films.map(toDot) : undefined,
      } satisfies ExplorerHero;
    }),
  );
}

/** The true reason a hero has no index, in plain words (never "too few rated" when every film is rated). */
export function reasonText(industry: string, raw: string | null, films: number): string {
  if (industry !== "telugu") {
    const r = raw ?? "";
    if (/box-office record/.test(r)) return "Box-office record being checked";
    const m = r.match(/only (\d+) complete films?/);
    if (m) return `${m[1]} fully scored films so far; 5 needed`;
    return "Outside the Telugu index";
  }
  if (!raw) return "Not ranked yet";
  let m = raw.match(/^only (\d+) complete films? \(needs (\d+)\)/);
  if (m) return `${m[1]} of his ${films} films fully scored so far; ${m[2]} needed`;
  m = raw.match(/^(\d+) of (\d+) films complete \((\d+)%, needs (\d+)%\)/);
  if (m) return `${m[1]} of ${m[2]} judged films fully scored (${m[3]}%); ${m[4]}% needed`;
  if (/no Telugu lead films/.test(raw)) return "No Telugu films as lead since 2000";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Ranked heroes, best first. */
export function rankedOrder(): string[] {
  return getTollyRanking().ranked.map((h) => h.slug);
}
