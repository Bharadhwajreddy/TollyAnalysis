import type { Metadata } from "next";
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

const PROVIDERS = [
  ["TMDb API", "Discovery, credits, release dates, languages, TMDb ratings", "Server-side adapter behind FEATURE_TMDB; attribution required"],
  ["Wikidata SPARQL", "Identifier reconciliation and alternate names only", "Never authoritative for lead roles or box office"],
  ["IMDb", "Ratings and votes", "Disabled by default. Only a licensed/permitted source; no HTML scraping"],
  ["Instagram Graph API", "Official professional-account public follower counts", "FEATURE_INSTAGRAM; explicit official profile records only"],
  ["X API v2", "Official account public metrics", "FEATURE_X; approved access tier required"],
  ["YouTube Data API v3", "Official channel subscriber counts", "FEATURE_YOUTUBE"],
  ["Meta Graph API (Facebook)", "Official page followers", "FEATURE_FACEBOOK; only if permitted"],
  ["Trade reports / platform releases", "Telugu collections, distributor share, OTT outcomes", "Editorial workflow: multiple claims, conflict detection, approval"],
  ["BookMyShow", "—", "Not used in v1; no public official rating API"],
];

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

      <h2 className="mt-8 text-lg font-semibold text-ink">Provider adapters and policy</h2>
      <div className="card scroll-x mt-3">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Provider</th>
              <th scope="col" className="px-3 py-2 font-semibold">Used for</th>
              <th scope="col" className="px-3 py-2 font-semibold">Policy</th>
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map(([a, b, c]) => (
              <tr key={a} className="border-t border-line align-top">
                <td className="px-3 py-2 font-medium text-ink">{a}</td>
                <td className="px-3 py-2 text-ink-2">{b}</td>
                <td className="px-3 py-2 text-xs text-ink-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        When TMDb data or images are enabled: “This product uses the TMDb API but is not endorsed or certified by TMDb.” A licence review
        is required before any commercial release.
      </p>
    </div>
  );
}
