import type { ReactNode } from "react";
import { LEGACY_SCORE, PLATFORM_BAND_SCORE, TRADE_VERDICT_SCORE, type MethodologyVersion } from "@/lib/constants/methodology";
import { METRICS } from "@/lib/constants/metrics";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <pre className="scroll-x rounded-lg border border-line bg-surface-2 p-3 font-mono text-[12.5px] leading-relaxed text-ink">{children}</pre>
  );
}

function WeightTable({ rows }: { rows: [string, number][] }) {
  return (
    <table className="w-full max-w-md text-[13px]">
      <tbody>
        {rows.map(([k, w]) => (
          <tr key={k} className="border-b border-line last:border-0">
            <td className="py-1.5 text-ink-2">{k}</td>
            <td className="py-1.5 text-right">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 rounded-full bg-wine" style={{ width: `${w * 160}px` }} aria-hidden />
                <span className="tabular w-10 font-semibold text-ink">{Math.round(w * 100)}%</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MethodologyContent({ m }: { m: MethodologyVersion }) {
  const fw = m.filmScoreWeights;
  const hw = m.heroScoreWeights;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-[13px]">
        <span>
          <span className="text-muted">Active version </span>
          <span className="font-semibold text-ink">{m.versionName}</span>
        </span>
        <span>
          <span className="text-muted">ID </span>
          <code className="font-mono text-xs">{m.id}</code>
        </span>
        <span>
          <span className="text-muted">Effective from </span>
          <span className="font-medium">{m.effectiveFrom}</span>
        </span>
        <span className="text-muted">{m.notes}</span>
      </div>

      <Section id="scope" title="Scope and eligibility">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            A person counts as a <strong>Hero</strong> only for films where they are a verified <strong>principal</strong> or genuine{" "}
            <strong>co-principal male lead</strong>. Lead status is an editorially approved credit, never inferred from cast order.
          </li>
          <li>A genuine multi-hero film counts once for every verified principal lead.</li>
          <li>
            Excluded credits: supporting roles, cameos, guest/special appearances, song-only, narration/voice-only, and re-release
            screenings.
          </li>
          <li>
            Eligible titles: feature-length films from 1 January 2000, originally released in Telugu <em>or</em> with an identifiable
            Telugu-dubbed release. Theatrical and full-length direct-to-OTT features are both included.
          </li>
          <li>Excluded formats: web/TV series, YouTube films, short films, anthology segments, music videos, promotional sketches.</li>
          <li>
            The default roster shows heroes with at least {m.minEligibleFilmsForDefaultRoster} verified eligible lead films.{" "}
            <em>Include emerging heroes</em> reveals those with 1–2.
          </li>
        </ul>
      </Section>

      <Section id="telugu-version" title="Telugu-version rule for dubbed titles">
        <p>
          For a dubbed title, the all-language worldwide gross is never assigned to the Telugu version. Telugu-version collections are
          used only when a source reports them separately; otherwise Telugu commercial evidence is <strong>unknown</strong>.
        </p>
        <p>
          IMDb/TMDb ratings are stored as <strong>film-wide</strong> reception evidence and are never labelled as a
          Telugu-audience-only rating.
        </p>
      </Section>

      <Section id="film-score" title="Film Success Score">
        <Formula>
          {`Film Success Score =
  ${fw.audience.toFixed(2)} × Audience Reception Score
+ ${fw.commercialPlatform.toFixed(2)} × Commercial / Platform Performance Score
+ ${fw.evidenceQuality.toFixed(2)} × Evidence Quality Score
+ ${fw.legacy.toFixed(2)} × Legacy / Cultural Impact Score`}
        </Formula>
        <p>
          Missing components are <strong>never</strong> converted to zero. Their weight is redistributed across available components
          and the film&apos;s evidence coverage drops. Each film carries a scoring status:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>scored</strong> — audience and commercial/platform evidence both available.</li>
          <li><strong>provisional</strong> — only one of them available.</li>
          <li><strong>insufficient_evidence</strong> — neither available; no score is calculated.</li>
          <li>
            <strong>not_yet_final</strong> — released within {m.recentReleaseDays} days; excluded from ratios until the run is
            reconciled.
          </li>
        </ul>
        <p>
          A film succeeds when its score is at least <strong>{m.successThreshold}</strong>.
        </p>
      </Section>

      <Section id="audience" title="Audience Reception Score">
        <p>Source priority: licensed/permitted IMDb rating + votes → TMDb vote average + count → authorised editorial source.</p>
        <Formula>{`Adjusted rating = (v / (v + m)) × R + (m / (v + m)) × C

R = film rating, v = vote count
C = vote-weighted baseline rating of the title universe (fallback ${m.baselineRatingFallback})
m = minimum-vote threshold = ${m.voteThresholdM.toLocaleString("en-IN")}`}</Formula>
        <p>
          The adjusted rating is mapped linearly from {m.ratingIndexFloor}–{m.ratingIndexCeiling} onto 0–100 only after raw rating,
          vote count, source and retrieval date are stored. The hero-level Audience Reception Index is the average of film scores
          weighted by vote confidence v/(v+m).
        </p>
      </Section>

      <Section id="commercial" title="Commercial / Platform Performance Score">
        <p>Theatrical titles, in order of preference:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Recovery ratio</strong> = Telugu distributor share ÷ Telugu theatrical business, both in the same version scope and
            currency (money handled as integer minor units). 1.0× recovery = 60; 2.0× = 95; 0.3× = 10.
          </li>
          <li>
            <strong>Release-time trade verdict</strong> (stored separately from the calculated score):{" "}
            {Object.entries(TRADE_VERDICT_SCORE)
              .map(([k, v]) => `${k.replace("_", " ")} ${v}`)
              .join(" · ")}
            .
          </li>
        </ol>
        <p>
          <strong>Disputes:</strong> when approved claims for the same metric differ by more than 15%, the film is flagged disputed, the
          conservative (lowest) value is used and confidence drops to low. All claims are kept in the Annexure.
        </p>
        <p>
          <strong>OTT titles:</strong> Platform Performance replaces theatrical outcome only when credible official platform evidence
          exists (official releases, top-10 lists, disclosed views/hours). Editorial bands:{" "}
          {Object.entries(PLATFORM_BAND_SCORE)
            .map(([k, v]) => `${k} ${v}`)
            .join(" · ")}
          . Without evidence, platform outcome is <strong>unknown</strong> — not zero.
        </p>
      </Section>

      <Section id="evidence-legacy" title="Evidence quality and legacy">
        <p>
          <strong>Evidence Quality Score</strong> (0–100): up to 40 for confident audience evidence, up to 40 for commercial/platform
          evidence by confidence (high 40, medium 28, low 15, disputed 5), plus 20 when two or more independent sources corroborate.
        </p>
        <p>
          <strong>Legacy / cultural impact</strong> is editorially reviewed and source-backed — never auto-generated from social
          chatter. Values:{" "}
          {Object.entries(LEGACY_SCORE)
            .map(([k, v]) => `${k.replace("_", " ")} ${v ?? "unavailable"}`)
            .join(" · ")}
          . A theatrical underperformer that is later reappraised keeps both records; one never overwrites the other.
        </p>
      </Section>

      <Section id="hero-index" title="Hero Performance Index">
        <WeightTable
          rows={[
            ["Film Success Index", hw.filmSuccess],
            ["Audience Reception Index", hw.audience],
            ["Consistency Index", hw.consistency],
            ["Verified Public Social Reach Index", hw.socialReach],
            ["Recent Career Momentum", hw.momentum],
          ]}
        />
        <p>
          The HPI is a transparent, configurable benchmark — not objective fact. It is withheld when Film Success or Audience indices
          are unavailable; other missing components have their weight redistributed and the result is marked as a smaller sample.
        </p>
      </Section>

      <Section id="kpis" title="Hero KPIs">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {Object.values(METRICS).map((mm) => (
            <div key={mm.key}>
              <dt className="font-semibold text-ink">
                {mm.label} <span className="text-xs font-normal text-muted">({mm.higherIsBetter ? "higher is better" : "lower is better"})</span>
              </dt>
              <dd className="text-[13px]">{mm.definition}</dd>
            </div>
          ))}
        </dl>
        <Formula>{`Consistency = 100 − min(100, stdev(Film Success Scores) / ${m.consistencyMaxStdDev} × 100)   [needs ${m.consistencyMinFilms}+ scored films]
Momentum    = 50 + (recency-weighted mean of last ${m.momentumWindow} scores − career mean) / ${m.momentumDeltaRange} × 50
Social      = (log10(sum of official followers, latest per platform) − ${m.socialLog10Floor}) / ${m.socialLog10Ceiling - m.socialLog10Floor} × 100
Films/yr    = eligible films ÷ (last year − first year + 1)`}</Formula>
        <p>
          Confidence grade: <strong>high</strong> with 8+ films and 75%+ evidence coverage, <strong>medium</strong> with 5+ and 50%+,{" "}
          <strong>low</strong> otherwise when any evidence exists.
        </p>
      </Section>

      <Section id="exclusions" title="What is deliberately not used in v1">
        <ul className="list-disc space-y-1 pl-5">
          <li>Critic reviews and critic-score aggregation (the data model leaves room for a later module).</li>
          <li>Scraped IMDb pages or any unlicensed scraping. IMDb integration stays disabled until a permitted source exists.</li>
          <li>BookMyShow ratings (no public official API; optional later only under a valid licence).</li>
          <li>“Fan counts”. Social reach is official-profile public followers with a snapshot date.</li>
        </ul>
      </Section>
    </div>
  );
}
