"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DATA_ACTIONS, REVIEW_STATUSES } from "@/lib/validation/corrections";

export function ReviewForm({ id }: { id: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof REVIEW_STATUSES)[number]>("under_review");
  const [dataAction, setDataAction] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[160px_190px_1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/admin/corrections/${id}/review`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status, reviewNote: note, dataAction: dataAction || undefined }),
        });
        setBusy(false);
        if (res.ok) router.refresh();
        else {
          const b = await res.json().catch(() => ({}));
          setError(b.issues?.map((i: { message: string }) => i.message).join("; ") ?? b.error ?? "Failed");
        }
      }}
    >
      <label className="text-xs text-muted">
        Decision
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink">
          {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted">
        Data action {status === "approved" && <span className="text-bad">*</span>}
        <select value={dataAction} onChange={(e) => setDataAction(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink">
          <option value="">—</option>
          {DATA_ACTIONS.map((a) => <option key={a} value={a}>{a.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label className="text-xs text-muted">
        Review note
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink" />
      </label>
      <button type="submit" disabled={busy} className="rounded-md bg-wine px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
        {busy ? "Saving…" : "Record review"}
      </button>
      {error && <p role="alert" className="text-xs text-bad sm:col-span-4">{error}</p>}
    </form>
  );
}
