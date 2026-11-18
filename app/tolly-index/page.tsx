import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { heroThumb } from "@/components/hero/hero-avatar";
import { GROUPS, groupValue } from "@/components/tolly/tolly-parts";
import { TollyRanking, type RankingRow } from "@/components/tolly/tolly-ranking";
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
  const all = (await getDashboardData()).windows.all_time;
  const heroBy = new Map(all.map((h) => [h.slug, h]));
  const names = new Map(all.map((h) => [h.slug, h.name]));
  const rows: RankingRow[] = ranked.map((h) => ({
    slug: h.slug,
    name: h.name,
    thumb: heroThumb(heroBy.get(h.slug)?.photo ?? null),
    family: heroBy.get(h.slug)?.family ?? null,
    debutYear: heroBy.get(h.slug)?.debutYear ?? null,
    rank: h.rank as number,
    index: h.index as number,
    band: h.band,
    groups: GROUPS.map((g) => groupValue(h, g.key).value),
    best: h.best[0] ? `${h.best[0].title} (${h.best[0].year})` : null,
    followers: h.followers ? compactCount(h.followers.total) : null,
    provisional: !!heroBy.get(h.slug) && heroBy.get(h.slug)!.industry !== "telugu",
  }));
  const updated = new Date(`${m.asOf}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader title="Tolly Index" subtitle="Every hero in Telugu cinema scored from 0 to 100 on his films, his box-office record, his fame and his form.">
        <p className="mt-2 text-[13px] text-muted">
          Updated {updated} ·{" "}
          <Link href="/methodology#tolly-index" className="font-medium text-wine hover:underline">
            How it works →
          </Link>
        </p>
      </PageHeader>

      <TollyRanking rows={rows} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="films" className="card p-4 sm:p-6">
          <h2 id="films" className="font-serif text-[22px] font-semibold text-ink">
            Top 10 films
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Each film is scored out of 100 on audience rating (50%), reach (30%) and staying power (20%). Reach and staying power compare it with films released within a year of it.
          </p>
          <ol className="mt-3 divide-y divide-line text-[13px]">
            {top.map((f, i) => (
              <li key={f.key} className="grid grid-cols-[28px_1fr_auto] items-baseline gap-2 py-1.5">
                <span className="tabular text-muted">{i + 1}</span>
                <span className="font-medium text-ink">
                  {f.title} <span className="font-normal text-muted">({f.year})</span>
                  <span className="block text-[12px] font-normal text-ink-2">{f.heroes.map((slug) => names.get(slug) ?? slug).join(", ")}</span>
                  <span className="tabular block text-[11.5px] font-normal text-muted">
                    Rating {f.rating?.toFixed(0)} · Reach {f.reach?.toFixed(0)} · Staying power {f.stay?.toFixed(0)}
                  </span>
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
