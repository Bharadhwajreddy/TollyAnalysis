/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import Link from "next/link";
import { initialsOf } from "@/components/hero/hero-avatar";

export interface FamePoint {
  slug: string;
  name: string;
  thumb: string | null;
  /** Score from his films alone, 0–100. */
  films: number;
  /** Fame 0–100 (log scale of followers). */
  fame: number;
  followers: string;
  /** Ring colour (debut era or film family). */
  color?: string;
}

const Y_TICKS = [
  { at: 0, label: "10K" },
  { at: 25, label: "100K" },
  { at: 50, label: "1M" },
  { at: 75, label: "10M" },
  { at: 100, label: "100M" },
];

/**
 * The one chart on the home page: every ranked hero's photo placed by how well his films are
 * received (across) and how many people follow him (up). Each photo links to the hero's page.
 */
export function FameChart({ points }: { points: FamePoint[] }) {
  if (points.length === 0) return <p className="py-10 text-center text-[13.5px] text-muted">Every group is hidden. Tap a colour above to show it.</p>;
  const lo = Math.floor((Math.min(...points.map((p) => p.films)) - 3) / 5) * 5;
  const hi = Math.ceil((Math.max(...points.map((p) => p.films)) + 2) / 5) * 5;
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const xTicks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5).filter((t) => (t - lo) % 10 === 0 || hi - lo <= 30);
  // Biggest names drawn last so they sit on top where photos overlap.
  const ordered = [...points].sort((a, b) => a.fame + a.films - (b.fame + b.films));
  return (
    <figure className="m-0">
      <div className="flex gap-2">
        <div aria-hidden className="relative w-9 shrink-0 text-right text-[10.5px] text-muted sm:w-11 sm:text-[11px]">
          {Y_TICKS.map((t) => (
            <span key={t.at} className="tabular absolute right-0 translate-y-1/2" style={{ bottom: `${t.at}%` }}>
              {t.label}
            </span>
          ))}
        </div>
        <div className="relative h-[340px] flex-1 rounded-lg border border-line bg-surface-2/60 sm:h-[440px]">
          {Y_TICKS.slice(1, -1).map((t) => (
            <span key={t.at} aria-hidden className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${t.at}%` }} />
          ))}
          {xTicks.slice(1, -1).map((t) => (
            <span key={t} aria-hidden className="absolute inset-y-0 border-l border-dashed border-line" style={{ left: `${x(t)}%` }} />
          ))}
          <span aria-hidden className="absolute right-3 top-2.5 rounded-full bg-wine px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-white sm:text-[11px]">
            Loved and followed ↗
          </span>
          <span aria-hidden className="absolute left-3 top-2.5 hidden text-[10.5px] sm:block font-medium uppercase tracking-wide text-muted sm:text-[11px]">Big following</span>
          <span aria-hidden className="absolute bottom-2.5 right-3 text-[10.5px] font-medium uppercase tracking-wide text-muted sm:text-[11px]">Loved films</span>
          <ul aria-label="Heroes by film score and followers" className="absolute inset-x-5 inset-y-5 m-0 list-none p-0 sm:inset-x-7 sm:inset-y-7">
            {ordered.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/hero/${p.slug}`}
                  className="dot block h-7 w-7 bg-wine sm:h-10 sm:w-10"
                  style={{ left: `${x(p.films)}%`, bottom: `${p.fame}%`, boxShadow: `0 0 0 2.5px ${p.color ?? "var(--surface)"}` }}
                  aria-label={`${p.name}: films ${p.films.toFixed(1)}, ${p.followers} followers`}
                >
                  {p.thumb ? (
                    <img src={p.thumb} alt="" width={40} height={40} loading="lazy" decoding="async" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="grid h-full w-full place-items-center text-[10px] font-semibold text-white">
                      {initialsOf(p.name)}
                    </span>
                  )}
                  <span aria-hidden className="dot-tip">
                    <b className="block font-semibold">{p.name}</b>
                    Films {p.films.toFixed(1)} · {p.followers}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div aria-hidden className="relative ml-11 mt-1.5 h-4 text-[10.5px] text-muted sm:ml-[52px] sm:text-[11px]">
        <div className="absolute inset-x-5 sm:inset-x-7">
          {xTicks.map((t) => (
            <span key={t} className="tabular absolute -translate-x-1/2" style={{ left: `${x(t)}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="mt-1 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px] text-ink-2">
        <span>↑ Followers on Instagram and X</span>
        <span>How well his films are received (0–100) →</span>
      </figcaption>
    </figure>
  );
}
