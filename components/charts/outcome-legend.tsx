import { MiniMark } from "@/components/entity/tokens";
import { OUTCOME_LABEL, type Outcome } from "@/lib/ledger-types";

const ORDER: Outcome[] = ["blockbuster", "hit", "average", "flop", "unknown"];

/** The legend for film marks, shared by every strip. */
export function OutcomeLegend({ height = true }: { height?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
      {ORDER.map((o) => (
        <span key={o} className="inline-flex items-center gap-1.5">
          <MiniMark o={o} />
          {o === "unknown" ? "Not reported" : o === "flop" ? "Flop / disaster" : OUTCOME_LABEL[o]}
        </span>
      ))}
      {height && <span className="text-faint">·  taller = bigger reported gross</span>}
    </span>
  );
}
