import type { Metadata } from "next";
import { getCoverage, getDashboardData } from "@/lib/repositories";

export const metadata: Metadata = { title: "Annexure · Data Coverage" };

function Stat({ label, value, total, note }: { label: string; value: number; total: number; note?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">
        {value.toLocaleString("en-IN")} <span className="text-sm font-normal text-muted">/ {total.toLocaleString("en-IN")} · {pct}%</span>
      </p>
      <div className="mt-2 h-2 rounded-full bg-surface-2 ring-1 ring-line">
        <div className="h-full rounded-full bg-wine" style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default async function CoveragePage() {
  const [c, data] = await Promise.all([getCoverage(), getDashboardData()]);
  const heroes = [...data.windows.all_time].sort((a, b) => a.coverage - b.coverage);
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">6. Data Coverage &amp; Missing Data</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
        Missing values are never converted to zero. They lower coverage, change a film&apos;s scoring status, or suppress a metric.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Scored (full evidence)" value={c.byStatus.scored} total={c.totalFilms} />
        <Stat label="Provisional (one core component missing)" value={c.byStatus.provisional} total={c.totalFilms} />
        <Stat label="Insufficient evidence (no score)" value={c.byStatus.insufficient_evidence} total={c.totalFilms} />
        <Stat label="Not yet final (recent release)" value={c.byStatus.not_yet_final} total={c.totalFilms} />
        <Stat label="Audience evidence present" value={c.withAudience} total={c.totalFilms} />
        <Stat label="Telugu commercial / platform evidence" value={c.withCommercial} total={c.totalFilms} />
        <Stat label="Dubbed titles with only all-language totals" value={c.dubbedAllLanguageOnly} total={c.dubbed} note="Marked unknown for Telugu commercial evidence." />
        <Stat label="OTT titles without platform evidence" value={c.ottUnknownPlatform} total={c.ott} note="Platform outcome unknown — not zero." />
        <Stat label="Disputed commercial evidence" value={c.disputed} total={c.totalFilms} note="Conservative value used; all claims kept." />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">Coverage by hero (all time, lowest first)</h2>
      <div className="card scroll-x mt-3">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Hero</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Films</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Scored</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Audience cov.</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Commercial cov.</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Overall</th>
              <th scope="col" className="px-3 py-2 font-semibold">Confidence</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {heroes.map((h) => (
              <tr key={h.slug} className="border-t border-line">
                <td className="px-3 py-1.5 font-medium text-ink">{h.name}</td>
                <td className="px-3 py-1.5 text-right">{h.eligible}</td>
                <td className="px-3 py-1.5 text-right">{h.scored}</td>
                <td className="px-3 py-1.5 text-right">{h.audienceCoverage}%</td>
                <td className="px-3 py-1.5 text-right">{h.commercialCoverage}%</td>
                <td className="px-3 py-1.5 text-right font-semibold">{h.coverage}%</td>
                <td className="px-3 py-1.5">{h.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
