import type { Metadata } from "next";
import { getChangeLog } from "@/lib/repositories";

export const metadata: Metadata = { title: "Annexure · Change Log" };
export const dynamic = "force-dynamic";

export default async function ChangeLogPage() {
  const log = await getChangeLog();
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">7. Change Log</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
        Append-only record of editorial decisions, methodology activations and reviewed corrections.
      </p>
      <ol className="mt-5 space-y-2">
        {log.map((e) => (
          <li key={e.id} className="card p-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <time className="tabular font-mono text-[11px] text-muted" dateTime={e.createdAt}>
                {e.createdAt.replace("T", " ").slice(0, 16)} UTC
              </time>
              <span className="rounded bg-wine-soft px-1.5 py-0.5 font-mono text-[11px] text-wine">{e.action}</span>
              <span className="text-ink-2">
                {e.entityType} · <code className="font-mono text-[11px]">{e.entityId}</code>
              </span>
              {e.actor && <span className="ml-auto text-xs text-muted">by {e.actor}</span>}
            </div>
            <p className="mt-1 text-ink">{e.reason}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
