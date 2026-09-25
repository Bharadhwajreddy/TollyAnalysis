import type { Metadata } from "next";
import Link from "next/link";
import { DemoBadge } from "@/components/ui/badges";
import { getCoverage, getMeta } from "@/lib/repositories";

export const metadata: Metadata = { title: "Annexure & Sources" };

const CARDS = [
  { href: "/annexure/methodology", title: "Methodology", body: "Formulas, weights, thresholds, missing-data rules and the active methodology version." },
  { href: "/annexure/registry", title: "Hero Registry", body: "Every person in the master registry, their eligible lead-film count and excluded credits with reasons." },
  { href: "/annexure/heroes", title: "Hero detail & filmography", body: "Per-hero film titles, release type and route, audience and commercial evidence, scores and sources." },
  { href: "/annexure/sources", title: "Source Ledger", body: "Every data source, its type, licensing note and reliability tier." },
  { href: "/annexure/coverage", title: "Data Coverage", body: "How much evidence exists, what is missing, disputed, or not yet final." },
  { href: "/annexure/changelog", title: "Change Log", body: "Immutable record of editorial decisions, methodology changes and reviewed corrections." },
  { href: "/annexure/corrections", title: "Suggest a Correction", body: "Send a sourced correction. Submissions stay private until editorially reviewed." },
];

export default async function AnnexurePage() {
  const [meta, cov] = await Promise.all([getMeta(), getCoverage()]);
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">Annexure &amp; Sources</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
        Everything behind the dashboard: movie-level evidence, formulas, sources, disputes and the correction workflow.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        {meta.mode === "demo" && <DemoBadge />}
        <span>
          {cov.totalFilms} eligible titles · {cov.byStatus.scored} scored · {cov.byStatus.provisional} provisional ·{" "}
          {cov.byStatus.insufficient_evidence} insufficient · {cov.byStatus.not_yet_final} not yet final
        </span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CARDS.map((c, i) => (
          <Link key={c.href} href={c.href} className="card group p-4 transition-shadow hover:shadow-md">
            <p className="eyebrow">Section {i === 2 ? "3–4" : i < 2 ? i + 1 : i + 2}</p>
            <p className="mt-1 font-semibold text-ink group-hover:text-wine">{c.title} →</p>
            <p className="mt-1 text-sm text-ink-2">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
