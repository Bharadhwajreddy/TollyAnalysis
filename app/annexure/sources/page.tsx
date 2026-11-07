import type { Metadata } from "next";
import { DATA_SOURCES, IMDB_ATTRIBUTION, TMDB_NOTICE } from "@/lib/legal/data-licences";
import { getSources } from "@/lib/repositories";

export const metadata: Metadata = { title: "Annexure · Source Ledger" };

const TYPE_LABEL: Record<string, string> = {
  official_api: "Official API",
  licensed_dataset: "Licensed dataset",
  trade_report: "Trade report",
  platform_press_release: "Platform press release",
  manual_editorial: "Manual editorial",
  user_submission: "User submission (after review)",
  synthetic_demo: "Synthetic demo",
};


export default async function SourcesPage() {
  const sources = await getSources();
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">5. Source Ledger</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
        Every source feeding the benchmarks, how it may be used, and how many claims currently rely on it.
      </p>
      <div className="card scroll-x mt-5">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Source</th>
              <th scope="col" className="px-3 py-2 font-semibold">Type</th>
              <th scope="col" className="px-3 py-2 font-semibold">Tier</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Claims</th>
              <th scope="col" className="px-3 py-2 font-semibold">Licensing / usage note</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-line align-top">
                <td className="px-3 py-2 font-medium text-ink">
                  {s.baseUrl ? (
                    <a href={s.baseUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline">
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}
                </td>
                <td className="px-3 py-2">{TYPE_LABEL[s.type] ?? s.type}</td>
                <td className="px-3 py-2">Tier {s.reliabilityTier}</td>
                <td className="tabular px-3 py-2 text-right">{s.claimCount.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2 text-xs text-ink-2">{s.licensingNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">Data licences and what we owe for each</h2>
      <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">
        Where every number on this site comes from, the licence it is used under, and the conditions that come with it. Raw IMDb and TMDB numbers are never
        shown or published: they only feed the Tolly Index.
      </p>
      <div className="card scroll-x mt-3">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Source</th>
              <th scope="col" className="px-3 py-2 font-semibold">What we use it for</th>
              <th scope="col" className="px-3 py-2 font-semibold">Licence</th>
              <th scope="col" className="px-3 py-2 font-semibold">Our obligations</th>
            </tr>
          </thead>
          <tbody>
            {DATA_SOURCES.map((d) => (
              <tr key={d.name} className="border-t border-line align-top">
                <td className="px-3 py-2 font-medium text-ink">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer nofollow" className="text-wine underline">
                      {d.name}
                    </a>
                  ) : (
                    d.name
                  )}
                </td>
                <td className="px-3 py-2 text-ink-2">{d.use}</td>
                <td className="px-3 py-2 text-ink-2">{d.licence}</td>
                <td className="px-3 py-2 text-xs text-ink-2">{d.obligations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted">
        <p>{IMDB_ATTRIBUTION}</p>
        <p>{TMDB_NOTICE}</p>
        <p>Film and hero facts from Wikipedia (CC BY-SA 4.0) and Wikidata (CC0). Not affiliated with IMDb, TMDB, Wikimedia or any studio or actor.</p>
      </div>
    </div>
  );
}
