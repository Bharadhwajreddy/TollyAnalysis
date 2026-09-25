import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { INDUSTRY_LABEL } from "@/lib/constants/metrics";
import { EDITORIALLY_EXCLUDED_NAMES } from "@/lib/constants/roster";
import { getRegistry } from "@/lib/repositories";

export const metadata: Metadata = { title: "Annexure · Hero Registry" };

const TIER = {
  default: { label: "Default roster", cls: "bg-wine-soft text-wine" },
  emerging: { label: "Emerging", cls: "bg-teal-soft text-[#00596a]" },
  unverified: { label: "No verified lead film", cls: "bg-surface-2 text-muted" },
} as const;

export default async function RegistryPage() {
  const registry = (await getRegistry()).sort((a, b) => b.eligibleLeadFilms - a.eligibleLeadFilms || a.name.localeCompare(b.name));
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">2. Hero Registry</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
        The master registry built from verified film credits. Only approved principal or co-principal lead credits on eligible titles
        count. Excluded credits are listed with the rule that removed them.
      </p>
      <p className="mt-2 text-xs text-muted">
        Editorially excluded from the roster and seed data: {EDITORIALLY_EXCLUDED_NAMES.join(", ")} (see Change Log).
      </p>
      <div className="card scroll-x mt-5">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Person</th>
              <th scope="col" className="px-3 py-2 font-semibold">Industry</th>
              <th scope="col" className="px-3 py-2 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Eligible lead films</th>
              <th scope="col" className="px-3 py-2 font-semibold">Tier</th>
              <th scope="col" className="px-3 py-2 font-semibold">Excluded credits</th>
            </tr>
          </thead>
          <tbody>
            {registry.map((p) => (
              <tr key={p.slug} className="border-t border-line align-top">
                <td className="px-3 py-2">
                  <Link href={`/annexure/heroes/${p.slug}`} className="font-medium text-ink hover:text-wine">
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: INDUSTRY_COLOR[p.industry] }} />
                    {INDUSTRY_LABEL[p.industry]}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink-2">{p.status.replace("_", " ")}</td>
                <td className="tabular px-3 py-2 text-right font-semibold">{p.eligibleLeadFilms}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${TIER[p.tier as keyof typeof TIER].cls}`}>
                    {TIER[p.tier as keyof typeof TIER].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-ink-2">
                  {p.excluded.length === 0
                    ? "—"
                    : p.excluded.map((e) => (
                        <div key={e.title}>
                          {e.title} · <span className="font-mono">{e.roleScope}</span> · <span className="text-bad">{e.reason.replaceAll("_", " ")}</span>
                        </div>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
