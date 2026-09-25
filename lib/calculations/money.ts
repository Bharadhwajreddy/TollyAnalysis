/**
 * Money is carried as integer minor units (paise / cents) in strings and
 * handled with BigInt, so no currency arithmetic touches floating point.
 */

export function toMinor(amount: string | null | undefined): bigint | null {
  if (amount === null || amount === undefined || amount.trim() === "") return null;
  if (!/^-?\d+$/.test(amount.trim())) return null;
  return BigInt(amount.trim());
}

/** Parses a decimal major-unit string (e.g. "12.50") into minor units. */
export function majorToMinor(major: string, minorDigits = 2): bigint | null {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(major.trim());
  if (!m) return null;
  const [, sign, whole, frac = ""] = m;
  const padded = (frac + "0".repeat(minorDigits)).slice(0, minorDigits);
  const v = BigInt(whole) * BigInt(10 ** minorDigits) + BigInt(padded || "0");
  return sign === "-" ? -v : v;
}

export function sumMinor(values: (bigint | null)[]): bigint | null {
  const present = values.filter((v): v is bigint => v !== null);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, BigInt(0));
}

/** Midpoint of a low/high range; a single bound is returned as-is. */
export function midpointMinor(low: bigint | null, high: bigint | null): bigint | null {
  if (low !== null && high !== null) return (low + high) / BigInt(2);
  return low ?? high;
}

/**
 * Ratio of two minor-unit amounts to `precision` decimal places.
 * The division happens in BigInt; only the final ratio becomes a Number.
 */
export function ratioMinor(numerator: bigint, denominator: bigint, precision = 4): number | null {
  if (denominator === BigInt(0)) return null;
  const scale = BigInt(10 ** precision);
  return Number((numerator * scale) / denominator) / 10 ** precision;
}

/** Relative difference between two amounts, used for dispute detection. */
export function relativeDifference(a: bigint, b: bigint): number {
  const hi = a > b ? a : b;
  const lo = a > b ? b : a;
  if (hi === BigInt(0)) return 0;
  return ratioMinor(hi - lo, hi, 4) ?? 0;
}
