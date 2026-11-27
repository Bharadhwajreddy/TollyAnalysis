export interface FactorRow {
  key: string;
  group: string;
  label: string;
  value: number | null;
  median: number | null;
  fact: string | null;
}

/**
 * The 15 numbers behind the five pillars, each 0–100 against the other ranked heroes. Ingredients, not
 * quantities: the recipe's weights are deliberately not shown.
 */
export function FactorTable({ rows, name }: { rows: FactorRow[]; name: string }) {
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <div className="scroll-x">
      <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
        <caption className="sr-only">The 15 numbers behind {name}&rsquo;s Tolly Index, each out of 100</caption>
        <thead>
          <tr className="border-b border-rule text-left">
            <th scope="col" className="label py-2 pr-4 font-semibold">Number</th>
            <th scope="col" className="label w-[44%] py-2 pr-4 font-semibold">
              {name} <span className="font-normal normal-case tracking-normal text-faint">· dashed = typical</span>
            </th>
            <th scope="col" className="label py-2 font-semibold">What it is built from</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g}>
            <tr>
              <th colSpan={3} scope="colgroup" className="pb-1 pt-4 text-left text-[12.5px] font-semibold text-ink">
                {g}
              </th>
            </tr>
            {rows
              .filter((r) => r.group === g)
              .map((r) => (
                <tr key={r.key} className="border-b border-rule">
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-ink-2">{r.label}</th>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-3">
                      <span className="tabular w-9 shrink-0 text-right font-semibold text-ink">{r.value === null ? <span className="font-normal text-faint">—</span> : r.value.toFixed(0)}</span>
                      <span aria-hidden className="relative h-3 flex-1">
                        <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
                        {r.median !== null && <span className="absolute top-0 h-3 border-l border-dashed border-ink-2/70" style={{ left: `${r.median}%` }} />}
                        {r.value !== null && <span className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-surface bg-accent" style={{ left: `${r.value}%` }} />}
                      </span>
                    </span>
                  </td>
                  <td className="py-2 text-[13px] text-muted">{r.fact ?? "No data yet"}</td>
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
