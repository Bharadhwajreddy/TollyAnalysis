"use client";

import Link from "next/link";
import { useState } from "react";

export interface TopFilm {
  key: string;
  title: string;
  year: number;
  index: number;
  rating: number | null;
  reach: number | null;
  stay: number | null;
  heroes: { slug: string; name: string }[];
}

export interface GrossFilm {
  key: string;
  title: string;
  year: number;
  gross: number;
  result: string | null;
  heroes: { slug: string; name: string }[];
}

const PARTS = [
  { key: "rating", label: "Audience rating", weight: "50%", color: "var(--wine)" },
  { key: "reach", label: "Reach", weight: "30%", color: "#00798c" },
  { key: "stay", label: "Staying power", weight: "20%", color: "#b7791f" },
] as const;

/** Opens and closes with a height animation (grid rows 0fr → 1fr), without measuring anything. */
function Reveal({ open, children, id }: { open: boolean; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="grid transition-[grid-template-rows,opacity] duration-300 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }} aria-hidden={!open} inert={!open}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function Row({ f, rank, open, onToggle }: { f: TopFilm; rank: number; open: boolean; onToggle: () => void }) {
  return (
    <li className="py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`film-${f.key}`}
        className={`grid w-full grid-cols-[22px_1fr_auto_16px] items-baseline gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-wine-soft/60 ${open ? "bg-wine-soft/60" : ""}`}
      >
        <span className="tabular text-[12.5px] text-muted">{rank}</span>
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-semibold text-ink">
            {f.title} <span className="font-normal text-muted">({f.year})</span>
          </span>
          <span className="block truncate text-[12.5px] text-ink-2">{f.heroes.map((h) => h.name).join(", ")}</span>
        </span>
        <span className="tabular text-[15px] font-bold text-wine">{f.index.toFixed(1)}</span>
        <span aria-hidden className={`text-[12px] text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      <Reveal open={open} id={`film-${f.key}`}>
        <div className="space-y-2 px-1.5 pb-2 pl-[32px] pt-1.5">
          {PARTS.map((p) => {
            const v = f[p.key];
            return (
              <div key={p.key} className="grid grid-cols-[118px_1fr_34px] items-center gap-2 text-[12px]">
                <span className="text-ink-2">
                  {p.label} <span className="text-muted">· {p.weight}</span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                  <span className="block h-full rounded-full transition-[width] delay-100 duration-700 ease-out" style={{ width: open && v !== null ? `${v}%` : "0%", background: p.color }} />
                </span>
                <span className="tabular text-right font-semibold text-ink">{v === null ? "—" : v.toFixed(0)}</span>
              </div>
            );
          })}
          <p className="text-[11.5px] leading-snug text-muted">
            Rating is how much audiences love the film, on a 0–100 scale. Reach and staying power compare it with films released within a year of it.
          </p>
          <p className="flex flex-wrap gap-x-3 text-[12.5px]">
            {f.heroes.map((h) => (
              <Link prefetch={false} key={h.slug} href={`/hero/${h.slug}#films`} className="font-medium text-wine hover:underline">
                {h.name}&apos;s films →
              </Link>
            ))}
          </p>
        </div>
      </Reveal>
    </li>
  );
}

function GrossRow({ f, rank }: { f: GrossFilm; rank: number }) {
  return (
    <li className="grid grid-cols-[22px_1fr_auto] items-baseline gap-2 px-1.5 py-2.5">
      <span className="tabular text-[12.5px] text-muted">{rank}</span>
      <span className="min-w-0">
        <span className="block truncate text-[14.5px] font-semibold text-ink">
          {f.title} <span className="font-normal text-muted">({f.year})</span>
        </span>
        <span className="block truncate text-[12.5px] text-ink-2">
          {f.heroes.map((h, i) => (
            <span key={h.slug}>
              {i > 0 && ", "}
              <Link prefetch={false} href={`/hero/${h.slug}`} className="hover:text-wine hover:underline">{h.name}</Link>
            </span>
          ))}
        </span>
      </span>
      <span className="tabular text-[15px] font-bold text-wine">₹{Math.round(f.gross).toLocaleString("en-IN")} cr</span>
    </li>
  );
}

/** The home page's film list: the top five, a tap opens any film's breakdown, and "Show more" grows it to the full list. */
export function TopFilms({ films, grossing = [], initial = 5 }: { films: TopFilm[]; grossing?: GrossFilm[]; initial?: number }) {
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"loved" | "gross">("loved");
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const count = tab === "loved" ? films.length : grossing.length;
  return (
    <div>
      {grossing.length > 0 && (
        <div role="tablist" aria-label="Film lists" className="mt-3 inline-flex rounded-full border border-line bg-surface-2 p-0.5 text-[13px]">
          {([["loved", "Most loved"], ["gross", "Biggest box office"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMore(false); setOpen(null); }}
              className={`rounded-full px-3.5 py-1 font-semibold transition-colors ${tab === k ? "bg-wine text-white" : "text-ink-2 hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[12px] text-muted">
        {tab === "loved" ? "Ranked by film score: how much audiences love a film, how many watched it and how long it is talked about. Not by collections." : "Ranked by reported worldwide gross (the lower figure when reports differ)."} Films made in Telugu only.
      </p>
      {tab === "gross" ? (
        <ol className="mt-2 divide-y divide-line">
          {grossing.slice(0, more ? grossing.length : initial).map((f, i) => (
            <GrossRow key={f.key} f={f} rank={i + 1} />
          ))}
        </ol>
      ) : (
      <ol className="mt-2 divide-y divide-line">
        {films.slice(0, initial).map((f, i) => (
          <Row key={f.key} f={f} rank={i + 1} open={open === f.key} onToggle={() => toggle(f.key)} />
        ))}
      </ol>
      )}
      {tab === "loved" && films.length > initial && (
        <>
          <Reveal open={more} id="more-films">
            <ol start={initial + 1} className="divide-y divide-line border-t border-line">
              {films.slice(initial).map((f, i) => (
                <Row key={f.key} f={f} rank={initial + i + 1} open={open === f.key} onToggle={() => toggle(f.key)} />
              ))}
            </ol>
          </Reveal>
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            aria-controls="more-films"
            className="mt-3 w-full rounded-full border border-line py-2 text-[13px] font-semibold text-wine transition-colors hover:border-wine hover:bg-wine-soft/50"
          >
            {more ? "Show fewer" : `Show the top ${films.length}`}
          </button>
        </>
      )}
      {tab === "gross" && count > initial && (
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more}
          className="mt-3 w-full rounded-full border border-line py-2 text-[13px] font-semibold text-wine transition-colors hover:border-wine hover:bg-wine-soft/50">
          {more ? "Show fewer" : `Show the top ${count}`}
        </button>
      )}
    </div>
  );
}
