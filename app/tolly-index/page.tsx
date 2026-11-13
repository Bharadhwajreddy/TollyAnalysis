import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { HeroAvatar } from "@/components/hero/hero-avatar";
import { BandBar, IndexValue } from "@/components/tolly/tolly-parts";
import { compactCount } from "@/lib/data/real/hero-facts";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled } from "@/lib/features";
import { getDashboardData } from "@/lib/repositories";
import { getTollyRanking, getTopTollyFilms, tollyMeta } from "@/lib/tolly/view";

export const metadata: Metadata = {
  title: "Tolly Index",
  description: "Every Telugu hero scored from 0 to 100 on his films, his box-office record, his fame and his form.",
};

export default async function TollyIndexPage() {
  if (!tollyIndexEnabled() || DATA_MODE !== "real") notFound();
  const { ranked, unranked } = getTollyRanking();
  const top = getTopTollyFilms(10);
  const m = tollyMeta;
  const photos = new Map((await getDashboardData()).windows.all_time.map((h) => [h.slug, h.photo]));
  const names = new Map((await getDashboardData()).windows.all_time.map((h) => [h.slug, h.name]));
  const updated = new Date(`${m.asOf}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader title="Tolly Index" subtitle="Every Telugu hero scored from 0 to 100 on his films, his box-office record, his fame and his form.">
        <p className="mt-2 text-[13px] text-muted">
          Updated {updated} ·{" "}
          <Link href="/methodology#tolly-index" className="font-medium text-wine hover:underline">
            How it works →
          </Link>
        </p>
      </PageHeader>

      {/* Top three */}
      <ol aria-label="Top three heroes" className="mt-6 grid gap-3 sm:grid-cols-3">
        {ranked.slice(0, 3).map((h) => (
          <li key={h.slug}>
            <Link href={`/hero/${h.slug}#tolly`} className="card flex items-center gap-4 p-4 transition-colors hover:border-wine/40">
              <span className="relative shrink-0">
                <HeroAvatar name={h.name} photo={photos.get(h.slug) ?? null} industry="telugu" color="#7a1f3d" size={72} />
                <span className="tabular absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-wine text-[13px] font-bold text-white ring-2 ring-surface">{h.rank}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-[20px] font-semibold text-ink">{h.name}</span>
                <span className="tabular block text-[26px] font-semibold leading-tight text-wine">
                  {h.index?.toFixed(1)}
                  {h.band !== null && <span className="ml-1.5 text-[13px] font-normal text-muted">± {h.band.toFixed(1)}</span>}
                </span>
                {h.best[0] && <span className="block truncate text-[12.5px] text-ink-2">Best: {h.best[0].title}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <section aria-labelledby="ranking" className="card mt-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="ranking" className="font-serif text-[24px] font-semibold text-ink">
            Hero ranking
          </h2>
          <p className="text-[12px] text-muted">± shows how sure we are. Every column is out of 100.</p>
        </div>
        <div className="scroll-x mt-3 rounded-lg border border-line">
          <table className="w-full min-w-[1000px] text-[13.5px]">
            <thead className="bg-surface-2 text-[10.5px] uppercase tracking-wide text-ink-2">
              <tr>
                <th scope="col" className="px-2.5 py-2 text-left">#</th>
                <th scope="col" className="px-2.5 py-2 text-left">Hero</th>
                <th scope="col" className="px-2.5 py-2 text-left">Tolly Index</th>
                <th scope="col" className="w-[200px] px-2.5 py-2 text-left">Range</th>
                <th scope="col" className="px-2.5 py-2 text-right">Audience</th>
                <th scope="col" className="px-2.5 py-2 text-right">Box office</th>
                <th scope="col" className="px-2.5 py-2 text-right">Fame</th>
                <th scope="col" className="px-2.5 py-2 text-right">Recent form</th>
                <th scope="col" className="px-2.5 py-2 text-right">Experience</th>
                <th scope="col" className="px-2.5 py-2 text-left">Best film</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((h) => (
                <tr key={h.slug} className="border-t border-line">
                  <td className="tabular px-2.5 py-2 text-muted">{h.rank}</td>
                  <td className="px-2.5 py-1.5 font-medium">
                    <Link href={`/hero/${h.slug}#tolly`} className="flex items-center gap-2.5 text-ink hover:text-wine">
                      <HeroAvatar name={h.name} photo={photos.get(h.slug) ?? null} industry="telugu" color="#7a1f3d" size={30} />
                      {h.name}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2">
                    <IndexValue hero={h} size="sm" />
                  </td>
                  <td className="px-2.5 py-2">
                    <BandBar index={h.index as number} band={h.band} />
                  </td>
                  {(["audience", "success", "fame", "recent", "career"] as const).map((k) => (
                    <td key={k} className="tabular px-2.5 py-2 text-right" title={k === "fame" && h.followers ? `${compactCount(h.followers.total)} followers` : undefined}>
                      {h.factors?.[k].value?.toFixed(1) ?? "—"}
                    </td>
                  ))}
                  <td className="px-2.5 py-2 text-ink-2">{h.best[0] ? `${h.best[0].title} (${h.best[0].year})` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="films" className="card p-4 sm:p-6">
          <h2 id="films" className="font-serif text-[22px] font-semibold text-ink">
            Top 10 films
          </h2>
          <ol className="mt-3 divide-y divide-line text-[13px]">
            {top.map((f, i) => (
              <li key={f.key} className="grid grid-cols-[28px_1fr_auto] items-baseline gap-2 py-1.5">
                <span className="tabular text-muted">{i + 1}</span>
                <span className="font-medium text-ink">
                  {f.title} <span className="font-normal text-muted">({f.year})</span>
                  <span className="block text-[12px] font-normal text-ink-2">{f.heroes.map((slug) => names.get(slug) ?? slug).join(", ")}</span>
                </span>
                <span className="tabular font-semibold text-wine">{f.index?.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="unranked" className="card p-4 sm:p-6">
          <h2 id="unranked" className="font-serif text-[22px] font-semibold text-ink">
            Not ranked yet
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Too few of their films have audience ratings so far.</p>
          <ul className="mt-3 divide-y divide-line text-[13px]">
            {unranked.map((h) => (
              <li key={h.slug} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                <Link href={`/hero/${h.slug}#tolly`} className="font-medium text-ink hover:text-wine hover:underline">
                  {h.name}
                </Link>
                <span className="tabular text-muted">{h.judged ? `${h.complete} of ${h.judged} films rated` : "no films to rate yet"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
