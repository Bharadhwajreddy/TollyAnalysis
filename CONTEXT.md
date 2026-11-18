# Tollywood Analysis

Tollywood Analysis is a public, evidence-backed benchmarking context for Telugu-cinema lead actors, evaluating career performance, film outcomes, release cadence, and multi-source evidence from 1 January 2000 onward.

## Language

### Core Roster & Filmography

**Hero**:
A verified principal or co-principal male lead actor in Telugu feature cinema included in the benchmarked roster.
_Avoid_: Star, actor, celebrity, protagonist

**Eligible Film**:
A theatrical or direct-to-OTT feature film released on or after 1 January 2000 in original Telugu or an identifiable Telugu dub where the Hero holds a principal or co-principal lead role.
_Avoid_: Movie, project, appearance, title

**Excluded Appearance**:
A credited screen presence that does not qualify for benchmarking, including cameos, supporting roles, special appearances, voice-only credits, re-releases, anthologies, or short films.
_Avoid_: Non-film, minor role, guest role

**Film Family**:
A recognized multi-generational Telugu cinema lineage (such as Mega, Nandamuri, Akkineni, Daggubati, Ghattamaneni, or Manchu) used to group Heroes for comparative visual analysis.
_Avoid_: Clan, dynasty, camp

**Debut Era**:
The historical period in which a Hero first appeared as a principal lead, used to segment peer cohorts across decades.
_Avoid_: Generation, batch, age group

### Scoring & Evidence

**Star Score**:
The primary composite benchmark ranking a Hero across commercial reach, hit consistency, audience reception, and career volume.
_Avoid_: Popularity score, rank points, power rating

**Hero Performance Index**:
A versioned weighted composite metric combining Film Success Score (35%), Audience score (25%), Consistency (15%), Verified Public Social Reach (15%), and Momentum (10%).
_Avoid_: Overall rating, fame score

**Film Success Score**:
A film-level composite benchmark combining Audience reception (35%), Commercial/Platform outcome (35%), Evidence Quality (20%), and Legacy (10%), with missing component weights redistributed proportionally.
_Avoid_: Box office score, hit score

**Box-Office Verdict**:
The sourced commercial outcome classification of an Eligible Film (such as Blockbuster, Hit, Average, or Flop) derived from cited trade or encyclopedic evidence.
_Avoid_: Result, grade, status

**Bundled Snapshot**:
The self-contained, pre-verified dataset of Wikipedia and Wikidata evidence packaged directly with the publication release so the benchmark operates without external runtime database dependencies.
_Avoid_: Static cache, mock data, offline dump

**Annexure**:
The public evidentiary ledger accompanying the dashboard that exposes film-level source claims, methodology formulas, photo licenses, coverage gaps, and the public correction workflow.
_Avoid_: Appendix, footnotes, admin panel

**Correction Submission**:
A structured public challenge proposing an evidence-backed amendment to a Hero's billing classification, box-office figure, or film eligibility.
_Avoid_: Bug report, feedback, comment

## Relationships

- A **Hero** belongs to one **Debut Era** and optionally one **Film Family**
- A **Hero** leads zero or more **Eligible Films** and may have zero or more **Excluded Appearances**
- A multi-lead **Eligible Film** counts independently for each qualifying **Hero**
- Each **Eligible Film** produces one **Film Success Score** and carries at most one consensus **Box-Office Verdict**
- A **Hero**'s **Star Score** and **Hero Performance Index** aggregate across their **Eligible Films** (requiring at least 5 judged films for ratio leaderboards)
- The **Bundled Snapshot** supplies the complete read model for the dashboard and **Annexure**
- A **Correction Submission** targets a specific claim inside the **Annexure** for editorial review

## Example dialogue

> **Dev:** "If a **Hero** has an all-India pan-Indian release, do we credit the all-language worldwide gross to their **Film Success Score** in the **Bundled Snapshot**?"
> **Domain expert:** "Only if it is an original Telugu **Eligible Film**. For a dubbed title, all-language gross is never credited to the Telugu version—it remains unknown in the **Annexure** unless Telugu-specific evidence exists. And remember, cameo appearances are **Excluded Appearances** so they never move the **Star Score**."

## Flagged ambiguities

- "Host on Cloudflare" was used to refer to both domain registrar/DNS and application runtime — resolved: the user confirmed both DNS (`tollyanalysis.com`) and the application runtime itself will be hosted directly on Cloudflare Workers via OpenNext rather than delegating compute to Vercel.
- "Data mode" could mean synthetic demo data, the bundled Wikipedia/Wikidata snapshot, or a live external Postgres database — resolved: production at `tollyanalysis.com` uses the **Bundled Snapshot** (`real` data mode) with zero external database dependency.
- "Private beta" (`noindex, nofollow`) vs public launch — resolved: `tollyanalysis.com` is a public production publication and search-engine indexing restrictions are removed.
