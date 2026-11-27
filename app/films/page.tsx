import type { Metadata } from "next";
import { Suspense } from "react";
import { FilmsExplorer, type ExplorerFilm } from "@/components/films/films-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { int } from "@/lib/format";
import { getLedger } from "@/lib/ledger";

export const metadata: Metadata = {
  title: "Films",
  description: "Every film with a tracked hero since 2000: what it cost, what it made and how it is remembered. Budget against reported gross, and the most loved, biggest, most efficient films and biggest misses.",
};

export default async function FilmsPage() {
  const ledger = await getLedger();
  const films: ExplorerFilm[] = ledger.films.map((f) => ({
    s: f.slug,
    t: f.title,
    y: f.year,
    o: f.outcome,
    v: f.verdict,
    g: f.gross,
    b: f.budget,
    sc: f.score,
    h: f.heroes.map((h) => [h.slug, h.name] as [string, string]),
    d: f.director?.name ?? null,
    ds: f.director?.slug ?? null,
    te: f.language === "te",
  }));
  const telugu = films.filter((f) => f.te).length;
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-8 sm:px-6 lg:px-8">
      <PageHeader title="Films" subtitle={`${int(telugu)} Telugu films with a tracked hero since 2000, plus ${int(films.length - telugu)} films from other languages released in Telugu: what they cost, what they made, and how they are remembered.`} />
      <Suspense fallback={<div className="mt-8 h-[640px] rounded-[14px] bg-surface-2/60" />}>
        <FilmsExplorer films={films} />
      </Suspense>
    </div>
  );
}
