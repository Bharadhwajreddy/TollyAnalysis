import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getDirectors, MIN_JUDGED, type Director } from "@/lib/directors";
import { directorsJsonLd, directorsMetadata, JsonLd } from "@/lib/seo";

export const metadata: Metadata = directorsMetadata;

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const crore = (x: number) => (x >= 1000 ? `₹${(x / 1000).toFixed(2)}k cr` : `₹${Math.round(x).toLocaleString("en-IN")} cr`);

const SORTS = {
  rank: { label: "Hit rate", fn: null },
  hits: { label: "Most hits", fn: (a: Director, b: Director) => b.hits - a.hits || b.judged - a.judged },
  gross: { label: "Box office", fn: (a: Director, b: Director) => b.totalGross - a.totalGross },
  films: { label: "Most films", fn: (a: Director, b: Director) => b.films.length - a.films.length || b.hits - a.hits },
} as const;

function Initials({ name }: { name: string }) {
  const parts = name.replace(/[^A-Za-z &]/g, " ").split(/\s+/).filter((w) => w.length > 1 || /[A-Z]/.test(w));
  const ini = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2)).toUpperCase();
  return (
    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-wine/10 font-serif text-[15px] font-bold text-wine">
      {ini}
    </span>
  );
}

export default async function DirectorsPage(props: PageProps<"/directors">) {
  const sp = await props.searchParams;
  const sort = (typeof sp.sort === "string" && sp.sort in SORTS ? sp.sort : "rank") as keyof typeof SORTS;
  const [all, jsonLd] = await Promise.all([getDirectors(), directorsJsonLd()]);
  const ranked = all.filter((d) => d.ranked);
  const rest = all.filter((d) => !d.ranked);
  const fn = SORTS[sort].fn;
  const list = fn ? [...ranked].sort((a, b) => fn(a, b) || (a.rank ?? 0) - (b.rank ?? 0)) : ranked;
  const top = ranked.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow="Directors"
        title="Telugu directors, by hit rate"
        subtitle={
          <>
            Every Telugu film since 2000 with one of our heroes as lead, grouped by director. Ranked by hit rate; when two
            directors tie, the one with more films with a known result goes first, then more hits, then the bigger total box
            office. A director needs at least {MIN_JUDGED} films with a known result to be ranked.
          </>
        }
      />

      {/* Podium */}
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {top.map((d) => (
          <li key={d.slug}>
            <Link href={`/director/${d.slug}`} className="cinema block h-full rounded-2xl p-5 transition-shadow hover:shadow-lg">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c79c]">#{d.rank}</p>
              <p className="mt-1 font-serif text-[24px] font-bold leading-tight text-white">{d.name}</p>
              <p className="tabular mt-3 text-[34px] font-semibold leading-none text-white">{pct(d.hitRate)}</p>
              <p className="mt-1 text-[13px] text-[#e6d9cf]">
                {d.hits} hits in {d.judged} films · {d.firstYear}–{d.lastYear}
              </p>
            </Link>
          </li>
        ))}
      </ol>

      <nav aria-label="Sort directors" className="mt-8 flex flex-wrap gap-1.5 text-[13px]">
        {Object.entries(SORTS).map(([k, v]) => (
          <Link
            key={k}
            href={k === "rank" ? "/directors" : `/directors?sort=${k}`}
            aria-current={sort === k ? "true" : undefined}
            className={`rounded-full border px-3.5 py-1.5 font-medium ${sort === k ? "border-wine bg-wine text-white" : "border-line bg-surface text-ink hover:border-ink-2"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]" data-testid="director-table">
          <thead>
            <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Director</th>
              <th className="px-3 py-2.5 font-semibold">Hit rate</th>
              <th className="px-3 py-2.5 text-right font-semibold">Hits</th>
              <th className="px-3 py-2.5 text-right font-semibold">Films</th>
              <th className="px-3 py-2.5 text-right font-semibold">Blockbusters</th>
              <th className="px-3 py-2.5 text-right font-semibold">Box office</th>
              <th className="px-3 py-2.5 font-semibold">Biggest film</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.slug} className="border-b border-line/60 last:border-0 hover:bg-wine/[0.03]">
                <td className="tabular px-3 py-2.5 text-muted">{d.rank}</td>
                <td className="px-3 py-2.5">
                  <Link href={`/director/${d.slug}`} className="flex items-center gap-2.5 font-semibold text-ink hover:text-wine">
                    <Initials name={d.name} />
                    <span>
                      {d.name}
                      <span className="block text-[11.5px] font-normal text-muted">
                        {d.firstYear}–{d.lastYear} · {d.heroes.slice(0, 3).map((h) => h.name).join(", ")}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="tabular w-10 font-semibold text-ink">{pct(d.hitRate)}</span>
                    <span className="h-2 w-24 overflow-hidden rounded-full bg-line/70">
                      <span className="block h-full rounded-full bg-[#2f8f4e]" style={{ width: `${(d.hitRate ?? 0) * 100}%` }} />
                    </span>
                  </span>
                </td>
                <td className="tabular px-3 py-2.5 text-right">{d.hits}</td>
                <td className="tabular px-3 py-2.5 text-right">
                  {d.judged}
                  {d.films.length > d.judged && <span className="text-muted"> / {d.films.length}</span>}
                </td>
                <td className="tabular px-3 py-2.5 text-right">{d.blockbusters || "—"}</td>
                <td className="tabular px-3 py-2.5 text-right">{d.grossFilms ? crore(d.totalGross) : "—"}</td>
                <td className="px-3 py-2.5 text-ink-2">{d.biggest ? `${d.biggest.title} (${d.biggest.year})` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-muted">
        Films: with a known result / all films (too recent, direct to OTT or no reported result count only in the second number).
        Box office is the sum of reported worldwide grosses (lower figure where reports differ).
      </p>

      <details className="card mt-6 p-4">
        <summary className="cursor-pointer text-[14px] font-semibold text-ink">
          Not ranked yet: {rest.length} directors with fewer than {MIN_JUDGED} films with a known result
        </summary>
        <ul className="mt-3 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((d) => (
            <li key={d.slug}>
              <Link href={`/director/${d.slug}`} className="text-ink hover:text-wine">
                {d.name}
              </Link>{" "}
              <span className="text-muted">
                · {d.films.length} {d.films.length === 1 ? "film" : "films"}
                {d.judged ? `, ${d.hits} of ${d.judged} hits` : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
