import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CareerChart, type CareerPoint } from "@/components/hero/career-chart";
import { RESULT_LEVELS } from "@/lib/constants/results";
import { getDirector, getDirectors } from "@/lib/directors";
import { getDirectorSeo, JsonLd } from "@/lib/seo";

export async function generateStaticParams() {
  const directors = await getDirectors();
  return directors.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(props: PageProps<"/director/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const seo = await getDirectorSeo(slug);
  return seo ? seo.metadata : { title: "Director not found", robots: { index: false, follow: false } };
}

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const crore = (x: number) => `₹${Math.round(x).toLocaleString("en-IN")} cr`;
const RESULT = new Map<string, { label: string; color: string }>(RESULT_LEVELS.map((l) => [l.key, l]));

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.07] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#e8c79c]">{label}</p>
      <p className="tabular mt-1 text-[24px] font-semibold leading-none text-white">{value}</p>
      {note && <p className="mt-1 text-[11.5px] text-[#d9cbc0]">{note}</p>}
    </div>
  );
}

export default async function DirectorPage(props: PageProps<"/director/[slug]">) {
  const { slug } = await props.params;
  const [d, allDirectors, seo] = await Promise.all([getDirector(slug), getDirectors(), getDirectorSeo(slug)]);
  if (!d) notFound();
  const rankedCount = allDirectors.filter((x) => x.ranked).length;

  const points: CareerPoint[] = d.films.map((f) => ({
    id: f.id,
    title: f.title,
    date: f.date,
    year: f.year,
    result: f.result,
    gross: f.grossText ?? (f.gross ? crore(f.gross) : null),
    score: null,
    note: [f.heroes.map((h) => h.name).join(", "), f.recent ? "Recent release: the result may still change." : null].filter(Boolean).join(" · ") || null,
  }));
  const dated = [...d.films].reverse();
  const firstHit = d.films.find((f) => f.outcome === "hit");
  const latest = dated[0];
  // Longest run of hits in a row.
  let run = 0, best = 0;
  for (const f of d.films.filter((x) => x.outcome !== "unknown")) {
    run = f.outcome === "hit" ? run + 1 : 0;
    best = Math.max(best, run);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      {seo && <JsonLd data={seo.jsonLd} />}
      <div className="pt-5">
        <Link prefetch={false} href="/directors" className="text-sm font-medium text-wine hover:underline">
          ← All directors
        </Link>
      </div>

      <section className="cinema mt-4 rounded-2xl px-5 py-7 sm:px-9 sm:py-9">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c79c]">Telugu film director</p>
        <h1 className="mt-2 font-serif text-[38px] font-bold leading-none tracking-tight text-white sm:text-[56px]">{d.name}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#e6d9cf]">
          {d.films.length} Telugu {d.films.length === 1 ? "film" : "films"} with our heroes, {d.firstYear}–{d.lastYear}.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Hit rate" value={pct(d.hitRate)} note={d.ranked ? `#${d.rank} of ${rankedCount} directors` : `not ranked yet (needs 4 films with a result)`} />
          <Stat label="Hits" value={String(d.hits)} note={`in ${d.judged} films with a known result`} />
          <Stat label="Blockbusters" value={String(d.blockbusters)} note={best > 1 ? `best streak: ${best} hits in a row` : undefined} />
          <Stat label="Box office" value={d.grossFilms ? crore(d.totalGross) : "—"} note={d.grossFilms ? `${d.grossFilms} films with a reported gross` : "no reported gross"} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-[24px] font-bold text-ink">Career graph</h2>
        <p className="mt-1 text-[14px] text-ink-2">Every film by box-office result, in release order.</p>
        <div className="card mt-3 p-3 sm:p-4">
          <CareerChart points={points} name={d.name} />
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          d.films[0] && { k: "First film", t: d.films[0].title, n: String(d.films[0].year) },
          firstHit && { k: "First hit", t: firstHit.title, n: String(firstHit.year) },
          d.biggest && { k: "Biggest film", t: d.biggest.title, n: `${crore(d.biggest.gross ?? 0)} worldwide` },
          latest && { k: "Latest film", t: latest.title, n: latest.result ? (RESULT.get(latest.result)?.label ?? latest.result) : latest.recent ? "Too recent" : "Result not reported" },
        ]
          .filter((x): x is { k: string; t: string; n: string } => !!x)
          .map((m) => (
            <div key={m.k} className="card p-4">
              <p className="eyebrow">{m.k}</p>
              <p className="mt-1 font-semibold text-ink">{m.t}</p>
              <p className="text-[12.5px] text-muted">{m.n}</p>
            </div>
          ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <h2 className="font-serif text-[24px] font-bold text-ink">Films</h2>
          <div className="card mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={`${d.name} films table`}>
            <table className="w-full min-w-[560px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2.5 font-semibold">Film</th>
                  <th className="px-3 py-2.5 font-semibold">Hero</th>
                  <th className="px-3 py-2.5 font-semibold">Result</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Worldwide gross</th>
                </tr>
              </thead>
              <tbody>
                {dated.map((f) => {
                  const r = f.result ? RESULT.get(f.result) : null;
                  return (
                    <tr key={f.id} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-ink">{f.title}</span> <span className="text-muted">{f.year}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {f.heroes.map((h, i) => (
                          <span key={h.slug}>
                            {i > 0 && ", "}
                            <Link prefetch={false} href={`/hero/${h.slug}`} className="text-ink-2 hover:text-wine">
                              {h.name}
                            </Link>
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2.5">
                        {r ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                            {r.label}
                          </span>
                        ) : (
                          <span className="text-muted">{f.recent ? "Too recent" : "Not reported"}</span>
                        )}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-ink-2">{f.gross ? crore(f.gross) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="min-w-0">
          <h2 className="font-serif text-[24px] font-bold text-ink">Heroes worked with</h2>
          <ul className="card mt-3 divide-y divide-line/60">
            {d.heroes.map((h) => (
              <li key={h.slug} className="flex items-center justify-between px-3.5 py-2.5 text-[13.5px]">
                <Link prefetch={false} href={`/hero/${h.slug}`} className="font-medium text-ink hover:text-wine">
                  {h.name}
                </Link>
                <span className="tabular text-muted">
                  {h.films} {h.films === 1 ? "film" : "films"} · {h.hits} {h.hits === 1 ? "hit" : "hits"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            Counts Telugu films (including bilinguals) since 2000 that star one of the heroes we track. A hit means hit, super hit or
            blockbuster. Grosses as reported; dubbed films are not counted.
          </p>
        </aside>
      </section>
    </div>
  );
}
