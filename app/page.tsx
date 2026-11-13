/* eslint-disable @next/next/no-img-element -- small local portraits */
import Link from "next/link";
import type { CSSProperties } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { heroThumb, initialsOf } from "@/components/hero/hero-avatar";
import { FameChart, type FamePoint } from "@/components/home/fame-chart";
import { HeroSearch } from "@/components/home/hero-search";
import { FanRanking } from "@/components/ranking/fan-ranking";
import { compactCount } from "@/lib/data/real/hero-facts";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled, userRankingEnabled } from "@/lib/features";
import { getDashboardData } from "@/lib/repositories";
import { getTollyRanking, getTopTollyFilms, tollyMeta } from "@/lib/tolly/view";

const MEDAL = ["#d8a86b", "#c9c2bb", "#c08a5e"];
const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

const EXPLORE = [
  {
    href: "/tolly-index",
    title: "Full Tolly Index",
    text: "Every ranked hero, with what lifts and lowers his score.",
    icon: "M4 19V9m6 10V5m6 14v-7",
  },
  {
    href: "/star-score",
    title: "Star Score",
    text: "Hits, flops and box office, with every chart.",
    icon: "m12 4 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8z",
  },
  {
    href: "/compare",
    title: "Compare heroes",
    text: "Put two or more heroes side by side.",
    icon: "M8 5v14M16 5v14M4 9h8M12 15h8",
  },
  {
    href: "/trends",
    title: "Trends",
    text: "How careers rose and fell, year by year.",
    icon: "m4 16 5-5 4 3 7-8M15 6h5v5",
  },
];

function Face({ name, thumb, size, ring }: { name: string; thumb: string | null; size: number; ring?: string }) {
  return (
    <span
      aria-hidden
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-wine"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }}
    >
      {thumb ? (
        <img src={thumb} alt="" width={size} height={size} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold text-white" style={{ fontSize: size * 0.36 }}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}

export default async function HomePage() {
  const data = await getDashboardData();
  const all = data.windows.all_time;

  // Demo / live data, or the index switched off: the career dashboard is the home page, as before.
  if (!tollyIndexEnabled() || DATA_MODE !== "real") {
    const heroes = all.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry }));
    return <Dashboard data={data}>{userRankingEnabled() && <FanRanking heroes={heroes} />}</Dashboard>;
  }

  const { ranked } = getTollyRanking();
  const m = tollyMeta;
  const thumbs = new Map(all.map((h) => [h.slug, heroThumb(h.photo)]));
  const names = new Map(all.map((h) => [h.slug, h.name]));
  const top10 = ranked.slice(0, 10);
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const films = getTopTollyFilms(5);
  const followed = [...ranked].filter((h) => h.followers).sort((a, b) => (b.followers?.total ?? 0) - (a.followers?.total ?? 0));
  const points: FamePoint[] = ranked
    .filter((h) => h.fame !== null && h.filmIndex !== null && h.followers)
    .map((h) => ({
      slug: h.slug,
      name: h.name,
      thumb: thumbs.get(h.slug) ?? null,
      films: h.filmIndex as number,
      fame: h.fame as number,
      followers: compactCount(h.followers?.total ?? 0),
    }));
  const search = all
    .map((h) => ({ slug: h.slug, name: h.name, thumb: thumbs.get(h.slug) ?? null, rank: ranked.find((r) => r.slug === h.slug)?.rank ?? null }))
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));
  const wall = [...search];
  const updated = new Date(`${m.asOf}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const maxIndex = Math.max(...top10.map((h) => h.index as number));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
      {/* Banner: the question, a search box, and the answer */}
      <section aria-labelledby="home-title" className="cinema relative mt-4 overflow-hidden rounded-2xl px-5 pb-0 pt-8 shadow-xl sm:px-10 sm:pt-12">
        <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div className="pb-2 lg:pb-12">
            <p className="rise font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e8c79c]" style={delay(0)}>
              Telugu cinema · 2000 to today
            </p>
            <h1 id="home-title" className="rise mt-3 font-serif text-[36px] font-bold leading-[1.04] tracking-tight text-white sm:text-[56px]" style={delay(0.08)}>
              Who is Tollywood&apos;s <span className="text-[#f0c98a]">biggest hero?</span>
            </h1>
            <p className="rise mt-4 max-w-xl text-[15.5px] leading-relaxed text-white/80 sm:text-[17px]" style={delay(0.16)}>
              {m.heroes.qualified} heroes, ranked by how much audiences love their films{m.fame.applied ? " and how many fans follow them" : ""}. One score out of 100: the Tolly
              Index.
            </p>
            <div className="rise mt-6" style={delay(0.24)}>
              <HeroSearch heroes={search} />
            </div>
            <div className="rise mt-4 flex flex-wrap gap-2.5" style={delay(0.32)}>
              <Link href="/tolly-index" className="rounded-full bg-[#f0c98a] px-5 py-2.5 text-[14px] font-semibold text-[#2b1c1a] transition-colors hover:bg-white">
                See the full ranking →
              </Link>
              <Link href="/compare" className="rounded-full border border-white/30 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:border-white">
                Compare heroes
              </Link>
            </div>
          </div>

          {/* Podium */}
          <ol aria-label="Top three heroes" className="mx-auto grid w-full max-w-[520px] grid-cols-3 items-end gap-2 sm:gap-3">
            {podium.map((h) => {
              const place = (h.rank ?? 1) - 1;
              const first = place === 0;
              return (
                <li key={h.slug} className="min-w-0">
                  <Link href={`/hero/${h.slug}`} className="group block text-center">
                    <span className="rise block" style={delay(0.35 + (first ? 0.3 : place === 1 ? 0.15 : 0))}>
                      <span className="inline-block transition-transform duration-200 group-hover:-translate-y-1.5">
                        <span className="hidden sm:inline-block">
                          <Face name={h.name} thumb={thumbs.get(h.slug) ?? null} size={first ? 132 : 104} ring={MEDAL[place]} />
                        </span>
                        <span className="sm:hidden">
                          <Face name={h.name} thumb={thumbs.get(h.slug) ?? null} size={first ? 92 : 74} ring={MEDAL[place]} />
                        </span>
                      </span>
                      <span className="mt-2.5 block truncate text-[13.5px] font-semibold text-white sm:text-[16px]">{h.name}</span>
                      <span className="tabular block font-serif text-[22px] font-bold leading-tight sm:text-[30px]" style={{ color: MEDAL[place] }}>
                        {h.index?.toFixed(1)}
                      </span>
                    </span>
                    <span
                      className="grow-y mt-2 grid place-items-start justify-center rounded-t-lg pt-2 font-serif text-[22px] font-bold text-[#2b1c1a] sm:text-[28px]"
                      style={{
                        ...delay(0.2 + (first ? 0.3 : place === 1 ? 0.15 : 0)),
                        height: first ? 96 : place === 1 ? 68 : 48,
                        background: `linear-gradient(180deg, ${MEDAL[place]} 0%, ${MEDAL[place]}cc 100%)`,
                      }}
                    >
                      {h.rank}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Four numbers */}
      <ul aria-label="At a glance" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { v: String(m.heroes.qualified), l: "heroes ranked" },
          { v: m.films.complete.toLocaleString("en-IN"), l: "films scored" },
          { v: followed[0] ? compactCount(followed[0].followers?.total ?? 0) : "—", l: followed[0] ? `followers: ${followed[0].name}, the most followed` : "followers" },
          { v: films[0]?.index?.toFixed(1) ?? "—", l: films[0] ? `top film: ${films[0].title}` : "top film" },
        ].map((s) => (
          <li key={s.l} className="card px-4 py-3.5 sm:px-5">
            <span className="tabular block font-serif text-[28px] font-bold leading-none text-wine sm:text-[34px]">{s.v}</span>
            <span className="mt-1.5 block text-[12.5px] leading-snug text-ink-2 sm:text-[13.5px]">{s.l}</span>
          </li>
        ))}
      </ul>

      {/* Top 10 + two short lists */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section aria-labelledby="top10" className="card reveal p-4 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="section-kicker">Tolly Index</p>
              <h2 id="top10" className="mt-1 font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
                The top 10
              </h2>
            </div>
            <Link href="/tolly-index" className="whitespace-nowrap text-[13.5px] font-semibold text-wine hover:underline">
              All {ranked.length} heroes →
            </Link>
          </div>
          <ol className="mt-4 space-y-1">
            {top10.map((h, i) => (
              <li key={h.slug}>
                <Link href={`/hero/${h.slug}`} className="group grid grid-cols-[26px_44px_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-wine-soft/60 sm:grid-cols-[28px_48px_1fr_auto] sm:px-3">
                  <span
                    className="tabular grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold"
                    style={i < 3 ? { background: MEDAL[i], color: "#2b1c1a" } : { color: "var(--muted)" }}
                  >
                    {h.rank}
                  </span>
                  <Face name={h.name} thumb={thumbs.get(h.slug) ?? null} size={44} />
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold text-ink group-hover:text-wine">{h.name}</span>
                      {h.best[0] && <span className="hidden truncate text-[12px] text-muted sm:block">Best: {h.best[0].title}</span>}
                    </span>
                    <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                      <span
                        className="fill-x block h-full rounded-full"
                        style={{ width: `${((h.index as number) / maxIndex) * 100}%`, background: i < 3 ? "linear-gradient(90deg, #7a1f3d, #c2456f)" : "linear-gradient(90deg, #7a1f3d, #a3284f)" }}
                      />
                    </span>
                  </span>
                  <span className="tabular w-[46px] text-right font-serif text-[20px] font-bold text-wine">{h.index?.toFixed(1)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-4">
          <section aria-labelledby="top-films" className="card reveal p-4 sm:p-6">
            <p className="section-kicker">Films</p>
            <h2 id="top-films" className="mt-1 font-serif text-[22px] font-semibold text-ink">
              Best-loved films
            </h2>
            <ol className="mt-3 divide-y divide-line">
              {films.map((f, i) => (
                <li key={f.key} className="grid grid-cols-[22px_1fr_auto] items-baseline gap-2 py-2">
                  <span className="tabular text-[12.5px] text-muted">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold text-ink">
                      {f.title} <span className="font-normal text-muted">({f.year})</span>
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-2">{f.heroes.map((s) => names.get(s) ?? s).join(", ")}</span>
                  </span>
                  <span className="tabular text-[15px] font-bold text-wine">{f.index?.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          </section>

          {followed.length > 0 && (
            <section aria-labelledby="most-followed" className="card reveal p-4 sm:p-6">
              <p className="section-kicker">Fans</p>
              <h2 id="most-followed" className="mt-1 font-serif text-[22px] font-semibold text-ink">
                Most followed
              </h2>
              <ol className="mt-3 space-y-2.5">
                {followed.slice(0, 5).map((h) => (
                  <li key={h.slug}>
                    <Link href={`/hero/${h.slug}`} className="group grid grid-cols-[32px_1fr_auto] items-center gap-3">
                      <Face name={h.name} thumb={thumbs.get(h.slug) ?? null} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-ink group-hover:text-wine">{h.name}</span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <span className="fill-x block h-full rounded-full bg-[#b7791f]" style={{ width: `${((h.followers?.total ?? 0) / (followed[0].followers?.total ?? 1)) * 100}%` }} />
                        </span>
                      </span>
                      <span className="tabular text-[14px] font-bold text-ink">{compactCount(h.followers?.total ?? 0)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>

      {/* The one chart */}
      {points.length >= 10 && (
        <section aria-labelledby="fame-chart" className="card reveal mt-4 p-4 sm:p-6">
          <p className="section-kicker">Films vs. fame</p>
          <h2 id="fame-chart" className="mt-1 font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
            Loved on screen, followed online
          </h2>
          <p className="mt-1 text-[14px] text-ink-2">Every photo is a hero. Tap one to open his page.</p>
          <div className="mt-4">
            <FameChart points={points} />
          </div>
        </section>
      )}

      {/* Every hero */}
      <section aria-labelledby="wall" className="card reveal mt-4 p-4 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="section-kicker">The cast</p>
            <h2 id="wall" className="mt-1 font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">
              Pick a hero
            </h2>
          </div>
          <Link href="/heroes" className="whitespace-nowrap text-[13.5px] font-semibold text-wine hover:underline">
            All heroes →
          </Link>
        </div>
        <ul className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
          {wall.slice(0, 24).map((h) => (
            <li key={h.slug} className="min-w-0">
              <Link href={`/hero/${h.slug}`} className="group block text-center">
                <span className="inline-block transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105">
                  <Face name={h.name} thumb={h.thumb} size={60} />
                </span>
                <span className="mt-1.5 block truncate text-[11.5px] font-medium text-ink-2 group-hover:text-wine">{h.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Go deeper */}
      <section aria-labelledby="deeper" className="mt-8">
        <h2 id="deeper" className="font-serif text-[26px] font-semibold text-ink sm:text-[30px]">
          Go deeper
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="card lift group flex h-full flex-col p-5 hover:border-wine/40">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-wine-soft text-wine">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={e.icon} />
                  </svg>
                </span>
                <span className="mt-3 block font-serif text-[19px] font-semibold text-ink group-hover:text-wine">{e.title}</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-ink-2">{e.text}</span>
                <span aria-hidden className="mt-auto block pt-3 text-[13px] font-semibold text-wine">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[12.5px] text-muted">
          Film data from {updated}.{" "}
          <Link href="/methodology" className="font-medium text-wine hover:underline">
            How the scores work →
          </Link>
        </p>
      </section>

      {userRankingEnabled() && (
        <div className="mt-6">
          <FanRanking heroes={all.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry }))} />
        </div>
      )}
    </div>
  );
}
