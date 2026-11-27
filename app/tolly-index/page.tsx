import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilmStrip } from "@/components/charts/film-strip";
import { FocusProvider } from "@/components/charts/focus";
import { HeroToken } from "@/components/entity/tokens";
import { IndexExplorer, type ColSet, type ExplorerState, type View } from "@/components/index/index-explorer";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { FanRanking } from "@/components/ranking/fan-ranking";
import { DATA_MODE } from "@/lib/env";
import { getExplorerHeroes } from "@/lib/explorer";
import { AXES, BOXOFFICE_COLS, CAREER_COLS, type Win } from "@/lib/explorer-types";
import { tollyIndexEnabled, userRankingEnabled } from "@/lib/features";
import { date } from "@/lib/format";
import { getLedger, toDot } from "@/lib/ledger";
import { heroLedgerRows, spineEnd } from "@/lib/ledger-rows";
import { getDashboardData } from "@/lib/repositories";
import { tollyMeta } from "@/lib/tolly/view";
import type { Industry } from "@/lib/domain/types";

export const metadata: Metadata = {
  title: "Tolly Index",
  description: "Every Telugu hero scored from 0 to 100 on his films, his box-office record, his form, his fame and his career: as a ledger of careers, a table or a trade-off chart.",
};

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const ORDER = ["tamil", "malayalam", "kannada", "hindi"];
const INDUSTRY: Record<string, string> = { tamil: "Tamil", malayalam: "Malayalam", kannada: "Kannada", hindi: "Hindi" };

/** Read the explorer state from the URL (also what /star-score and /rankings redirect to). */
function parseState(sp: Record<string, string | string[] | undefined>): ExplorerState {
  const v = one(sp.view);
  const metric = one(sp.metric) ?? null;
  let view: View = v === "table" || v === "boxoffice" || v === "career" ? "table" : v === "scatter" ? "scatter" : "ledger";
  let set: ColSet = v === "boxoffice" ? "boxoffice" : v === "career" ? "career" : "index";
  // An old /rankings?metric=… link lands on the column set that has that measure.
  if (metric && view === "table" && set === "index") {
    if (BOXOFFICE_COLS.some((c) => c.key === metric)) set = "boxoffice";
    else if (CAREER_COLS.some((c) => c.key === metric)) set = "career";
  }
  if (!v && metric && (BOXOFFICE_COLS.some((c) => c.key === metric) || CAREER_COLS.some((c) => c.key === metric))) {
    view = "table";
    set = BOXOFFICE_COLS.some((c) => c.key === metric) ? "boxoffice" : "career";
  }
  const w = one(sp.window);
  const win: Win = w === "5y" ? "last_5_years" : w === "10f" ? "last_10_films" : "all_time";
  const axis = (k: string | undefined, d: string) => (k && AXES.some((a) => a.key === k) ? k : d);
  let x = axis(one(sp.x), "gross");
  const y = axis(one(sp.y), "audience");
  if (x === y) x = y === "gross" ? "audience" : "gross";
  return { view, set, metric: metric === "starScore" && set === "boxoffice" ? null : metric, win, x, y };
}

export default async function TollyIndexPage(props: PageProps<"/tolly-index">) {
  if (!tollyIndexEnabled() || DATA_MODE !== "real") notFound();
  const sp = await props.searchParams;
  const [heroes, rows, ledger] = await Promise.all([getExplorerHeroes(), heroLedgerRows((h) => h.qualified), getLedger()]);
  const { end, partialFrom } = spineEnd();
  const ranked = heroes.filter((h) => h.rank !== null);
  const unranked = heroes.filter((h) => h.rank === null);
  const outside = unranked.filter((h) => h.industry !== "telugu").sort((a, b) => ORDER.indexOf(a.industry) - ORDER.indexOf(b.industry) || b.films - a.films);
  const waiting = unranked.filter((h) => h.industry === "telugu").sort((a, b) => b.films - a.films);
  const fans = userRankingEnabled() ? (await getDashboardData()).windows.all_time.map((h) => ({ slug: h.slug, name: h.name, photo: h.photo, industry: h.industry as Industry })) : null;

  const row = (h: (typeof unranked)[number]) => {
    const share = h.completeOf ? h.complete / h.completeOf : 0;
    const gate = h.industry === "telugu" && h.completeOf >= 5 && /needed$/.test(h.reason ?? "") && /%/.test(h.reason ?? "");
    return (
      <li key={h.slug} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1.5 border-b border-rule py-2.5 md:grid-cols-[220px_minmax(0,1fr)_280px]">
        <span className="flex min-w-0 items-baseline gap-2">
          <HeroToken slug={h.slug} name={h.name} size={24} className="min-w-0 shrink text-[14px] font-semibold" />
        </span>
        <span className="tabular text-right text-[12px] text-muted md:hidden">{h.films} films</span>
        <span className="col-span-2 min-w-0 overflow-x-clip md:col-span-1">
          <FilmStrip films={(ledger.byHero.get(h.slug) ?? []).map(toDot)} start={2000} end={end} height={20} partialFrom={partialFrom} ariaLabel={`${h.name}: ${h.films} films on a timeline`} />
        </span>
        <span className="col-span-2 flex items-center gap-3 text-[12.5px] leading-snug text-ink-2 md:col-span-1">
          {gate && (
            <span aria-hidden className="relative h-[6px] w-16 shrink-0 rounded-full bg-surface-2" title="Fully scored share; the line marks the 90% needed">
              <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--field-2)]" style={{ width: `${share * 100}%` }} />
              <span className="absolute -inset-y-[3px] w-px bg-ink" style={{ left: "90%" }} />
            </span>
          )}
          <span className="hidden tabular text-muted md:inline">{h.films} films ·</span>
          <span>{h.reason}</span>
        </span>
      </li>
    );
  };
  const industries = [...new Set(outside.map((h) => h.industry))];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="The Tolly Index"
        subtitle={`One score out of 100 for ${ranked.length} Telugu heroes, built from how audiences receive his films, his box office, his recent form, his fame and his career.`}
        aside={
          <span className="flex flex-col items-start gap-1 sm:items-end">
            <span>Updated {date(tollyMeta.asOf)}</span>
            <Link href="/methodology#tolly-index" className="link font-medium">
              How the score works
            </Link>
          </span>
        }
      />

      <div className="mt-8">
        <FocusProvider>
          <IndexExplorer heroes={ranked} rows={rows} end={end} partialFrom={partialFrom} initial={parseState(sp)} asOf={date(tollyMeta.asOf)} />
        </FocusProvider>
      </div>

      <section aria-labelledby="outside" className="mt-24">
        <SectionTitle id="outside" title="Outside the Telugu index" finding={`${outside.length} Tamil, Malayalam and Kannada stars whose films also release in Telugu. Their careers are tracked on Heroes and Compare, but they are not ranked against Telugu heroes while their Telugu box-office records are checked.`} />
        <div className="grid gap-10">
          {industries.map((ind) => {
            const hs = outside.filter((h) => h.industry === ind);
            return (
              <div key={ind}>
                <h3 className="mb-1 flex items-baseline gap-2 text-[14px] font-semibold text-ink">
                  {INDUSTRY[ind] ?? ind} <span className="tabular text-[12.5px] font-normal text-muted">{hs.length}</span>
                </h3>
                <ul className="border-t border-rule">{hs.map(row)}</ul>
              </div>
            );
          })}
        </div>
      </section>

      {waiting.length > 0 && (
        <section aria-labelledby="waiting" className="mt-16">
          <SectionTitle id="waiting" title="Not ranked yet" finding="Telugu heroes we track but cannot rank fairly yet. A hero is ranked once at least 5 of his films, and 90% of those with a known result, are fully scored." />
          <ul className="border-t border-rule">{waiting.map(row)}</ul>
        </section>
      )}

      {fans && (
        <section className="mt-24">
          <FanRanking heroes={fans} />
        </section>
      )}
    </div>
  );
}
