import { STAR_PARTS, type StarPart } from "@/lib/calculations/star";

/** Validated categorical palette (see lib/constants/groups.ts), one colour per part. */
const PART_COLOR: Record<string, string> = {
  successRatio: "#7a1f3d",
  hits: "#2a78d6",
  totalGross: "#eb6834",
  blockbusters: "#1baf7a",
  recentSuccess: "#4a3aa7",
  socialReach: "#eda100",
  topGross: "#c4553b",
  avgGross: "#e39a6b",
  films: "#8a7f78",
  fans: "#00879e",
};

/** The recipe: one stacked bar showing how much each KPI weighs in the Star Score. */
export function StarWeights({ withFans = false }: { withFans?: boolean }) {
  const parts = STAR_PARTS.filter((p) => withFans || p.key !== "fans");
  const total = parts.reduce((a, p) => a + p.weight, 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`Star Score weights: ${parts.map((p) => `${p.label} ${p.weight}%`).join(", ")}`}>
        {parts.map((p) => (
          <span key={p.key} style={{ width: `${(p.weight / total) * 100}%`, background: PART_COLOR[p.key] }} className="border-r border-surface last:border-0" />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-ink-2">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: PART_COLOR[p.key] }} />
            {p.label} <span className="tabular font-semibold text-ink">{Math.round((p.weight / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One hero's Star Score, part by part. */
export function HeroStarBreakdown({ parts, raw }: { parts: StarPart[]; raw: (p: StarPart) => string }) {
  return (
    <ul className="divide-y divide-line">
      {parts.map((p) => {
        const def = STAR_PARTS.find((d) => d.key === p.key)!;
        return (
          <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[180px_minmax(0,1fr)_230px_48px]">
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PART_COLOR[p.key] }} />
              {p.label}
            </span>
            <span className="tabular text-right text-[13px] font-semibold text-ink sm:order-last">{p.score === null ? "—" : Math.round(p.score)}</span>
            <span className="relative col-span-2 h-2 rounded-full bg-surface-2 sm:col-span-1" title={def.how}>
              {p.score !== null && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${p.score}%`, background: PART_COLOR[p.key] }} />}
            </span>
            <span className="col-span-2 text-[11.5px] text-muted sm:col-span-1 sm:text-right">
              {p.score === null
                ? p.raw !== null
                  ? `${raw(p)} — too few reported grosses, weight shared out`
                  : "no data — weight shared out"
                : `${raw(p)} · weighs ${Math.round(p.effectiveWeight)}%`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
