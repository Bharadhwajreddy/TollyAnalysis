"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card mt-5 space-y-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
        setBusy(false);
        if (res.ok) router.push("/admin");
        else setError((await res.json().catch(() => ({}))).error ?? "Sign-in failed");
      }}
    >
      <label htmlFor="token" className="block text-sm font-medium text-ink">Admin token</label>
      <input id="token" type="password" autoComplete="current-password" value={token} onChange={(e) => setToken(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
      <button type="submit" disabled={busy || !token} className="rounded-md bg-wine px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </form>
  );
}
