import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CONTACT_EMAIL } from "@/lib/constants/site";
import { tollyMeta } from "@/lib/tolly/view";
import { date } from "@/lib/format";

const COLS: { title: string; links: [string, string][] }[] = [
  { title: "Explore", links: [["/tolly-index", "Tolly Index"], ["/heroes", "Heroes"], ["/films", "Films"], ["/directors", "Directors"], ["/releases", "Years"], ["/compare", "Compare"]] },
  { title: "The data", links: [["/methodology", "How the score works"], ["/annexure", "Film-by-film evidence"], ["/annexure/sources", "Data credits"], ["/annexure/photo-credits", "Photo credits"], ["/annexure/corrections", "Suggest a correction"]] },
  { title: "About", links: [["/contact", "Contact"], ["/careers", "Careers"], ["/terms", "Terms of use"], ["/privacy", "Privacy"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-serif text-[22px] font-semibold leading-tight text-ink">
            TA<span className="text-accent">.</span> Tollywood Analysis
          </p>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-2">Every Telugu film since 2000 on one timeline. Independent and non-commercial.</p>
          <p className="mt-4 text-[13px] text-muted">Data as of {date(tollyMeta.asOf)}</p>
          <div className="mt-5">
            <ThemeToggle />
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="label">{c.title}</p>
            <ul className="mt-3 space-y-2 text-[14px]">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-2 transition-colors hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
              {c.title === "About" && (
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink-2 transition-colors hover:text-ink">
                    {CONTACT_EMAIL}
                  </a>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1280px] border-t border-rule px-4 py-5 text-[12px] leading-relaxed text-muted sm:px-6 lg:px-8">
        Scores are our opinion, from our own research and formula. Not affiliated with any studio or actor. Sources are listed on the{" "}
        <Link href="/annexure/sources" className="link">
          data credits
        </Link>{" "}
        page.
      </div>
    </footer>
  );
}
