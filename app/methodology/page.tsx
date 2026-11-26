import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled } from "@/lib/features";
import { breadcrumbJsonLd, faqJsonLd, JsonLd, jsonLdGraph, methodologyFaq, pageMetadata, webPageJsonLd } from "@/lib/seo";
import { tollyMeta } from "@/lib/tolly/view";

const METHODOLOGY_DESCRIPTION =
  "How Tollywood Analysis calculates the Tolly Index and Star Score: all 15 factors, box-office hit and flop rules, lead-credit eligibility and public data sources.";

export const metadata: Metadata = pageMetadata({
  title: "How It Works — Tolly Index & Star Score Methodology",
  description: METHODOLOGY_DESCRIPTION,
  path: "/methodology",
  keywords: ["Tolly Index formula", "Star Score methodology", "how Telugu box office verdict is calculated", "Tollywood Analysis methodology"],
});

/** The ingredients of the Tolly Index, without the recipe. */
const INGREDIENTS = [
  { name: "Audience love", color: "var(--wine)", what: "How much people love his films, how many watched them, and how long they keep talking about them.", te: "Theatre lo whistles kottara, leka interval lone intiki vellipoyara?" },
  { name: "Box office", color: "#2a78d6", what: "How often his films hit, how big the hits were, and how much they collected.", te: "Collections poster meeda kaadu, trade reports lo chusam." },
  { name: "Recent form", color: "#1baf7a", what: "How his latest films did. Old glory counts, but today counts more.", te: "Paata hits meeda enni rojulu bathukutham bro?" },
  { name: "Fame", color: "#b7791f", what: "How many fans follow him on his official accounts.", te: "Fans entha mandi unnaro lekkapettam. Bots ni kaadu." },
  { name: "Career", color: "#8a7f78", what: "How steady, long and busy his career has been.", te: "Okka cinema wonder aa, leka long run aa?" },
];

const RULES = [
  "Only lead roles count, from 2000 onwards. Cameos and special appearances don't.",
  "A film is scored only when we have enough data on it. Missing data is shown as missing, never guessed.",
  "Films from the last two years are marked provisional: the box office and the audience are still deciding.",
  "Heroes from other industries count only for their films released in Telugu.",
];

export default function MethodologyPage() {
  const showTolly = DATA_MODE === "real" && tollyIndexEnabled();
  const jsonLd = jsonLdGraph(
    webPageJsonLd({
      path: "/methodology",
      name: "How It Works — Tolly Index & Star Score Methodology · Tollywood Analysis",
      description: METHODOLOGY_DESCRIPTION,
      dateModified: tollyMeta.asOf,
      breadcrumb: true,
    }),
    breadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "How it works", path: "/methodology" },
      ],
      "/methodology",
    ),
    faqJsonLd(methodologyFaq(DATA_MODE), "/methodology"),
  );
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <JsonLd data={jsonLd} />
      <PageHeader title="How it works" subtitle="Our own research, our own formula, our own Tolly Index." />

      <section id="tolly-index" aria-labelledby="what" className="mt-8 scroll-mt-24">
        <h2 id="what" className="font-serif text-[24px] font-semibold text-ink">What we did</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          We researched thousands of Telugu films: how they did at the box office, how much audiences loved them, how long people kept talking about them, and how many fans follow
          each hero. With that data we made our own formula, and from it our own score for every hero: the <b className="text-ink">Tolly Index</b>, one number out of 100.
        </p>
        {showTolly && (
          <p className="mt-2 text-[13.5px] text-muted">
            Data as of {tollyMeta.asOf}: {tollyMeta.films.complete.toLocaleString("en-IN")} films scored, {tollyMeta.heroes.qualified} heroes ranked.
          </p>
        )}
      </section>

      <section aria-labelledby="masala" className="cinema mt-8 rounded-2xl p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d8a86b]">The recipe</p>
        <h2 id="masala" className="mt-2 font-serif text-[26px] font-semibold text-white">Secret masala 🌶️</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-[#f3e7dc]">
          Idhe mana app ki secret masala kada bro, idhi cheppesthe inkem undhi! Biryani hotel vaadu recipe bayataki chepthada? Memu kuda anthe. Ingredients
          chepthaam, kolathalu maatram secret. 😄
        </p>
        <p className="mt-3 text-[17px] font-semibold text-[#e8b65a]">Mee interest ki Johaar! 🙏</p>
      </section>

      <section aria-labelledby="ingredients" className="mt-8">
        <h2 id="ingredients" className="font-serif text-[22px] font-semibold text-ink">What goes into the pot</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {INGREDIENTS.map((g) => (
            <li key={g.name} className="card p-4">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: g.color }} />
                {g.name}
              </p>
              <p className="mt-1 text-[14px] text-ink-2">{g.what}</p>
              <p className="mt-2 text-[14px] text-muted">{g.te}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" aria-labelledby="fair" className="mt-8">
        <h2 id="fair" className="font-serif text-[22px] font-semibold text-ink">Rules that keep it fair</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14.5px] text-ink-2">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] text-ink-2">
          The Star Score and the other rankings use the same research, cut different ways. Scores are our opinion from our own method, not facts about anyone.
        </p>
      </section>

      <section aria-labelledby="wrong" className="card mt-8 p-5">
        <h2 id="wrong" className="font-serif text-[20px] font-semibold text-ink">Something looks wrong?</h2>
        <p className="mt-1 text-[14.5px] text-ink-2">
          Tell us. We fix it and the numbers update. <span>Thappulunte kshaminchandi, chepthe sarididdukuntaam.</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/contact" className="rounded-full bg-wine px-4 py-1.5 text-[13.5px] font-semibold text-white hover:opacity-90">Contact us →</Link>
          <Link href="/annexure/corrections" className="rounded-full border border-line bg-surface px-4 py-1.5 text-[13.5px] font-medium text-ink hover:border-wine/40 hover:text-wine">Suggest a correction →</Link>
          <Link href="/annexure/sources" className="rounded-full border border-line bg-surface px-4 py-1.5 text-[13.5px] font-medium text-ink hover:border-wine/40 hover:text-wine">Data credits →</Link>
        </div>
      </section>
    </div>
  );
}
