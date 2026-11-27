"use client";

import { OUTCOME_VAR, type Outcome } from "@/lib/ledger-types";

/** Client copy of the inline film mark (the token version is a server component). */
export function MiniMarkClient({ o }: { o: Outcome }) {
  const c = OUTCOME_VAR[o];
  if (o === "hit" || o === "blockbuster") return <svg width="7" height="13" aria-hidden><rect width="7" height="13" rx="1" fill={c} /></svg>;
  if (o === "average")
    return (
      <svg width="7" height="13" aria-hidden>
        <rect x="0.5" y="0.5" width="6" height="12" rx="1" fill="none" stroke={c} />
        <rect y="6.5" width="7" height="6.5" rx="1" fill={c} />
      </svg>
    );
  if (o === "flop" || o === "disaster") return <svg width="7" height="13" aria-hidden><rect x="0.6" y="0.6" width="5.8" height="11.8" rx="1" fill="none" stroke={c} strokeWidth="1.2" /></svg>;
  return <svg width="7" height="13" aria-hidden><rect x="0.5" y="4.5" width="6" height="8" rx="1" fill="none" stroke={c} strokeDasharray="1.5 1.2" /></svg>;
}
