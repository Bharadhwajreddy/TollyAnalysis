import { getDirectors } from "@/lib/directors";
import { getLedger } from "@/lib/ledger";
import { heroThumb } from "@/components/hero/hero-avatar";
import { heroPhoto } from "@/lib/constants/photos";
import { getTollyRanking } from "@/lib/tolly/view";
import { getDashboardData } from "@/lib/repositories";

export const dynamic = "force-static";

/** The search index for the command palette (heroes, films, directors), fetched on first open. */
export async function GET() {
  const [ledger, directors, dash] = await Promise.all([getLedger(), getDirectors(), getDashboardData()]);
  const ranks = new Map(getTollyRanking().ranked.map((h) => [h.slug, h]));
  const heroes = dash.windows.all_time
    .map((h) => ({ k: "h" as const, s: h.slug, n: h.name, i: heroThumb(heroPhoto(h.slug)), r: ranks.get(h.slug)?.rank ?? null, x: ranks.get(h.slug)?.index ?? null, f: h.eligible }))
    .sort((a, b) => (a.r ?? 999) - (b.r ?? 999) || b.f - a.f);
  const films = [...ledger.films]
    .sort((a, b) => (b.gross ?? 0) - (a.gross ?? 0) || (b.score ?? 0) - (a.score ?? 0))
    .map((f) => ({ k: "f" as const, s: f.slug, n: f.title, y: f.year, o: f.outcome, h: f.heroes.map((h) => h.name).join(", ") }));
  const dirs = directors.map((d) => ({ k: "d" as const, s: d.slug, n: d.name, c: d.films.length, r: d.hitRate }));
  return Response.json({ heroes, films, directors: dirs });
}
