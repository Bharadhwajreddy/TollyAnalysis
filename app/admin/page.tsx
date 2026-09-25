import type { Metadata } from "next";
import Link from "next/link";
import { RecalculateButton, SignOutButton } from "@/components/admin/admin-actions";
import { requireAdminPage } from "@/lib/auth/admin";
import { serverEnv } from "@/lib/env";
import { getMeta } from "@/lib/repositories";
import { getCorrectionStore } from "@/lib/repositories/corrections";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdminPage();
  const env = serverEnv();
  const [meta, pending] = await Promise.all([getMeta(), (await getCorrectionStore()).list({ status: "pending" })]);
  const flags = [
    ["Data mode", meta.mode],
    ["Database", env.DATABASE_URL ? "connected (DATABASE_URL set)" : "not configured — in-memory demo store"],
    ["TMDb", env.FEATURE_TMDB ? (env.TMDB_API_READ_TOKEN ? "enabled" : "flag on, token missing") : "disabled"],
    ["IMDb", env.FEATURE_IMDB_LICENSED ? "licensed source enabled" : "disabled (no licence)"],
    ["Instagram", env.FEATURE_INSTAGRAM ? "enabled" : "disabled"],
    ["X", env.FEATURE_X ? "enabled" : "disabled"],
    ["YouTube", env.FEATURE_YOUTUBE ? "enabled" : "disabled"],
    ["Facebook", env.FEATURE_FACEBOOK ? "enabled" : "disabled"],
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="flex items-center justify-between pt-8">
        <h1 className="font-serif text-3xl font-bold text-ink">Editorial admin</h1>
        <SignOutButton />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-ink">Corrections queue</h2>
          <p className="mt-1 text-3xl font-semibold text-wine">{pending.length}</p>
          <p className="text-xs text-muted">pending submissions</p>
          <Link href="/admin/corrections" className="mt-3 inline-block text-sm font-semibold text-wine underline">Review queue →</Link>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-ink">Calculation</h2>
          <p className="mb-3 mt-1 text-xs text-muted">Methodology {meta.methodologyName} · last calculated {meta.calculatedAt?.slice(0, 16).replace("T", " ") ?? "never"}</p>
          <RecalculateButton enabled={!!env.DATABASE_URL} />
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-ink">Data entry &amp; imports</h2>
          <p className="mt-1 text-sm text-ink-2">People, films, lead credits, source claims (JSON or CSV), social snapshots and TMDb import.</p>
          <Link href="/admin/data" className="mt-3 inline-block text-sm font-semibold text-wine underline">Open data console →</Link>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-ink">Providers &amp; kill switches</h2>
          <dl className="mt-2 grid grid-cols-[110px_1fr] gap-y-1 text-[13px]">
            {flags.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
