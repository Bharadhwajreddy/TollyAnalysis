/** One place for number and date formatting, used by every page. */

const IN = new Intl.NumberFormat("en-IN");

/** ₹ crore with Indian grouping: 1810.6 → "₹1,811 cr"; small values keep one decimal: 4.5 → "₹4.5 cr". */
export function inr(cr: number | null | undefined, opts: { unit?: boolean } = {}): string {
  if (cr === null || cr === undefined || !Number.isFinite(cr)) return "—";
  const v = cr < 10 ? Math.round(cr * 10) / 10 : Math.round(cr);
  return `₹${IN.format(v)}${opts.unit === false ? "" : " cr"}`;
}

/** Large counts: 36373898 → "36.4M", 812000 → "812K". */
export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return IN.format(n);
}

export const int = (n: number | null | undefined) => (n === null || n === undefined ? "—" : IN.format(Math.round(n)));

/** A 0–100 score with one decimal. */
export const score = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toFixed(1));

/** A share 0–1 as a whole percent. */
export const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`);

export const multiple = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${x >= 10 ? Math.round(x) : x.toFixed(1)}×`);

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2017-04-28" → "28 Apr 2017". */
export function date(iso: string | null | undefined, opts: { year?: boolean } = {}): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MON[m - 1]}${opts.year === false ? "" : ` ${y}`}`;
}

/** Plural helper: plural(3, "film") → "3 films". */
export const plural = (n: number, one: string, many = `${one}s`) => `${IN.format(n)} ${n === 1 ? one : many}`;
