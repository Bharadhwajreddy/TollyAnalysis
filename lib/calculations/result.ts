export type MetricStatus = "ok" | "low_sample" | "insufficient";

export interface Coverage {
  numerator: number;
  denominator: number;
  /** 0–100, or 0 when the denominator is 0. */
  percent: number;
}

export interface MetricResult<T = number> {
  value: T | null;
  coverage: Coverage;
  status: MetricStatus;
  methodVersion: string;
  explanation: string;
}

export function coverage(numerator: number, denominator: number): Coverage {
  return {
    numerator,
    denominator,
    percent: denominator > 0 ? round((numerator / denominator) * 100, 1) : 0,
  };
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function weightedMean(pairs: { value: number; weight: number }[]): number | null {
  const totalWeight = pairs.reduce((a, p) => a + p.weight, 0);
  if (totalWeight <= 0) return null;
  return pairs.reduce((a, p) => a + p.value * p.weight, 0) / totalWeight;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Population standard deviation. */
export function stdDev(values: number[]): number | null {
  const m = mean(values);
  if (m === null) return null;
  return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / values.length);
}
