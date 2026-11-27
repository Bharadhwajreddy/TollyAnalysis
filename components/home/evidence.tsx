import { Mark } from "@/components/charts/film-strip";
import type { FilmDot } from "@/lib/ledger-types";
import { grossShare } from "@/lib/timeline";

/** A finding's evidence: its films as marks, evenly spaced (order = release order). */
export function EvidenceMarks({ films, height = 40 }: { films: FilmDot[]; height?: number }) {
  const w = 7;
  const gap = 4;
  const W = films.length * (w + gap);
  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} aria-hidden className="block max-w-full overflow-visible">
      {films.map((f, i) => (
        <Mark key={f.s} x={i * (w + gap) + w / 2} base={height} h={Math.max(6, grossShare(f.g) * height)} w={w} o={f.o} litOn />
      ))}
    </svg>
  );
}

/** A finding's evidence as tiny columns (counts per year); the running year is hatched. */
export function EvidenceBars({ bars, height = 40 }: { bars: { label: string; value: number; partial?: boolean }[]; height?: number }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const w = 4;
  const gap = 2;
  const W = bars.length * (w + gap);
  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} aria-hidden className="block max-w-full">
      {bars.map((b, i) => {
        const h = Math.max(2, (b.value / max) * height);
        return <rect key={b.label} x={i * (w + gap)} y={height - h} width={w} height={h} rx={1} fill={b.partial ? "url(#hatch)" : "var(--ink-2)"} stroke={b.partial ? "var(--ink-2)" : "none"} strokeWidth={b.partial ? 0.75 : 0} />;
      })}
    </svg>
  );
}
