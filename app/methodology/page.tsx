import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/charts/film-strip";
import { PageHeader, SectionTitle } from "@/components/layout/page-header";
import { DATA_MODE } from "@/lib/env";
import { tollyIndexEnabled } from "@/lib/features";
import { date, int } from "@/lib/format";
import { OUTCOME_LABEL, type Outcome } from "@/lib/ledger-types";
import { tollyMeta } from "@/lib/tolly/view";

export const metadata: Metadata = { title: "How it works", description: "How the Tolly Index is made: our own research, our own formula." };

/** The ingredients of the Tolly Index, without the quantities. */
const INGREDIENTS = [
  { name: "Audience", what: "How much people love his films, how many watched them, and how long they keep talking about them.", te: "Theatre lo whistles kottara, leka interval lone intiki vellipoyara?" },
  { name: "Box office", what: "How often his films hit, how big the hits were, and how much they collected.", te: "Collections poster meeda kaadu, trade reports lo chusam." },
  { name: "Recent form", what: "How his latest films did. Old glory counts, but today counts more.", te: "Paata hits meeda enni rojulu bathukutham bro?" },
  { name: "Fame", what: "How many fans follow him on his official accounts.", te: "Fans entha mandi unnaro lekkapettam. Bots ni kaadu." },
  { name: "Career", what: "How steady, long and busy his career has been.", te: "Okka cinema wonder aa, leka long run aa?" },
];

const RULES = [
  "Only lead roles count, from 2000 onwards. Cameos and special appearances don't.",
  "A film is scored only when we have enough data on it. Missing data is shown as missing, never guessed.",
  "Films from the last two years are marked provisional: the box office and the audience are still deciding.",
  "Heroes from other industries count only for their films released in Telugu, and sit outside the Telugu index.",
  "A hit is a hit, super hit or blockbuster, as reported by the trade, or a gross of at least twice the budget.",
];

const MARKS: { o: Outcome; g: number; note: string }[] = [
  { o: "blockbuster", g: 1500, note: "solid, darkest" },
  { o: "hit", g: 300, note: "solid" },
  { o: "average", g: 60, note: "half filled" },
  { o: "flop", g: 15, note: "outline" },
  { o: "unknown", g: 0, note: "dotted, short" },
];

export default function MethodologyPage() {
  const showTolly = DATA_MODE === "real" && tollyIndexEnabled();
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="How it works"
        subtitle="Our own research, our own formula, our own Tolly Index: one number out of 100 for every Telugu hero."
        aside={showTolly ? <>Data as of {date(tollyMeta.asOf)}</> : undefined}
      />

      <div className="mt-14 grid gap-x-16 gap-y-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="what">
          <SectionTitle id="what" title="What we did" />
          <p className="text-[16px] leading-relaxed text-ink-2">
            We researched thousands of Telugu films: how they did at the box office, how much audiences loved them, how long people kept talking about them, and how many
            fans follow each hero. From that we made our own formula, and from it the <b className="font-semibold text-ink">Tolly Index</b>.
          </p>
          {showTolly && (
            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-rule pt-5">
              <div>
                <dt className="label">Films scored</dt>
                <dd className="num mt-1 text-[28px] font-semibold text-ink">{int(tollyMeta.films.complete)}</dd>
              </div>
              <div>
                <dt className="label">Provisional</dt>
                <dd className="num mt-1 text-[28px] font-semibold text-ink">{int(tollyMeta.films.provisional)}</dd>
              </div>
              <div>
                <dt className="label">Heroes ranked</dt>
                <dd className="num mt-1 text-[28px] font-semibold text-ink">{tollyMeta.heroes.qualified}</dd>
              </div>
            </dl>
          )}
        </section>

        <section aria-labelledby="recipe">
          <SectionTitle id="recipe" title="The recipe stays in the kitchen" />
          <blockquote className="border-l-2 border-accent pl-5 font-serif text-[21px] leading-snug text-ink">
            Idhe mana app ki secret masala kada bro, idhi cheppesthe inkem undhi! Biryani hotel vaadu recipe bayataki chepthada? Memu kuda anthe.
          </blockquote>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            We tell you every ingredient and show you every film behind every score. The exact quantities stay ours. <span className="text-muted">Mee interest ki Johaar.</span>
          </p>
        </section>
      </div>

      <section aria-labelledby="ingredients" className="mt-24">
        <SectionTitle id="ingredients" title="What goes into the pot" finding="Five ingredients. Each is scored 0 to 100 against the other ranked heroes." />
        <ol className="divide-y divide-rule border-y border-rule">
          {INGREDIENTS.map((g, i) => (
            <li key={g.name} className="grid gap-x-8 gap-y-1 py-5 sm:grid-cols-[48px_200px_1fr_1fr] sm:items-baseline">
              <span className="tabular text-[13px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[17px] font-semibold text-ink">{g.name}</span>
              <span className="text-[15px] leading-relaxed text-ink-2">{g.what}</span>
              <span className="text-[14px] italic leading-relaxed text-muted">{g.te}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-24 grid gap-x-16 gap-y-20 lg:grid-cols-2">
        <section aria-labelledby="marks">
          <SectionTitle id="marks" title="Reading a film mark" finding="Every film on the site is drawn the same way, on the same timeline." />
          <div className="frame flex items-end gap-6 px-6 pb-5 pt-8">
            {MARKS.map((m) => (
              <figure key={m.o} className="flex flex-col items-center gap-2">
                <svg width="22" height="72" aria-hidden className="overflow-visible">
                  <Mark x={11} base={72} h={Math.max(10, (0.22 + (0.78 * Math.log10(Math.max(1, m.g))) / Math.log10(2000)) * 72 * (m.g ? 1 : 0.4))} w={14} o={m.o} litOn />
                </svg>
                <figcaption className="text-center text-[12px] leading-tight">
                  <span className="block font-medium text-ink">{OUTCOME_LABEL[m.o].replace("Result not reported", "Not reported")}</span>
                  <span className="text-muted">{m.note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
            The mark sits on the day the film released. Its height is the reported worldwide gross on a log scale, so a ₹1,000-crore film is taller than a ₹100-crore film without
            flattening everything else. Colour and shape both show the result, so the marks read in black and white too. Films too recent to judge, or released straight to OTT, are
            drawn dotted.
          </p>
        </section>

        <section id="how" aria-labelledby="fair">
          <SectionTitle id="fair" title="Rules that keep it fair" />
          <ul className="space-y-3 text-[15px] leading-relaxed text-ink-2">
            {RULES.map((r) => (
              <li key={r} className="flex gap-3">
                <span aria-hidden className="mt-[11px] h-1 w-3 shrink-0 rounded-full bg-field-2" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[14px] leading-relaxed text-muted">Scores are our opinion from our own method, not facts about anyone.</p>
        </section>
      </div>

      <section aria-labelledby="wrong" className="mt-24 border-t border-rule pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 id="wrong" className="font-serif text-[26px] font-semibold text-ink">Something looks wrong?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              Tell us. We fix it and the numbers update. <span className="text-muted">Thappulunte kshaminchandi, chepthe sarididdukuntaam.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium">
            <Link href="/annexure/corrections" className="link">
              Suggest a correction
            </Link>
            <Link href="/annexure" className="link">
              Film-by-film evidence
            </Link>
            <Link href="/annexure/sources" className="link">
              Data credits
            </Link>
            <Link href="/contact" className="link">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
