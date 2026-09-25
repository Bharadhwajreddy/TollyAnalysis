import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRY_COLOR } from "@/lib/constants/colors";
import { getRegistry } from "@/lib/repositories";

export const metadata: Metadata = { title: "Annexure · Hero detail" };

export default async function HeroIndexPage() {
  const registry = (await getRegistry()).filter((p) => p.eligibleLeadFilms > 0).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink">3–4. Hero detail &amp; filmography</h1>
      <p className="mt-1.5 max-w-3xl text-[15px] text-ink-2">
        Choose a hero to see their eligible titles and film-level evidence: release type and route, audience and commercial
        evidence, Film Success Score, confidence and sources.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {registry.map((p) => (
          <li key={p.slug}>
            <Link href={`/annexure/heroes/${p.slug}`} className="card flex items-center gap-3 p-3 hover:shadow-md">
              <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: INDUSTRY_COLOR[p.industry] }} />
              <span className="font-medium text-ink">{p.name}</span>
              <span className="tabular ml-auto text-xs text-muted">{p.eligibleLeadFilms} films</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
