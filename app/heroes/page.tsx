import type { Metadata } from "next";
import { FocusProvider } from "@/components/charts/focus";
import { HeroesLedger, type GroupBy, type HeroMeta, type DirectorOption } from "@/components/heroes/heroes-ledger";
import { PageHeader } from "@/components/layout/page-header";
import { getDirectors } from "@/lib/directors";
import { HERO_METRICS } from "@/lib/ledger-metrics";
import { getHeroSummaries, heroLedgerRows, spineEnd } from "@/lib/ledger-rows";
import { getDashboardData } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Heroes",
  description: "Every hero the site tracks, with every film of his career on one timeline: search, group by family, industry or debut era, and light up a director's films.",
};

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const GROUPS: GroupBy[] = ["none", "family", "industry", "era"];

export default async function HeroesPage(props: PageProps<"/heroes">) {
  const sp = await props.searchParams;
  const [rows, summaries, dash, dirs] = await Promise.all([heroLedgerRows(), getHeroSummaries(), getDashboardData(), getDirectors()]);
  const { end, partialFrom } = spineEnd();
  const debut = new Map(dash.windows.all_time.map((h) => [h.slug, h.debutYear]));
  const meta: Record<string, HeroMeta> = Object.fromEntries(
    summaries.map((s) => [s.slug, { family: s.family, industry: s.industry, debut: debut.get(s.slug) ?? s.debut, rank: s.qualified ? s.rank : null }]),
  );
  // Directors who made films with at least two of these heroes, busiest first.
  const directors: DirectorOption[] = dirs
    .map((d) => ({ slug: d.slug, name: d.name, films: d.films.length, heroes: d.heroes.length, hits: d.hits }))
    .filter((d) => d.films >= 4 && d.heroes >= 2)
    .sort((a, b) => b.films - a.films || a.name.localeCompare(b.name))
    .slice(0, 60);
  const ranked = summaries.filter((s) => s.qualified).length;
  const group = one(sp.group) as GroupBy | undefined;
  const metric = one(sp.sort);
  const dir = one(sp.director);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Heroes"
        subtitle={`${rows.length} heroes and every film they have led since 2000: ${ranked} Telugu heroes in the Tolly Index, plus Telugu heroes not ranked yet and Tamil, Malayalam and Kannada stars whose films release in Telugu.`}
      />
      <div className="mt-8">
        <FocusProvider initial={dir && directors.some((d) => d.slug === dir) ? { kind: "director", key: dir, label: directors.find((d) => d.slug === dir)!.name } : null}>
          <HeroesLedger
            rows={rows}
            meta={meta}
            directors={directors}
            end={end}
            partialFrom={partialFrom}
            initial={{
              q: one(sp.q) ?? "",
              group: group && GROUPS.includes(group) ? group : "none",
              metric: metric && HERO_METRICS.some((m) => m.key === metric) ? metric : "index",
            }}
          />
        </FocusProvider>
      </div>
    </div>
  );
}
