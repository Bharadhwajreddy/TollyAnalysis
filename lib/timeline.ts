/**
 * The shared time spine: every temporal chart places a film by the same rule, so a year sits at the same
 * relative position on every chart of the same width.
 */
export const SPINE_START = 2000;

/** Fractional year for a film: exact date when known, else mid-year. */
export function yearPos(date: string | null, year: number): number {
  if (!date) return year + 0.5;
  const [y, m, d] = date.split("-").map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
}

export interface Spine {
  start: number;
  end: number;
  x: (pos: number) => number;
  ticks: number[];
}

/** Scale from [start, end] (fractional years) to [x0, x1] px, with year ticks every `every` years. */
export function spine(start: number, end: number, x0: number, x1: number, every = 1): Spine {
  const span = Math.max(0.001, end - start);
  const ticks: number[] = [];
  for (let y = Math.ceil(start / every) * every; y <= Math.floor(end); y += every) ticks.push(y);
  return { start, end, x: (p) => x0 + ((p - start) / span) * (x1 - x0), ticks };
}

/** Bar height share for a reported gross: ₹1 cr → 22%, ₹2,000 cr → 100% (log); unknown → a short stub. */
export function grossShare(gross: number | null): number {
  if (gross === null || !(gross > 0)) return 0.34;
  return Math.max(0.22, Math.min(1, 0.22 + (0.78 * Math.log10(Math.max(1, gross))) / Math.log10(2000)));
}
