import Link from "next/link";
import type { ReactNode } from "react";
import { STAR_PARTS } from "@/lib/calculations/star";
import type { MethodologyVersion } from "@/lib/constants/methodology";
import { REPORTED_INSTAGRAM } from "@/lib/data/real/reported-social";
import { Collapsible } from "@/components/ui/collapsible";
import { StarWeights } from "./star-breakdown";

function Item({
  q,
  children,
  open = false,
}: {
  q: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      className="group border-b border-line py-3 last:border-0"
      open={open}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink">
        {q}
        <span
          aria-hidden
          className="text-muted transition-transform group-open/item:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink-2">
        {children}
      </div>
    </details>
  );
}

/** Plain-language explanation of every number, shown at the end of the page. */
export function HowWeCalculate({
  m,
  mode,
}: {
  m: MethodologyVersion;
  mode: "demo" | "live" | "real";
}) {
  const w = m.filmScoreWeights;
  return (
    <div id="how" className="scroll-mt-20 space-y-4">
      <Collapsible
        title="How we calculate everything"
        subtitle="Every number on this page, explained in plain words."
        defaultOpen
      >
        <div>
          <Item q="Star Score — the one number that combines everything" open>
            <p>
              The Star Score (out of 100) blends every KPI we have into one
              number. Each part is first turned into a score out of 100, then
              the parts are averaged with these weights:
            </p>
            <StarWeights withFans />
            <ul className="list-disc pl-5">
              {STAR_PARTS.map((p) => (
                <li key={p.key}>
                  <strong>
                    {p.label} ({p.weight}%)
                  </strong>{" "}
                  — {p.how}.
                </li>
              ))}
            </ul>
            <p>
              <strong>Percentile</strong> means “better than this share of the
              heroes compared”: 100 = the best, 50 = the middle. Ratios are
              blended toward the typical hero when a hero has few films with a
              known result, so two hits from two films does not count as a
              perfect 100%.
            </p>
            <p>
              <strong>Missing data is never counted as zero.</strong> If a hero
              has no reported box office or no follower count, that part is left
              out and its weight is shared among the parts he does have. Box-office money parts only count when at least 3 of his films (and a quarter of them) have a reported gross, so a career that the press rarely reported on isn&apos;t scored as small. The
              Star Score is not shown when less than half of the weight has
              data. Each hero&apos;s page shows his Star Score part by part.
            </p>
          </Item>
          {mode === "real" && (
            <Item q="Where does this data come from?" open>
              <p>
                <strong>Real, public sources.</strong> Each hero&apos;s films
                come from his Wikipedia filmography. Release dates, budgets and
                worldwide box-office grosses come from each film&apos;s
                Wikipedia article. Film IDs, languages, runtimes and X (Twitter)
                follower counts come from Wikidata. Photos come from Wikimedia
                Commons.
              </p>
              <p>
                <strong>Each film&apos;s result (hit, flop…)</strong> is taken
                from the first of these that states one: (1) the film&apos;s own
                English Wikipedia article; (2) the hero&apos;s Wikipedia article
                (e.g. “commercial successes such as Kithakithalu, Gamyam…”); (3)
                the film&apos;s Telugu Wikipedia article; (4) the yearly and
                per-hero “hits and flops” lists on mtwikiblog.com, a Telugu
                box-office blog (lowest confidence). Every film shows which one
                was used and links to it.
              </p>
              <p>
                A film counts for a hero only if he is{" "}
                <strong>billed first</strong> in the film&apos;s cast list, or
                billed right after another hero (a genuine two-hero film).
                Cameos, voice roles, supporting roles, other-language films and
                unreleased films are left out and listed on each hero&apos;s
                page. This is automatic and may contain mistakes. Please use
                “Suggest a correction”.
              </p>
              <p>
                <strong>Followers:</strong> X counts are the latest dated values
                on Wikidata (mostly February 2023). Instagram counts are as
                reported by{" "}
                <a
                  className="text-wine underline"
                  href={REPORTED_INSTAGRAM.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {REPORTED_INSTAGRAM.source}
                </a>{" "}
                on {REPORTED_INSTAGRAM.date}, which names{" "}
                {Object.keys(REPORTED_INSTAGRAM.followers).length} heroes;
                others show “—”. Instagram is never scraped.
              </p>
              <p>
                Not yet available: audience ratings (needs a free TMDb key or a
                licensed IMDb source). Small films that no source rates stay
                “not reported” rather than being guessed; direct-to-OTT films
                are marked as such.
              </p>
            </Item>
          )}
          {mode === "demo" && (
            <Item q="Is this real data?" open>
              <p>
                <strong>Not yet.</strong> The hero names and photos are real,
                but every film, rating, box-office result and social number is
                made-up demo data used to build and check the charts. Real,
                sourced data replaces it once it is added.
              </p>
            </Item>
          )}
          <Item q="Who counts as a hero?">
            <p>
              An actor counts only for films where he is the main lead, or one
              of two genuine co-leads. Cameos, guest or special appearances,
              supporting roles, song-only and voice-only roles do not count.
            </p>
            <p>If a film has two genuine heroes, it counts for both of them.</p>
            <p>
              The charts show heroes with at least{" "}
              {m.minEligibleFilmsForDefaultRoster} films. Switch on “Include
              newcomers” to see heroes with 1–2 films.
            </p>
          </Item>
          <Item q="Which films count?">
            <p>
              Feature films released from 1 January 2000, either made in Telugu
              or released dubbed in Telugu. Films that went straight to OTT
              count too.
            </p>
            <p>
              Web series, TV shows, short films, YouTube films, anthology
              segments and re-releases do not count.
            </p>
            <p>
              Tamil, Malayalam, Kannada and Hindi heroes appear only through
              films that were released in Telugu.
            </p>
          </Item>
          <Item q="What is a “hit”?">
            <p>
              A reported verdict comes first: “blockbuster” or “industry hit” ={" "}
              <strong>Blockbuster</strong>; “hit”, “super hit”, “commercial
              success” = <strong>Hit</strong>; “average”, “above/below average”,
              “moderate success” = <strong>Average</strong>; “flop”, “disaster”,
              “box-office bomb” = <strong>Flop</strong>. When no source states a
              verdict but both budget and worldwide gross are reported, we use
              the ratio: gross at least <strong>3× budget</strong> =
              Blockbuster, <strong>2–3×</strong> = Hit, <strong>1–2×</strong> =
              Average, under 1× = Flop.
            </p>
            <p>
              Films with neither are “result unknown” and are left out of the
              success ratio. They are never counted as flops.
            </p>
            <p>
              Behind the scenes every film also gets a{" "}
              <strong>film score out of 100</strong> (used for consistency and
              recent form), made from:
            </p>
            <ul className="list-disc pl-5">
              <li>
                {Math.round(w.audience * 100)}% — how audiences rated it
                (ratings with few votes count less)
              </li>
              <li>
                {Math.round(w.commercialPlatform * 100)}% — box-office result in
                Telugu, or the OTT result for OTT films
              </li>
              <li>
                {Math.round(w.evidenceQuality * 100)}% — how solid the evidence
                is (more and better sources = higher)
              </li>
              <li>
                {Math.round(w.legacy * 100)}% — lasting popularity or cult
                status, when an editor has reviewed it
              </li>
            </ul>
            <p>
              Missing parts are skipped and the remaining weights are scaled up.
            </p>
          </Item>
          <Item q="Success ratio, hits and recent success">
            <p>
              <strong>Hits</strong> = number of hit films.{" "}
              <strong>Success ratio</strong> = hits ÷ films that have enough
              data to judge, as a percentage.
            </p>
            <p>
              <strong>Recent success</strong> = the same ratio for the latest{" "}
              {m.momentumWindow} films only.
            </p>
            <p>
              Films without enough data are left out of the ratio. They are
              never counted as flops.
            </p>
          </Item>
          <Item q="Box-office money numbers">
            <p>
              <strong>Total box office</strong>, <strong>biggest film</strong>{" "}
              and <strong>₹100-crore films</strong> use the worldwide gross
              reported on Wikipedia, in ₹ crore, across all languages. When a
              range is given (e.g. ₹600–650 crore), we use the lower number.
              Films without a reported gross are simply not added.
            </p>
          </Item>
          <Item q="Audience rating">
            <p>
              The simple average of the audience ratings (out of 10) of the
              hero&apos;s films. Shown only once a ratings source is connected.
            </p>
          </Item>
          <Item q="Films, most films in a year, gap between films">
            <p>
              <strong>Films</strong> = number of counted films.{" "}
              <strong>Most films in one year</strong> = the busiest calendar
              year.
            </p>
            <p>
              <strong>Average gap between films</strong> = the typical number of
              months between one release and the next. Shorter means he releases
              more often.
            </p>
          </Item>
          <Item q="Dubbed and OTT films">
            <p>
              For a dubbed film we only use box-office numbers reported for the
              Telugu version. If only the all-languages total is known, the
              Telugu result is marked “unknown”. It is never guessed.
            </p>
            <p>
              For OTT films we use official platform results. If there are none,
              the result is “unknown”, not zero.
            </p>
          </Item>
          <Item q="What is the red line in the scatter charts?">
            <p>
              It is the <strong>best trade-off line</strong> (also called a
              Pareto line). It joins the heroes nobody else beats on both axes
              at once. Heroes on the line are the best balance of the two things
              you chose.
            </p>
            <p>
              Use the “Across” and “Up” menus above each chart to change what is
              compared.
            </p>
          </Item>
          <Item q="Colours">
            <p>
              <strong>Debut era</strong> colours heroes by the year of their
              first lead role. <strong>Film family</strong> colours the Mega,
              Nandamuri, Akkineni, Daggubati, Ghattamaneni and Manchu families;
              everyone else is grey. Tap a colour in a legend to hide that
              group.
            </p>
          </Item>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link
            href="/methodology"
            className="font-semibold text-wine underline"
          >
            Full methodology
          </Link>
          <Link href="/annexure/sources" className="text-wine underline">
            Sources
          </Link>
          <Link href="/annexure/coverage" className="text-wine underline">
            Missing data
          </Link>
          <Link href="/annexure/photo-credits" className="text-wine underline">
            Photo credits
          </Link>
          <Link href="/annexure/corrections" className="text-wine underline">
            Suggest a correction
          </Link>
        </div>
      </Collapsible>
      <Collapsible
        title="About this snapshot"
        subtitle="What is included, what is not, and how to correct it"
      >
        <div className="space-y-2 text-[14px] leading-relaxed text-ink-2">
          <p>
            This is a public-source snapshot, refreshed by re-running the
            importer. Lead credits and film results are read automatically and
            can be wrong; supporting and antagonist parts that the billing check
            misses are removed by hand and listed on each hero&apos;s page.
          </p>
          <p>
            Heroes are Telugu film leads only. Films count from 1 January 2000.
            Panja Vaisshnav Tej is excluded by editorial decision. Nothing is
            scraped from IMDb, BookMyShow or social networks.
          </p>
          <p>
            Spotted a wrong result or credit? Use{" "}
            <Link href="/annexure/corrections" className="text-wine underline">
              Suggest a correction
            </Link>{" "}
            — every film row on a hero&apos;s page links to its source so it can
            be checked.
          </p>
        </div>
      </Collapsible>
    </div>
  );
}
