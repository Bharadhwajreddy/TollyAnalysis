import Link from "next/link";
import { HeroFace } from "@/components/entity/tokens";
import { CountUp } from "@/components/ui/count-up";
import { PROVISIONAL_TIP } from "@/components/tolly/tolly-parts";

export interface HeroNeighbour {
  slug: string;
  name: string;
  rank: number;
}

/**
 * The hero page header: the face (it morphs in from any Ledger row or token), the name, one line of facts,
 * the one headline score with its rank and band, and three plain facts. Prev/next hero by rank on the right.
 */
export function HeroHeader({
  slug,
  name,
  intro,
  index,
  band,
  rank,
  of,
  outside,
  provisional,
  facts,
  field,
  prev,
  next,
}: {
  slug: string;
  name: string;
  intro: string;
  index: number | null;
  band: number | null;
  rank: number | null;
  of: number;
  /** Why he has no rank (shown instead of the score). */
  outside: string | null;
  provisional: boolean;
  facts: { big: string; small: string }[];
  /** Every ranked hero's index, for the little axis under the score. */
  field: number[];
  prev: HeroNeighbour | null;
  next: HeroNeighbour | null;
}) {
  return (
    <header className="pt-6 sm:pt-8">
      <div className="flex items-center justify-between gap-4 text-[13px]">
        <Link href="/heroes" transitionTypes={["nav-back"]} className="font-medium text-muted hover:text-ink">
          ← All heroes
        </Link>
        {(prev || next) && (
          <nav aria-label="Heroes by rank" className="flex items-center gap-1">
            {prev ? <NeighbourLink h={prev} dir="prev" /> : <span />}
            {next && <NeighbourLink h={next} dir="next" />}
          </nav>
        )}
      </div>

      <div className="mt-6 grid gap-x-12 gap-y-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-3 sm:gap-x-7">
          <span className="shrink-0 sm:row-span-2">
            <HeroFace slug={slug} name={name} size={96} />
          </span>
          <h1 className="font-serif text-[40px] font-bold leading-[1.02] tracking-[-0.02em] text-ink sm:self-end sm:text-[60px]">{name}</h1>
          <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:self-start">
            <p className="text-[14.5px] text-ink-2">{intro}</p>
            <p className="mt-1.5 flex flex-wrap gap-y-0.5 text-[14.5px] leading-relaxed text-ink-2">
              {facts.map((f, i) => (
                <span key={f.small} className="whitespace-nowrap">
                  <b className="tabular font-semibold text-ink">{f.big}</b> {f.small}
                  {i < facts.length - 1 && <span aria-hidden className="mx-2 text-faint">·</span>}
                </span>
              ))}
            </p>
          </div>
        </div>

        {index !== null && rank !== null ? (
          <div className="min-w-[230px] border-t border-rule pt-5 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <p className="label">Tolly Index</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="num text-[56px] font-semibold leading-[0.95] text-ink">
                <span aria-hidden>
                  <CountUp value={index.toFixed(1)} />
                </span>
                <span className="sr-only">{index.toFixed(1)}</span>
              </span>
              {band !== null && <span className="tabular text-[16px] text-muted">± {band.toFixed(1)}</span>}
            </p>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              <b className="tabular font-semibold text-ink">#{rank}</b> of {of} ranked heroes
              {provisional && (
                <span title={PROVISIONAL_TIP} className="ml-2 cursor-help border-b border-dotted border-muted text-muted">
                  provisional
                </span>
              )}
            </p>
            <IndexAxis index={index} band={band} field={field} />
          </div>
        ) : (
          <div className="max-w-[320px] border-t border-rule pt-5 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <p className="label">Tolly Index</p>
            <p className="mt-1.5 text-[18px] font-semibold text-ink">Outside the Telugu index</p>
            {outside && <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{outside}</p>}
            <Link href="/methodology" className="link mt-2 inline-block text-[13px]">
              Who gets ranked
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function NeighbourLink({ h, dir }: { h: HeroNeighbour; dir: "prev" | "next" }) {
  return (
    <Link
      href={`/hero/${h.slug}`}
      transitionTypes={[dir === "next" ? "nav-forward" : "nav-back"]}
      title={dir === "next" ? `Next by rank: ${h.name}` : `Previous by rank: ${h.name}`}
      className="group/n inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {dir === "prev" && <span aria-hidden className="transition-transform group-hover/n:-translate-x-0.5">←</span>}
      <span className="tabular text-muted">#{h.rank}</span>
      <span className="max-w-[9rem] truncate font-medium max-sm:hidden">{h.name}</span>
      {dir === "next" && <span aria-hidden className="transition-transform group-hover/n:translate-x-0.5">→</span>}
    </Link>
  );
}

/** The index on a short labelled axis: every ranked hero as a hairline tick, his ± band and his dot. */
function IndexAxis({ index, band, field }: { index: number; band: number | null; field: number[] }) {
  const lo = Math.floor(Math.min(...field, index) / 10) * 10;
  const hi = Math.ceil(Math.max(...field, index) / 10) * 10;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="mt-3 w-full max-w-[240px]" aria-hidden>
      <div className="relative h-4">
        <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
        {field.map((v, i) => (
          <span key={i} className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-field-2" style={{ left: pos(v) }} />
        ))}
        {band !== null && <span className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-accent/25" style={{ left: pos(index - band), width: `calc(${pos(index + band)} - ${pos(index - band)})` }} />}
        <span className="absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-accent" style={{ left: pos(index) }} />
      </div>
      <div className="tabular mt-0.5 flex justify-between text-[10.5px] text-muted">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}
