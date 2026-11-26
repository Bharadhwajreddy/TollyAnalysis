"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ReleasesChart, type YearPoint } from "@/components/releases/releases-chart";

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

export interface YearReleasesPayload {
  released: Release[];
  upcoming: Release[];
}

const KIND_LABEL: Record<ReleaseKind, string> = {
  theatrical: "Telugu, in theatres",
  ott: "Telugu, direct to OTT",
  dubbed: "Dubbed into Telugu",
};

const KIND_STYLE: Record<ReleaseKind, { dot: string; short: string }> = {
  theatrical: { dot: "#a3284f", short: "Theatres" },
  ott: { dot: "#00879e", short: "Direct to OTT" },
  dubbed: { dot: "#b98200", short: "Dubbed" },
};

const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function Row({ r }: { r: Release }) {
  const k = KIND_STYLE[r.kind];
  return (
    <li className="flex items-start gap-3 px-3.5 py-2.5">
      <span className="tabular w-14 shrink-0 pt-0.5 text-[12.5px] text-ink-2">{r.date ? day(r.date) : "—"}</span>
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-ink">
          {r.wiki ? (
            <a
              href={`https://en.wikipedia.org/wiki/${encodeURIComponent(r.wiki.replace(/ /g, "_"))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-wine"
            >
              {r.title}
            </a>
          ) : (
            r.title
          )}
        </span>
        <span className="block truncate text-[12.5px] text-ink-2">
          {[r.director && `Dir. ${r.director}`, r.cast.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[12px] text-ink-2">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: k.dot }} />
        {k.short}
        {r.kind === "dubbed" && r.language ? ` · ${r.language}` : ""}
      </span>
    </li>
  );
}

export function ReleasesExplorerView({
  counts,
  year,
  kind,
  data,
  loading = false,
  error = null,
  onRetry,
  onNavigateYear,
}: {
  counts: YearPoint[];
  year: number;
  kind: ReleaseKind | null;
  data: YearReleasesPayload | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onNavigateYear?: (nextYear: number) => void;
}) {
  const [formState, setFormState] = useState<{ fromUrl: number; value: number }>(() => ({
    fromUrl: year,
    value: year,
  }));
  const selectedFormYear = formState.fromUrl === year ? formState.value : year;

  const cur = counts.find((c) => c.year === year) ?? counts[counts.length - 1];
  const all = useMemo(() => counts.reduce((s, c) => s + c.total, 0), [counts]);
  const href = (y: number, t: ReleaseKind | null) => `/releases?year=${y}${t ? `&type=${t}` : ""}#list`;

  const released = useMemo(() => data?.released ?? [], [data]);
  const upcoming = data?.upcoming ?? [];
  const list = useMemo(() => (kind ? released.filter((r) => r.kind === kind) : released), [released, kind]);

  const byMonth = useMemo(() => {
    const map = new Map<number, Release[]>();
    for (const r of list) {
      const m = r.date ? Number(r.date.slice(5, 7)) - 1 : 12;
      const bucket = map.get(m);
      if (bucket) bucket.push(r);
      else map.set(m, [r]);
    }
    return map;
  }, [list]);

  return (
    <>
      <section className="card mt-6 p-4 sm:p-6" aria-labelledby="chart">
        <h2 id="chart" className="font-serif text-[22px] font-semibold text-ink">
          Releases per year
        </h2>
        <p className="mb-3 mt-0.5 text-[13px] text-ink-2">
          Point at a year for its numbers; click it to open that year&apos;s list below.
        </p>
        <ReleasesChart data={counts} selected={year} linkYears />
      </section>

      <details className="card mt-4 p-4 sm:p-5" data-testid="release-check">
        <summary className="cursor-pointer text-[15px] font-semibold text-ink">
          How the total adds up, year by year
        </summary>
        <p className="mt-2 max-w-3xl text-[13px] text-ink-2">
          Start from Wikipedia&apos;s list of Telugu films for the year (the dashed line), add the Telugu films that
          list misses, add the films dubbed into Telugu: that is the &ldquo;All releases&rdquo; line. A count of the
          Wikipedia lists alone gives the first column.
        </p>
        <div className="mt-3 overflow-x-auto" tabIndex={0} aria-label="Year-by-year release totals">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-ink-2">
                <th scope="col" className="py-2 pr-3 font-semibold">Year</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Wikipedia list</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">+ Telugu films it misses</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">+ Dubbed into Telugu</th>
                <th scope="col" className="py-2 text-right font-semibold">= All releases</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[...counts].reverse().map((c) => (
                <tr key={c.year} className="border-b border-line/50">
                  <td className="py-1.5 pr-3">
                    <Link href={href(c.year, null)} scroll={false} className="text-wine hover:underline">
                      {c.year}
                    </Link>
                    {c.partial && <span className="text-ink-2"> (so far)</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-ink">{c.wikipedia}</td>
                  <td className="py-1.5 pr-3 text-right text-ink-2">{c.extra ? `+${c.extra}` : "—"}</td>
                  <td className="py-1.5 pr-3 text-right text-ink-2">{c.dubbed ? `+${c.dubbed}` : "—"}</td>
                  <td className="py-1.5 text-right font-semibold text-ink">{c.total}</td>
                </tr>
              ))}
              <tr className="font-semibold text-ink">
                <td className="py-2 pr-3">Since 2000</td>
                <td className="py-2 pr-3 text-right">
                  {counts.reduce((s, c) => s + c.wikipedia, 0).toLocaleString("en-IN")}
                </td>
                <td className="py-2 pr-3 text-right">+{counts.reduce((s, c) => s + c.extra, 0)}</td>
                <td className="py-2 pr-3 text-right">+{counts.reduce((s, c) => s + c.dubbed, 0)}</td>
                <td className="py-2 text-right">{all.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-ink-2">
          A film listed twice on one year&apos;s Wikipedia page is counted once here.
        </p>
      </details>

      <section id="list" className="mt-8 scroll-mt-24" aria-labelledby="list-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="list-title" className="font-serif text-[26px] font-bold text-ink">
              {year} releases <span className="tabular text-wine">{cur.total}</span>
            </h2>
            <p className="text-[13px] text-ink-2">
              {cur.theatrical} in theatres · {cur.ott} direct to OTT · {cur.dubbed} dubbed into Telugu
              {cur.partial ? " · so far this year" : ""}
            </p>
          </div>
          <form
            action="/releases"
            onSubmit={(e) => {
              if (!onNavigateYear) return;
              e.preventDefault();
              onNavigateYear(selectedFormYear);
            }}
            className="flex items-center gap-2 text-[13px]"
          >
            <label htmlFor="year" className="text-ink-2">
              Year
            </label>
            <select
              id="year"
              name="year"
              value={selectedFormYear}
              onChange={(e) => setFormState({ fromUrl: year, value: Number(e.target.value) })}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-ink"
            >
              {[...counts].reverse().map((c) => (
                <option key={c.year} value={c.year}>
                  {c.year} ({c.total})
                </option>
              ))}
            </select>
            {kind && <input type="hidden" name="type" value={kind} />}
            <button
              type="submit"
              className="rounded-full border border-wine bg-wine px-3.5 py-1.5 font-medium text-white hover:bg-wine-hover"
            >
              Show
            </button>
          </form>
        </div>

        <nav aria-label="Filter by type" className="mt-3 flex flex-wrap gap-1.5 text-[13px]">
          {([null, "theatrical", "ott", "dubbed"] as (ReleaseKind | null)[]).map((t) => (
            <Link
              key={t ?? "all"}
              href={href(year, t)}
              scroll={false}
              aria-current={kind === t ? "true" : undefined}
              className={`rounded-full border px-3.5 py-1.5 font-medium ${kind === t ? "border-wine bg-wine text-white" : "border-line bg-surface text-ink hover:border-ink-2"}`}
            >
              {t ? KIND_LABEL[t] : "All"}
            </Link>
          ))}
        </nav>

        {error ? (
          <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-6 text-[14px] text-ink-2" role="alert">
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-wine bg-wine px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-wine-hover"
              >
                Retry
              </button>
            )}
          </div>
        ) : loading || !data ? (
          <p className="card mt-4 p-6 text-[14px] text-ink-2" role="status">
            Loading {year} releases…
          </p>
        ) : list.length === 0 ? (
          <p className="card mt-4 p-6 text-[14px] text-ink-2">No films of this type in {year}.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2" data-testid="release-list">
            {[...byMonth.entries()].map(([m, rows]) => (
              <section key={m} className="card overflow-hidden">
                <h3 className="flex items-center justify-between border-b border-line bg-surface-2 px-3.5 py-2 text-[13px] font-semibold text-ink">
                  {MONTH[m] ?? "Date not known"}
                  <span className="tabular font-normal text-ink-2">{rows.length}</span>
                </h3>
                <ul className="divide-y divide-line/60 text-[13.5px]">
                  {rows.map((r) => (
                    <Row key={`${r.title}|${r.date}`} r={r} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {data && upcoming.length > 0 && (
          <details className="card mt-4 p-4">
            <summary className="cursor-pointer text-[14px] font-semibold text-ink">
              Coming up later in {year}: {upcoming.length} films announced
            </summary>
            <ul className="mt-2 divide-y divide-line/60 text-[13.5px]">
              {upcoming.map((r) => (
                <Row key={`${r.title}|${r.date}`} r={r} />
              ))}
            </ul>
          </details>
        )}

        <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-ink-2">
          Sources: Wikipedia&apos;s list of Telugu films for each year (CC BY-SA 4.0), our own film data for films those
          lists miss and for films dubbed into Telugu, and films we add by hand every week. Older years and dubbed films
          are less complete: small releases are sometimes not recorded anywhere. Direct-to-OTT films are marked when the
          source says so. Spotted a missing film?{" "}
          <Link href="/contact" className="font-medium text-wine underline">
            Tell us
          </Link>
          .
        </p>
      </section>
    </>
  );
}

export function ReleasesExplorer({
  counts,
  defaultYear,
  defaultData,
}: {
  counts: YearPoint[];
  defaultYear: number;
  defaultData: YearReleasesPayload;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawYear = searchParams.get("year");
  const rawType = searchParams.get("type");

  const year = Math.min(defaultYear, Math.max(2000, Number(rawYear ?? defaultYear) || defaultYear));
  const kind = rawType && rawType in KIND_LABEL ? (rawType as ReleaseKind) : null;

  const [cache, setCache] = useState<Record<number, YearReleasesPayload>>(() => ({
    [defaultYear]: defaultData,
  }));
  const [errorByYear, setErrorByYear] = useState<Record<number, string>>({});
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (cache[year]) return;
    const controller = new AbortController();
    fetch(`/data/releases/${year}.json`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<YearReleasesPayload>;
      })
      .then((payload) => {
        setCache((prev) => ({ ...prev, [year]: payload }));
        setErrorByYear((prev) => {
          if (!(year in prev)) return prev;
          const next = { ...prev };
          delete next[year];
          return next;
        });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorByYear((prev) => ({ ...prev, [year]: `Could not load ${year} releases. Please try again.` }));
      });
    return () => controller.abort();
  }, [year, cache, retryNonce]);

  const data = cache[year] ?? null;
  const error = errorByYear[year] ?? null;
  const loading = !data && !error;

  const retry = () => {
    setErrorByYear((prev) => {
      const next = { ...prev };
      delete next[year];
      return next;
    });
    setRetryNonce((n) => n + 1);
  };

  return (
    <ReleasesExplorerView
      counts={counts}
      year={year}
      kind={kind}
      data={data}
      loading={loading}
      error={error}
      onRetry={retry}
      onNavigateYear={(nextYear) => {
        router.push(`/releases?year=${nextYear}${kind ? `&type=${kind}` : ""}#list`, { scroll: false });
      }}
    />
  );
}
