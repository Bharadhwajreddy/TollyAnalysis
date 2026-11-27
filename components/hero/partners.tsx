import Link from "next/link";
import { FilmStrip } from "@/components/charts/film-strip";
import { DirectorToken, FilmToken, HeroToken } from "@/components/entity/tokens";
import type { FilmDot, Outcome } from "@/lib/ledger-types";

export interface PartnerDirector {
  slug: string | null;
  name: string;
  films: FilmDot[];
  hits: number;
  judged: number;
}
export interface PartnerHero {
  slug: string;
  name: string;
  films: { slug: string; title: string; year: number; o: Outcome }[];
}

/**
 * Who he works with: directors with two or more films, each with a strip of just those films on the same
 * timeline as the reel (so the eye can line them up), then the directors he made one film with, then the
 * heroes he shared the lead with.
 */
export function Partners({
  directors,
  heroes,
  start,
  end,
  partialFrom,
  compare,
  slug,
}: {
  directors: PartnerDirector[];
  heroes: PartnerHero[];
  start: number;
  end: number;
  partialFrom: number | null;
  compare: { slug: string; name: string; rank: number }[];
  slug: string;
}) {
  const repeat = directors.filter((d) => d.films.length >= 2);
  const once = directors.filter((d) => d.films.length < 2);
  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h3 className="label mb-3">Directors</h3>
        {repeat.length > 0 ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {repeat.map((d) => (
              <li key={d.name} className="grid items-center gap-x-6 gap-y-1.5 py-3 sm:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <DirectorToken slug={d.slug} name={d.name} mono className="text-[14.5px]" />
                  <p className="tabular mt-0.5 pl-[26px] text-[12.5px] text-muted">
                    {d.films.length} films · {d.judged ? `${d.hits} of ${d.judged} hits` : "no results reported"}
                  </p>
                </div>
                <FilmStrip films={d.films} start={start} end={end} height={26} partialFrom={partialFrom} ariaLabel={`${d.films.length} films with ${d.name}`} className="min-w-0" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted">He has not made two films with the same director.</p>
        )}
        {once.length > 0 && (
          <p className="mt-4 text-[13.5px] leading-[1.9] text-ink-2">
            <span className="mr-2 text-muted">One film each with</span>
            {once.map((d, i) => (
              <span key={d.name}>
                <DirectorToken slug={d.slug} name={d.name} className="!font-normal" />
                {i < once.length - 1 && <span className="text-faint">, </span>}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-10">
        <div>
          <h3 className="label mb-3">Shared the lead with</h3>
          {heroes.length ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {heroes.map((h) => (
                <li key={h.slug} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <HeroToken slug={h.slug} name={h.name} size={26} className="text-[14.5px]" />
                    <span className="tabular text-[12.5px] text-muted">{h.films.length === 1 ? "1 film" : `${h.films.length} films`}</span>
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-8 text-[13px]">
                    {h.films.map((f) => (
                      <FilmToken key={f.slug} slug={f.slug} title={f.title} year={f.year} o={f.o} className="!font-normal" />
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted">Every one of his tracked films is a solo lead.</p>
          )}
        </div>
        {compare.length > 0 && (
          <div>
            <h3 className="label mb-3">Compare with heroes ranked near him</h3>
            <ul className="divide-y divide-rule border-y border-rule">
              {compare.map((c) => (
                <li key={c.slug} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="tabular w-7 text-[12.5px] text-muted">#{c.rank}</span>
                    <HeroToken slug={c.slug} name={c.name} size={24} className="text-[14px]" />
                  </span>
                  <Link href={`/compare?heroes=${slug},${c.slug}`} className="link text-[13px] font-medium">
                    Compare
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
