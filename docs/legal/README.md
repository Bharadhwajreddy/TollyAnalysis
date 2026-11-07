# Legal and data compliance register

*Last reviewed 7 November 2026. This is a working checklist, not legal advice: have a lawyer review it before any public launch or any way of earning money from the site.*

## Decisions only the owner can make

| # | Decision | Why it matters | Recommended |
|---|---|---|---|
| 1 | **Internal tool or public website?** | The GitHub repository is **public** and the site is deployed publicly. "Internal use" is the safest reading of every licence below, but right now anyone can read the code and the site. | If internal: make the repository private (GitHub → Settings → General → Danger zone → Change visibility) and turn on Vercel Deployment Protection (Vercel → Project → Settings → Deployment Protection) so only invited people can open the site. |
| 2 | **Will the site ever earn money?** (ads, subscriptions, paid reports) | IMDb, TMDB, OMDb, MovieLens and Last.fm all forbid commercial use. | Stay non-commercial, or before earning: buy an IMDb licence, sign a TMDB agreement, drop MovieLens/OMDb, and move the Rating pillar to ratings collected on this site. |
| 3 | **A contact address** | India's DPDP Act expects a way to reach whoever runs the site for privacy requests and grievances. Today that is the corrections form. | Add a dedicated contact email to /privacy and /terms. |
| 4 | **Collection through your own accounts** (Claude desktop app: Instagram, Letterboxd) | Both platforms' terms forbid automated collection; the risk is a restriction on your accounts. | Keep it slow, read-only and small (71 profiles, 88 films). Keep Letterboxd numbers private (they never enter the repository). |

## What is already in place

| Item | Where |
|---|---|
| Terms of use: non-commercial, scores are opinions, no affiliation, no warranty, quoting allowed, bulk copying not allowed, removal requests within 7 days | `/terms` |
| Privacy policy: what is collected (corrections, optional email, anonymous vote cookie, host logs), why, retention, DPDP rights | `/privacy` |
| A correction's email is deleted automatically once it is approved or rejected | `lib/repositories/corrections*.ts`, tested in `tests/unit/corrections-privacy.test.ts` |
| Required attributions: IMDb's exact statement, TMDB's notice, Wikipedia CC BY-SA, Wikidata CC0, on every page | site footer |
| Full source and licence table, with each source's obligations | `/annexure/sources`, from `lib/legal/data-licences.ts` |
| Per-photo author and licence | `/annexure/photo-credits` |
| Raw IMDb, TMDB and Letterboxd numbers never committed or shown; only derived scores are | `.gitignore` (`.cache/`, `data-private/`, snapshots), `scripts/tolly/compute.mts` |
| Corrections and removal route for anyone featured | `/annexure/corrections` |

## Source by source

| Source | Licence | Risk | Status / action |
|---|---|---|---|
| Wikipedia | CC BY-SA 4.0 | Low. Facts are free; quoted sentences (e.g. verdict evidence) must stay credited and under CC BY-SA. | Credited in footer and on the ledger; each verdict links its article. |
| Wikidata, Wikimedia page views | CC0 | None. | Credited as good practice. |
| Wikimedia Commons photos | Per-photo free licences | Low. | Credits page lists author and licence for every photo. |
| **IMDb non-commercial datasets** | Personal, non-commercial use only. The data "must not be altered/republished/resold/repurposed to create any kind of online/offline database of movie information". Attribution statement required. | **Medium while the site is public.** The terms do not mention derived scores; publishing an index built on IMDb ratings is a grey area. | Attribution shown; raw numbers never published; no commercial use. Lowest risk: keep the site internal (decision 1), or license IMDb, or replace with on-site ratings. |
| TMDB API | Non-commercial; logo and notice required; cache at most 6 months | Low. Not shown on the site (cross-check only). | Notice shown. **To do:** add TMDB's logo next to the notice (from themoviedb.org/about/logos-attribution), and delete or refresh TMDB data and snapshot archives older than 6 months. |
| OMDb | CC BY-NC; no commercial use, indexes or derivatives | Low (not used in any score). | Can be dropped entirely. |
| MovieLens 32M | Research, non-commercial | Low (cross-check only). | Cite Harper & Konstan (2015) wherever the cross-check is published (done in the source ledger). |
| Official social-media follower counts | Public facts; collection is governed by each platform's terms | Low for the numbers; account risk for how they are collected (decision 4). | Only dated counts from verified profiles; no posts, photos or personal data stored. |
| Letterboxd (if collected) | Terms forbid exporting and indexing its content | Medium if published. | Kept in `data-private/` and the private cache; used only to fill the films IMDb cannot rate; never shown. |
| Press articles | Facts reported by the publisher | Low. | Named, linked and dated. |

## People featured on the site

- Heroes are public figures, and every fact comes from a public, linked source. Scores are labelled as opinions from a published method, and the reasons behind each one are shown. This limits defamation risk.
- Personal data in profiles (birth date, family members in films, awards) comes from Wikidata. Anyone featured can ask for correction or removal through the corrections form, and the terms commit to answering within 7 days.
- Visitors: the only personal data collected is an optional email on a correction, deleted when the correction is closed; votes use an anonymous random cookie.

## Before a commercial or wide public launch

1. Lawyer review of this register, the terms and the privacy policy.
2. IMDb commercial licence (imdb-licensing@imdb.com) or replace IMDb ratings.
3. TMDB commercial agreement (sales@themoviedb.org), or stop using TMDB.
4. Remove OMDb, MovieLens and any Letterboxd-derived inputs.
5. A legal entity and contact address on the site.
6. Re-check every source's current terms (they change; see the dates above).
