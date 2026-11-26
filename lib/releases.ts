import "server-only";
import data from "@/lib/data/releases/releases.json";

/** Telugu releases year by year (scripts/releases.mts builds the data; updated weekly). */
export type ReleaseKind = "theatrical" | "ott" | "dubbed";
export interface Release {
  title: string;
  date: string | null;
  year: number;
  kind: ReleaseKind;
  language: string | null;
  director: string | null;
  cast: string[];
  wiki: string | null;
  source: string;
}
export interface YearCount {
  year: number;
  total: number;
  theatrical: number;
  ott: number;
  dubbed: number;
  /** Films on Wikipedia's "List of Telugu films of <year>" alone (what a count of that page gives). */
  wikipedia: number;
  /** Telugu films the list misses, added from our film data or by hand. */
  extra: number;
  /** The current year: counted up to today only. */
  partial: boolean;
}

export const KIND_LABEL: Record<ReleaseKind, string> = { theatrical: "Telugu, in theatres", ott: "Telugu, direct to OTT", dubbed: "Dubbed into Telugu" };

const films = (data as { asOf: string; films: Release[] }).films;
export const releasesAsOf = (data as { asOf: string }).asOf;

/** Released by the data date: dated films up to that day; undated films count in past years only. */
const isReleased = (r: Release) => (r.date ? r.date <= releasesAsOf : r.year < Number(releasesAsOf.slice(0, 4)));

export function releaseCounts(): YearCount[] {
  const thisYear = Number(releasesAsOf.slice(0, 4));
  const out: YearCount[] = [];
  for (let y = 2000; y <= thisYear; y++) {
    const list = films.filter((r) => r.year === y && isReleased(r));
    out.push({
      year: y,
      total: list.length,
      theatrical: list.filter((r) => r.kind === "theatrical").length,
      ott: list.filter((r) => r.kind === "ott").length,
      dubbed: list.filter((r) => r.kind === "dubbed").length,
      wikipedia: list.filter((r) => r.source === "wikipedia-list").length,
      extra: list.filter((r) => r.source !== "wikipedia-list" && r.kind !== "dubbed").length,
      partial: y === thisYear,
    });
  }
  return out;
}

/** One year's films, newest first. Upcoming films of the current year are returned separately. */
export function releasesOf(year: number): { released: Release[]; upcoming: Release[] } {
  const list = films.filter((r) => r.year === year);
  const order = (a: Release, b: Release) => (b.date ?? `${b.year}-00`).localeCompare(a.date ?? `${a.year}-00`) || a.title.localeCompare(b.title);
  return { released: list.filter(isReleased).sort(order), upcoming: list.filter((r) => !isReleased(r)).sort((a, b) => -order(a, b)) };
}
