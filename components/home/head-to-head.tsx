"use client";

/* eslint-disable @next/next/no-img-element -- tiny local thumbnails */
import Link from "next/link";
import { useId, useState } from "react";

export interface DuelHero {
  slug: string;
  name: string;
  thumb: string | null;
  rank: number;
  index: number;
  /** Factor values 0–100 in display order, with the fact behind each. */
  factors: { key: string; label: string; value: number | null; fact: string | null }[];
}

function Side({ hero, wins, align }: { hero: DuelHero; wins: number; align: "left" | "right" }) {
  return (
    <Link href={`/hero/${hero.slug}`} className={`group flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span className="relative inline-grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-wine sm:h-[72px] sm:w-[72px]">
        {hero.thumb ? <img src={hero.thumb} alt="" className="h-full w-full object-cover" /> : <span className="text-[18px] font-semibold text-white">{hero.name[0]}</span>}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-ink group-hover:text-wine sm:text-[16px]">{hero.name}</span>
        <span className="tabular block font-serif text-[26px] font-bold leading-tight text-wine sm:text-[32px]">{hero.index.toFixed(1)}</span>
        <span className="block text-[11.5px] text-muted">
          #{hero.rank} · wins {wins}
        </span>
      </span>
    </Link>
  );
}

/** Pick any two ranked heroes and see who leads on each factor of the Tolly Index. */
export function HeadToHead({ heroes }: { heroes: DuelHero[] }) {
  const id = useId();
  const [a, setA] = useState(heroes[0]?.slug);
  const [b, setB] = useState(heroes[1]?.slug);
  const left = heroes.find((h) => h.slug === a) ?? heroes[0];
  const right = heroes.find((h) => h.slug === b) ?? heroes[1];
  if (!left || !right) return null;
  const rows = left.factors.map((f, i) => ({ ...f, l: f.value, r: right.factors[i]?.value ?? null, lf: f.fact, rf: right.factors[i]?.fact ?? null }));
  const lWins = rows.filter((r) => r.l !== null && r.r !== null && r.l > r.r).length;
  const rWins = rows.filter((r) => r.l !== null && r.r !== null && r.r > r.l).length;
  const shuffle = () => {
    const i = Math.floor(Math.random() * heroes.length);
    let j = Math.floor(Math.random() * (heroes.length - 1));
    if (j >= i) j++;
    setA(heroes[i].slug);
    setB(heroes[j].slug);
  };
  const select = (value: string, set: (v: string) => void, label: string, other: string) => (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-2.5 text-[14px] font-medium text-ink">
        {heroes.map((h) => (
          <option key={h.slug} value={h.slug} disabled={h.slug === other}>
            {h.rank}. {h.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        {select(left.slug, setA, "First hero", right.slug)}
        <span aria-hidden className="shrink-0 font-serif text-[15px] font-bold text-muted">
          vs
        </span>
        {select(right.slug, setB, "Second hero", left.slug)}
        <button type="button" onClick={shuffle} className="h-10 shrink-0 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:border-ink-2" aria-label="Pick two heroes at random">
          <span aria-hidden>🎲</span>
          <span className="ml-1.5 hidden sm:inline">Surprise me</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3" aria-live="polite">
        <Side hero={left} wins={lWins} align="left" />
        <Side hero={right} wins={rWins} align="right" />
      </div>

      <ul className="mt-4 space-y-3" aria-label={`${left.name} against ${right.name}, factor by factor`}>
        {rows.map((r) => {
          const lead = r.l !== null && r.r !== null ? Math.sign(r.l - r.r) : 0;
          return (
            <li key={`${id}-${r.key}`}>
              <div className="tabular flex items-baseline justify-between text-[13px]">
                <span className={lead > 0 ? "font-bold text-wine" : "text-ink-2"}>{r.l?.toFixed(1) ?? "—"}</span>
                <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">{r.label}</span>
                <span className={lead < 0 ? "font-bold text-wine" : "text-ink-2"}>{r.r?.toFixed(1) ?? "—"}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <span className="flex h-2.5 justify-end overflow-hidden rounded-l-full bg-surface-2 ring-1 ring-line">
                  <span className="block h-full rounded-l-full transition-[width] duration-500" style={{ width: `${r.l ?? 0}%`, background: lead > 0 ? "var(--wine)" : "#c9b8ae" }} />
                </span>
                <span className="flex h-2.5 overflow-hidden rounded-r-full bg-surface-2 ring-1 ring-line">
                  <span className="block h-full rounded-r-full transition-[width] duration-500" style={{ width: `${r.r ?? 0}%`, background: lead < 0 ? "var(--wine)" : "#c9b8ae" }} />
                </span>
              </div>
              <div className="mt-0.5 flex justify-between gap-3 text-[11.5px] text-muted">
                <span className="truncate">{r.lf ?? "no data"}</span>
                <span className="truncate text-right">{r.rf ?? "no data"}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-right">
        <Link href={`/compare?heroes=${left.slug},${right.slug}`} className="text-[13.5px] font-semibold text-wine hover:underline">
          Compare every number →
        </Link>
      </p>
    </div>
  );
}
