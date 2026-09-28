import Link from "next/link";
import type { ReactNode } from "react";
import type { MethodologyVersion } from "@/lib/constants/methodology";

function Item({ q, children, open = false }: { q: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line py-3 last:border-0" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink">
        {q}
        <span aria-hidden className="text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}

/** Plain-language explanation of every number, shown at the end of the page. */
export function HowWeCalculate({ m, mode }: { m: MethodologyVersion; mode: "demo" | "live" }) {
  const w = m.filmScoreWeights;
  const hw = m.heroScoreWeights;
  return (
    <section id="how" aria-labelledby="how-title" className="card scroll-mt-20 p-5 sm:p-6">
      <h2 id="how-title" className="font-serif text-2xl font-bold text-ink">How we calculate everything</h2>
      <p className="mt-1 text-sm text-ink-2">Every number on this page, explained in plain words. Tap a question to open it.</p>
      <div className="mt-3">
        {mode === "demo" && (
          <Item q="Is this real data?" open>
            <p>
              <strong>Not yet.</strong> The hero names and photos are real, but every film, rating, box-office result and social
              number is made-up demo data used to build and check the charts. Real, sourced data replaces it once it is added.
            </p>
          </Item>
        )}
        <Item q="Who counts as a hero?">
          <p>An actor counts only for films where he is the main lead, or one of two genuine co-leads. Cameos, guest or special appearances, supporting roles, song-only and voice-only roles do not count.</p>
          <p>If a film has two genuine heroes, it counts for both of them.</p>
          <p>The charts show heroes with at least {m.minEligibleFilmsForDefaultRoster} films. Switch on “Include newcomers” to see heroes with 1–2 films.</p>
        </Item>
        <Item q="Which films count?">
          <p>Feature films released from 1 January 2000, either made in Telugu or released dubbed in Telugu. Films that went straight to OTT count too.</p>
          <p>Web series, TV shows, short films, YouTube films, anthology segments and re-releases do not count.</p>
          <p>Tamil, Malayalam, Kannada and Hindi heroes appear only through films that were released in Telugu.</p>
        </Item>
        <Item q="What is a “hit”?">
          <p>Every film gets a <strong>film score out of 100</strong>, made from:</p>
          <ul className="list-disc pl-5">
            <li>{Math.round(w.audience * 100)}% — how audiences rated it (ratings with few votes count less)</li>
            <li>{Math.round(w.commercialPlatform * 100)}% — box-office result in Telugu, or the OTT result for OTT films</li>
            <li>{Math.round(w.evidenceQuality * 100)}% — how solid the evidence is (more and better sources = higher)</li>
            <li>{Math.round(w.legacy * 100)}% — lasting popularity or cult status, when an editor has reviewed it</li>
          </ul>
          <p>A film with a score of <strong>{m.successThreshold} or more is a hit</strong>.</p>
        </Item>
        <Item q="Success ratio, hits and recent success">
          <p><strong>Hits</strong> = number of hit films. <strong>Success ratio</strong> = hits ÷ films that have enough data to judge, as a percentage.</p>
          <p><strong>Recent success</strong> = the same ratio for the latest {m.momentumWindow} films only.</p>
          <p>Films without enough data are left out of the ratio. They are never counted as flops.</p>
        </Item>
        <Item q="Audience rating">
          <p>The simple average of the audience ratings (out of 10) of the hero&apos;s films. These are whole-film ratings from rating sites, not a Telugu-only rating.</p>
        </Item>
        <Item q="Films, most films in a year, gap between films">
          <p><strong>Films</strong> = number of counted films. <strong>Most films in one year</strong> = the busiest calendar year.</p>
          <p><strong>Average gap between films</strong> = the typical number of months between one release and the next. Shorter means he releases more often.</p>
        </Item>
        <Item q="Dubbed and OTT films">
          <p>For a dubbed film we only use box-office numbers reported for the Telugu version. If only the all-languages total is known, the Telugu result is marked “unknown”. It is never guessed.</p>
          <p>For OTT films we use official platform results. If there are none, the result is “unknown”, not zero.</p>
        </Item>
        <Item q="Overall score (out of 100)">
          <p>One combined number for people who want a single ranking:</p>
          <ul className="list-disc pl-5">
            <li>{Math.round(hw.filmSuccess * 100)}% average film score</li>
            <li>{Math.round(hw.audience * 100)}% audience ratings</li>
            <li>{Math.round(hw.consistency * 100)}% consistency (how steady the results are)</li>
            <li>{Math.round(hw.socialReach * 100)}% official social media reach</li>
            <li>{Math.round(hw.momentum * 100)}% recent form</li>
          </ul>
          <p>It is a transparent benchmark with adjustable weights, not an objective truth.</p>
        </Item>
        <Item q="What is the red line in the scatter charts?">
          <p>It is the <strong>best trade-off line</strong> (also called a Pareto line). It joins the heroes nobody else beats on both axes at once. Heroes on the line are the best balance of the two things you chose.</p>
          <p>Use the “Across” and “Up” menus above each chart to change what is compared.</p>
        </Item>
        <Item q="Where does the data come from?">
          <p>Film details: TMDb. Ratings: licensed sources only. IMDb is never scraped. Box office: trade reports reviewed by an editor, with every claim kept. Social media: official profiles only. Critic reviews are not used.</p>
          <p>Hero photos: Wikimedia Commons, under free licences. See photo credits.</p>
        </Item>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/methodology" className="font-semibold text-wine underline">Full methodology</Link>
        <Link href="/annexure/sources" className="text-wine underline">Sources</Link>
        <Link href="/annexure/coverage" className="text-wine underline">Missing data</Link>
        <Link href="/annexure/photo-credits" className="text-wine underline">Photo credits</Link>
        <Link href="/annexure/corrections" className="text-wine underline">Suggest a correction</Link>
      </div>
    </section>
  );
}
