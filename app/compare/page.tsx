import type { Metadata } from "next";
import { FocusProvider } from "@/components/charts/focus";
import { Compare } from "@/components/compare/compare";
import { PageHeader } from "@/components/layout/page-header";
import { getExplorerHeroes } from "@/lib/explorer";
import { spineEnd } from "@/lib/ledger-rows";

export const metadata: Metadata = {
  title: "Compare heroes",
  description: "Two to four heroes side by side: their careers film by film (by calendar year or years since debut), the parts of the Tolly Index, every number, and the films and directors they share.",
};

export default async function ComparePage(props: PageProps<"/compare">) {
  const sp = await props.searchParams;
  const raw = typeof sp.heroes === "string" ? sp.heroes : typeof sp.h === "string" ? sp.h : "";
  const heroes = await getExplorerHeroes({ films: true });
  const known = new Set(heroes.map((h) => h.slug));
  const asked = [...new Set(raw.split(",").map((s) => s.trim()))].filter((s) => known.has(s)).slice(0, 4);
  // Default: the Tolly Index No. 1 and No. 2 (never alphabetical, never outside the Telugu index).
  const top = heroes
    .filter((h) => h.rank !== null)
    .sort((a, b) => (a.rank as number) - (b.rank as number) || a.name.localeCompare(b.name))
    .slice(0, 2)
    .map((h) => h.slug);
  // One hero asked for: pair him with the best-ranked other hero.
  if (asked.length === 1) asked.push(top.find((s) => s !== asked[0]) as string);
  const { end, partialFrom } = spineEnd();
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <PageHeader title="Compare heroes" subtitle="Up to four heroes side by side: every film of their careers, the parts of the Tolly Index, every number, and what they share." />
      <FocusProvider>
        <Compare heroes={heroes} initial={asked.length ? asked : top} end={end} partialFrom={partialFrom} />
      </FocusProvider>
    </div>
  );
}
