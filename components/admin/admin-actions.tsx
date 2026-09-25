"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecalculateButton({ enabled }: { enabled: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={!enabled || busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/admin/recalculate", { method: "POST" });
          const body = await res.json().catch(() => ({}));
          setBusy(false);
          setMsg(res.ok ? `Recalculated ${body.result.heroes} heroes and ${body.result.films} films.` : body.error ?? "Failed");
        }}
        className="rounded-md bg-wine px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Recalculating…" : "Recalculate all heroes"}
      </button>
      {!enabled && <p className="mt-2 text-xs text-muted">Needs DATABASE_URL. In demo mode metrics are computed in memory on every start.</p>}
      {msg && <p role="status" className="mt-2 text-sm text-ink-2">{msg}</p>}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/session", { method: "DELETE" });
        router.push("/admin/login");
      }}
      className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink"
    >
      Sign out
    </button>
  );
}
