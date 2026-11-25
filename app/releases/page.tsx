import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ReleasesChart } from "@/components/releases/releases-chart";
import { KIND_LABEL, releaseCounts, releasesAsOf, releasesOf, type Release, type ReleaseKind } from "@/lib/releases";

export const metadata: Metadata = { title: "Telugu releases by year" };

const KIND_STYLE: Record<ReleaseKind, { dot: string; short: string }> = {
  theatrical: { dot: "#a3284f", short: "Theatres" },
  ott: { dot: "#00879e", short: "Direct to OTT" },
  dubbed: { dot: "#b98200", short: "Dubbed" },
};
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-1 text-[30px] font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[12.5px] text-muted">{note}</p>
    </div>
  );
}

function Row({ r }: { r: Release }) {
  const k = KIND_STYLE[r.kind];
  return (
    <li className="flex items-start gap-3 px-3.5 py-2.5">
      <span className="tabular w-14 shrink-0 pt-0.5 text-[12.5px] text-muted">{r.date ? day(r.date) : "—"}</span>
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-ink">
          {r.wiki ? (
            <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(r.wiki.replace(/ /g, "_"))}`} target="_blank" rel="noopener noreferrer" className="hover:text-wine">
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

export default async function ReleasesPage(props: PageProps<"/releases">) {
  const sp = await props.searchParams;
  const counts = releaseCounts();
  const thisYear = counts[counts.length - 1].year;
  const year = Math.min(thisYear, Math.max(2000, Number(typeof sp.year === "string" ? sp.year : thisYear) || thisYear));
  const kind = typeof sp.type === "string" && sp.type in KIND_LABEL ? (sp.type as ReleaseKind) : null;
  const { released, upcoming } = releasesOf(year);
  const list = kind ? released.filter((r) => r.kind === kind) : released;
  const cur = counts.find((c) => c.year === year)!;
  const full = counts.filter((c) => !c.partial);
  const busiest = [...full].sort((a, b) => b.total - a.total)[0];
  const lastYear = full[full.length - 1];
  const now = counts[counts.length - 1];
  const all = counts.reduce((s, c) => s + c.total, 0);
  const byMonth = new Map<number, Release[]>();
  for (const r of list) {
    const m = r.date ? Number(r.date.slice(5, 7)) - 1 : 12;
    byMonth.set(m, [...(byMonth.get(m) ?? []), r]);
  }
  const href = (y: number, t: ReleaseKind | null) => `/releases?year=${y}${t ? `&type=${t}` : ""}#list`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow="Releases"
        title="Telugu releases, year by year"
        subtitle="Every Telugu film released in theatres or straight to OTT since 2000, plus films dubbed into Telugu. Updated every week as new films release."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={`${thisYear} so far`} value={String(now.total)} note={`releases up to ${day(releasesAsOf)}`} />
        <Tile label={String(lastYear.year)} value={String(lastYear.total)} note={`${lastYear.theatrical} in theatres · ${lastYear.dubbed} dubbed`} />
        <Tile label="Busiest year" value={String(busiest.year)} note={`${busiest.total} releases`} />
        <Tile label="Since 2000" value={all.toLocaleString("en-IN")} note="films in this list" />
      </div>

      <section className="card mt-6 p-4 sm:p-6" aria-labelledby="chart">
        <h2 id="chart" className="font-serif text-[22px] font-semibold text-ink">
          Releases per year
        </h2>
        <p className="mb-3 mt-0.5 text-[13px] text-ink-2">Point at a year for its numbers; click it to open that year&apos;s list below.</p>
        <ReleasesChart data={counts} selected={year} linkYears />
      </section>

      <section id="list" className="mt-8 scroll-mt-24" aria-labelledby="list-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="list-title" className="font-serif text-[26px] font-bold text-ink">
              {year} releases <span className="tabular text-wine">{cur.total}</span>
            </h2>
            <p className="text-[13px] text-ink-2">
              {cur.theatrical} in theatres · {cur.ott} direct to OTT · {cur.dubbed} dubbed into Telugu{cur.partial ? " · so far this year" : ""}
            </p>
          </div>
          <form action="/releases" className="flex items-center gap-2 text-[13px]">
            <label htmlFor="year" className="text-ink-2">
              Year
            </label>
            <select id="year" name="year" defaultValue={year} className="rounded-lg border border-line bg-surface px-2.5 py-1.5">
              {[...counts].reverse().map((c) => (
                <option key={c.year} value={c.year}>
                  {c.year} ({c.total})
                </option>
              ))}
            </select>
            {kind && <input type="hidden" name="type" value={kind} />}
            <button className="rounded-full border border-wine bg-wine px-3.5 py-1.5 font-medium text-white">Show</button>
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

        {list.length === 0 ? (
          <p className="card mt-4 p-6 text-[14px] text-ink-2">No films of this type in {year}.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2" data-testid="release-list">
            {[...byMonth.entries()].map(([m, rows]) => (
              <section key={m} className="card overflow-hidden">
                <h3 className="flex items-center justify-between border-b border-line bg-surface-2 px-3.5 py-2 text-[13px] font-semibold text-ink">
                  {MONTH[m] ?? "Date not known"}
                  <span className="tabular font-normal text-muted">{rows.length}</span>
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

        {upcoming.length > 0 && (
          <details className="card mt-4 p-4">
            <summary className="cursor-pointer text-[14px] font-semibold text-ink">Coming up later in {year}: {upcoming.length} films announced</summary>
            <ul className="mt-2 divide-y divide-line/60 text-[13.5px]">
              {upcoming.map((r) => (
                <Row key={`${r.title}|${r.date}`} r={r} />
              ))}
            </ul>
          </details>
        )}

        <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-muted">
          Sources: Wikipedia&apos;s list of Telugu films for each year (CC BY-SA 4.0), our own film data for films those lists
          miss and for films dubbed into Telugu, and films we add by hand every week. Older years and dubbed films are less
          complete: small releases are sometimes not recorded anywhere. Direct-to-OTT films are marked when the source says so.
          Spotted a missing film? <Link href="/contact" className="text-wine hover:underline">Tell us</Link>.
        </p>
      </section>
    </div>
  );
}
