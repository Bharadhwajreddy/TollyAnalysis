import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroesGrid, HeroesGridView } from "@/components/heroes/heroes-grid";
import { getDashboardData } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "All Telugu Heroes — Filmography, Hits & Flops Directory",
  description:
    "Browse every Telugu cinema lead actor profiled on Tollywood Analysis: sort by Star Score, name, total lead films or debut year to inspect hits, flops and box office.",
  path: "/heroes",
  keywords: [
    "Telugu heroes list",
    "Tollywood actors list",
    "Telugu heroes hits and flops list",
    "Telugu cinema lead actors",
    "Tollywood heroes debut year",
  ],
});

export default async function HeroesPage() {
  const data = await getDashboardData();
  const heroesData = data.windows.all_time;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <div className="pt-8">
        <h1 className="font-serif text-[34px] font-bold tracking-tight text-ink sm:text-[44px]">All heroes</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-ink-2">
          {heroesData.length} heroes: Telugu stars, plus Tamil, Malayalam and Kannada stars whose films release in Telugu. Open a card to see his films.
        </p>
      </div>
      <Suspense fallback={<HeroesGridView heroes={heroesData} sort="star" />}>
        <HeroesGrid heroes={heroesData} />
      </Suspense>
    </div>
  );
}
