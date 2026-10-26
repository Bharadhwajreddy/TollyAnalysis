# Getting all the data for the Tolly Index: paths and costs

*Measured 26 October 2026 by rebuilding every input from scratch in a fresh machine.*

## The short answer

**Yes.** Everything the index uses today can be downloaded once and kept, and the index can then be recomputed with no internet and no API. It takes about an hour, costs nothing, and the kept copy is small (the raw downloads are about 280 MB, the archive 9.8 MB).

Three things do not change by downloading:

1. **The licences.** A downloaded copy of IMDb or TMDB data is still for personal, non-commercial use only. TMDB data may be kept for at most 6 months.
2. **Freshness.** A frozen copy never gets new films, new votes or new readers. Ratings move slowly, but "Do people still care?" (page views) is about *now*, so it should be refreshed every month or two.
3. **The gaps.** The 88 incomplete films are missing because no public source has the data: 55 have fewer than 10 ratings anywhere public, and 33 have no IMDb entry at all. No download can fix that; only new ratings (or an editor finding a film filed under another title) can.

## What the index needs, and where it comes from

| Input | Source | Licence | Download size | Refresh |
|---|---|---|---|---|
| Hero filmographies, film facts | English and Telugu Wikipedia | CC BY-SA, commercial use allowed | ~50 MB of pages | Monthly |
| Release dates, language, links, language editions | Wikidata | CC0, any use | small (query results) | Monthly |
| Audience rating and votes | IMDb datasets | Personal / non-commercial | 1.7 GB of files streamed; ~1 MB kept for our films | Monthly (IMDb updates daily) |
| Readers in the last 60 days | Wikipedia page views | CC0, any use | small (API) | Monthly |
| Cross-check rating | TMDB | Non-commercial; keep ≤ 6 months | small (API) | Every 6 months |

## Path A: download once, compute offline (what we have now)

**How:** `npm run tolly:all` downloads everything; `npm run tolly:snapshot` packs it into one archive; later, on any computer, `npm run tolly:restore -- <archive>` and `npm run tolly:compute` rebuild every score with no internet.

**Measured time:** 56 minutes on a fresh machine, all free:

| Step | Time |
|---|---|
| Install tools | 20 s |
| Wikipedia pages (1,638 film and hero articles) | 4 min |
| IMDb files (ratings, titles; cast and alternate titles streamed) | 9 min |
| Wikidata | 47 s |
| Linking films across sources | 1 min |
| Wikipedia page views (rate-limited by Wikimedia, so it waits) | 38 min |
| TMDB cross-check | 2.5 min |
| Compute every score | 2 s |

Tested: deleting every download, restoring the 9.8 MB archive and recomputing gave byte-for-byte the same scores, with no internet.

**Cost:** ₹0. Any laptop works; 1 GB of free disk is plenty.

**How much a refresh changes:** rebuilding with data 11 days newer moved films by 0.4 points on average (no film changed status), heroes by 0.2 points; the top 11 heroes kept their places, and 23 heroes in the crowded middle moved 1–3 places, inside their ± ranges. Monthly is often enough.

**Catch:** this cloud workspace is wiped when idle (it happened between 22 and 26 October), so the archive must live somewhere permanent: your own computer or Google Drive. It contains IMDb numbers, so never put it in the public repository.

## Path B: Path A plus a free automatic monthly refresh

**How:** a scheduled GitHub Actions job runs the same steps on the 1st of every month, keeps the archive, and commits only the derived scores.

**Cost:** ₹0. Public repositories get unlimited Actions minutes; private ones get 2,000 minutes a month, and one run takes about an hour. The TMDB key goes in the repository's secrets.

**Catch:** GitHub keeps run artifacts for at most 90 days and 500 MB on the free private plan, so the monthly archive should also be copied to your drive.

## Path C: a full offline mirror (no API, ever)

Download the complete public dumps instead of asking APIs:

| Dump | Size (compressed) |
|---|---|
| Wikidata, all entities | 149 GB |
| English Wikipedia, all articles | 24.6 GB |
| Telugu Wikipedia, all articles | 254 MB |
| Wikipedia page views, one month | 6 GB (12 GB for our 60-day window) |
| IMDb, all files | 1.9 GB |
| **Total** | **≈ 190 GB to download, about 1 TB of disk to unpack and process** |

**Cost:** data ₹0; needs a 1 TB disk and a day of processing per refresh. **Not recommended:** the APIs we use are free and fast, and this mirror holds 99.9% data we never use. It only makes sense if every API disappeared.

## Path D: fill the 88 films no public source has

| Option | Cost | Time | Fills |
|---|---|---|---|
| **Ratings from this site's visitors** (one rating per account, anti-brigading rules) | ₹0 on a free database (Neon free plan: 1 GB) | ~1 week to build; months to collect votes | All films, old and new; also usable commercially |
| **A Google Form survey** shared with Telugu film fans | ₹0 | 2–4 weeks | Films people remember; small, self-selected sample |
| **An editor checking the 35 films with no IMDb link** | ₹0 (2–4 hours of someone's time) | days | Only films that do exist on IMDb under another title |

## Path E: the "Voice" pillar (what people say)

| Option | Cost | Status |
|---|---|---|
| Threads keyword search | ₹0 | Needs Meta to approve `threads_keyword_search` |
| Reddit API | ₹0 | Needs Reddit's approval (weeks; may be refused) |
| Reddit archive torrents (Pushshift / Arctic Shift dumps) | ₹0 | Downloadable today, but Reddit's terms do not clearly allow it: research only, never on a public site |
| YouTube Data API | ₹0 | Free key, but scores built from YouTube data need YouTube's audit and approval |
| X (Twitter) API | $0.005 per post | 500 posts × 150 recent films = 75,000 posts ≈ **$375 (≈ ₹31,500) once**, then ≈ $50 (≈ ₹4,200) a month for ~20 new films. All 1,194 films at 200 posts each ≈ $1,200 (≈ ₹1 lakh); old films have few posts anyway. |
| Bluesky | ₹0 | Tested: too thin and noisy (agrees with IMDb at r = 0.14) |

## Path F: if the site will earn money

Every free rating source we use (IMDb, TMDB, OMDb, MovieLens) forbids commercial use, and downloading does not change that.

| Option | Cost |
|---|---|
| IMDb commercial licence (through AWS Data Exchange) | Custom quote from imdb-licensing@imdb.com. The only public IMDb price found is $150,000 a year for a different IMDb product, so expect enterprise-level pricing. |
| TMDB commercial agreement | Quote from sales@themoviedb.org |
| **Switch the Rating pillar to this site's own visitor ratings over time**, keep Wikipedia/Wikidata (free for commercial use) | ₹0 plus the build in Path D |

## Summary of costs

| Path | Money | Your time | Gets you |
|---|---|---|---|
| A. Snapshot | ₹0 | none | Today's index, recomputable offline forever |
| B. A + monthly refresh | ₹0 | add one secret | An index that stays current |
| C. Full mirror | ₹0 data + a 1 TB disk | high | Independence from APIs (not needed) |
| D. Visitor ratings | ₹0 | promote the site | The 88 missing films; a commercial-safe rating |
| E. Voice via Threads/Reddit | ₹0 | two applications | Social sentiment, if approved |
| E. Voice via X | ≈ ₹31,500 once + ≈ ₹4,200/month | budget decision | Social sentiment for recent films |
| F. Commercial licences | enterprise pricing | negotiation | Right to earn money with IMDb data |

Dollar figures converted at about ₹84 per US dollar.

**Recommended:** A now, B next (free), D (visitor ratings) as the long-term fix for both the gaps and commercial use, and apply for Threads and Reddit in parallel. Spend on X only if Voice is needed before those approvals arrive.
