# ───────────────────────────── KPI Guide ─────────────────────────────
kg = wb.create_sheet("KPI Guide")
kcols = [("#", 4), ("KPI", 26), ("Level", 7), ("Where in this workbook", 22), ("Role in the Tolly Index", 18), ("What it means", 46),
         ("Primary source", 30), ("Fallback sources (in order)", 36), ("How you can look it up yourself", 52), ("Have it", 16)]
header(kg, [c[0] for c in kcols], [fill_in] * len(kcols))
widths(kg, [c[1] for c in kcols])
M = "Movies"


def cov(col, sheet="Movies", last=LF, kind="COUNTA"):
    return f'={kind}({sheet}!${col}$2:${col}${last})&" of "&COUNTA({sheet}!$A$2:$A${last})'


kpis = [
    ("Film ID", "Film", "Movies A", "Key", "Unique key for the film (Wikipedia article title, or 'unlinked:Title|Year' when the filmography row has no article).", "Hero's Wikipedia filmography", "—", "—", cov("A")),
    ("Title", "Film", "Movies B", "Display", "Film title as written in the hero's filmography.", "Hero's Wikipedia filmography", "—", "en.wikipedia.org → '<Hero> filmography'", cov("B")),
    ("Release year (filmography)", "Film", "Movies C", "Era cohort", "Year the filmography lists. Decides which films a film is compared with (year ± 1).", "Hero's Wikipedia filmography", "—", "The year column of the filmography table", cov("C", kind="COUNT")),
    ("Lead hero(s)", "Film", "Movies D", "Hero aggregation", "Our heroes credited as lead (billed in the first two or three names of the starring list).", "Hero's Wikipedia filmography + film infobox 'starring'", "—", "Film article infobox → Starring (first names listed)", cov("D")),
    ("Exact release date", "Film", "Movies E", "Gate (age), only near the 2-year cut-off", "First release date. Needed only when the year alone cannot say whether the film is 2 years old.", "Wikipedia film infobox (Release date)", "Wikidata P577 (publication date)", "Film article infobox → 'Release date'; or wikidata.org/wiki/<Wikidata ID> → 'publication date'", cov("E", kind="COUNT")),
    ("Telugu original?", "Film", "Movies G", "Gate", "Is Telugu the film's original language? Non-Telugu films are excluded from the hero's record.", "Wikipedia film infobox (Language)", "Wikidata P364 (original language); the filmography (Telugu unless the row notes another language)", "Film article infobox → 'Language'", cov("G")),
    ("IMDb ID", "Film", "Movies I", "Gate (identity)", "The film's IMDb title id (tt…). Links the film to its audience rating.", "Wikidata P345 (IMDb ID)", "Hero's IMDb cast list (exact, then close title); only IMDb film with that title and year; only Indian IMDb title that sounds the same", "Search the title on imdb.com, check year and cast; the id is in the URL: imdb.com/title/tt…/", cov("I")),
    ("IMDb rating", "Film", "Movies K", "RATING pillar", "Average audience rating out of 10.", "IMDb non-commercial dataset title.ratings.tsv.gz", "None free. TMDB (needs a key) would be a second source.", "imdb.com/title/<IMDb ID>/ → 'IMDb RATING' (the number next to the star)", cov("K", kind="COUNT")),
    ("IMDb votes", "Film", "Movies L", "RATING (shrinkage, confidence) + REACH pillar", "How many people rated the film. Needs at least 10 for the film to be scored.", "IMDb non-commercial dataset title.ratings.tsv.gz", "—", "imdb.com/title/<IMDb ID>/ → the count under the rating (e.g. '6.1/10 · 311')", cov("L", kind="COUNT")),
    ("Release year on Wikidata", "Film", "Movies M", "Gate (year confirmed)", "Second-source check of the release year (must agree within 1 year).", "Wikidata P577", "—", "wikidata.org/wiki/<Wikidata ID> → 'publication date'", cov("M", kind="COUNT")),
    ("Release year on IMDb", "Film", "Movies N", "Gate (year confirmed)", "Second-source check of the release year (either M or N must agree within 1 year).", "IMDb title.basics (startYear)", "—", "imdb.com/title/<IMDb ID>/ → year under the title", cov("N", kind="COUNT")),
    ("Wikidata ID", "Film", "Movies O", "Linking", "The film's Wikidata item (Q…), used to find dates, language, IMDb id and language editions.", "Wikidata (item linked to the English article)", "Hero's cast list on Wikidata; the IMDb id stored on Wikidata", "wikidata.org → search the title; or the 'Wikidata item' link in the article's sidebar", cov("O")),
    ("English / Telugu Wikipedia article", "Film", "Movies P–Q", "Source of page views", "Article titles whose readers we count.", "Wikipedia / Wikidata sitelinks", "—", "en.wikipedia.org and te.wikipedia.org", cov("P")),
    ("Wikipedia language editions", "Film", "Movies R", "REACH pillar (⅓)", "How many Wikipedias (any language) have an article on the film: how far it travelled. 0 when there is none.", "Wikidata sitelinks count", "Count of English + Telugu articles", "Film article → 'Languages' menu (count the languages)", cov("R", kind="COUNT")),
    ("English page views (60 days)", "Film", "Movies S", "STAY pillar", "People who read the English article in the last 60 days. 0 = no article.", "Wikimedia page views (MediaWiki API, prop=pageviews)", "—", "pageviews.wmcloud.org → English Wikipedia, the article, last 60 days, user agent", cov("S", kind="COUNT")),
    ("Telugu page views (60 days)", "Film", "Movies T", "STAY pillar", "Same for the Telugu article.", "Wikimedia page views", "—", "pageviews.wmcloud.org → te.wikipedia, the article", cov("T", kind="COUNT")),
    ("Director, music, runtime, genres", "Film", "Movies U–X", "Context only", "Shown on the site; not used in the index.", "Wikipedia infobox", "IMDb title.basics (runtime, genres)", "Film article infobox", cov("U")),
    ("Budget, worldwide gross", "Film", "Movies Y–Z", "Context only (money is never in the index)", "Reported figures in ₹ crore.", "Wikipedia infobox", "—", "Film article infobox → Budget / Box office", cov("Z")),
    ("Box-office verdict", "Film", "Movies AA–AB", "Context only", "Hit / flop as reported, else gross ÷ budget (≥3× blockbuster, ≥2× hit, ≥1× average).", "Wikipedia film article prose", "Hero article prose; Telugu Wikipedia; trade blog lists", "Film article → 'Box office' section", cov("AA")),
    ("Critics' average", "Film", "Movies AC–AD", "Cross-check only", "Average of critics' scores quoted in the article (/10). Agrees with audience Rating at r = 0.56.", "Wikipedia 'Critical reception' sections", "—", "Film article → 'Critical reception'", cov("AC", kind="COUNT")),
    ("Status", "Film", "Tolly Index Films I", "Calculated (gate)", "Complete / Provisional (under 2 years) / Incomplete (input missing) / Excluded (not Telugu).", "Calculated", "—", "—", f'=COUNTIF({T}!$I$2:$I${LF},"Complete")&" complete"'),
    ("Era cohort (n, m, C)", "Film", "Era Cohorts sheet", "Calculated", "Films released within a year: their count, median votes and mean rating.", "Calculated", "—", "—", "—"),
    ("RATING pillar", "Film", "Tolly Index Films R", "50% of raw", "R′ = v/(v+m)·R + m/(v+m)·C; Rating = (R′−1)/9 × 100. Same scale in every era.", "Calculated", "—", "—", "—"),
    ("REACH pillar", "Film", "Tolly Index Films U", "30% of raw", "⅔ × percentile of votes + ⅓ × percentile of language editions, within the cohort.", "Calculated", "—", "—", "—"),
    ("STAY pillar", "Film", "Tolly Index Films V", "20% of raw", "Percentile of page views (English + Telugu) within the cohort.", "Calculated", "—", "—", "—"),
    ("VOICE pillar", "Film", "Not collected yet", "30% once collected", "Share of positive minus negative social-media posts (lower bound), with anti-brigading rules.", "Reddit, YouTube comments, X (need keys or payment)", "—", "See 'Sources No Access'", "0"),
    ("Confidence c", "Film", "Tolly Index Films X", "Calculated", "min(1, log10(1+votes)/log10(1000)): how much we trust the film's own score.", "Calculated", "—", "—", "—"),
    ("Film Tolly Index", "Film", "Tolly Index Films Z", "Result", "c × raw + (1 − c) × cohort mean raw. 0–100.", "Calculated", "—", "—", f'=COUNT({T}!$Z$2:$Z${LF})&" scored, of which "&COUNTIF({T}!$I$2:$I${LF},"Complete")&" complete"'),
    ("Hero ID, name", "Hero", "Heroes A–B", "Key", "Our 71 Telugu heroes.", "Project roster", "—", "—", cov("A", "Heroes", LH)),
    ("Wikidata ID", "Hero", "Heroes C", "Linking", "Hero's Wikidata item.", "Wikidata", "—", "wikidata.org → search the name", cov("C", "Heroes", LH)),
    ("IMDb person ID", "Hero", "Heroes D", "Linking (reads his IMDb cast list)", "Hero's IMDb name id (nm…).", "Wikidata P345", "—", "imdb.com → search the name; id in the URL imdb.com/name/nm…/", cov("D", "Heroes", LH)),
    ("Birth date, career start", "Hero", "Heroes G–J", "Context only", "Profile facts.", "Wikidata P569 / P2031", "Wikipedia infobox; first film credit", "Hero article infobox", cov("G", "Heroes", LH, "COUNT")),
    ("Free-licence photo", "Hero", "Heroes K", "Context only", "Whether a freely licensed photo exists for the site.", "Wikidata P18 / Wikimedia Commons", "—", "commons.wikimedia.org → search the name", f'=COUNTIF(Heroes!$K$2:$K${LH},"Yes")&" of {NH}"'),
    ("X / Instagram followers", "Hero", "Heroes L–O", "Context only (not in the index)", "Followers measure the person today, not his films.", "Wikidata P8687 (X); one press article (Instagram)", "Official APIs are paid / closed", "The hero's verified profile page", cov("L", "Heroes", LH, "COUNT")),
    ("Lead films, complete, judged", "Hero", "Tolly Index Heroes C–H", "Hero rule", "Judged = Telugu lead films at least 2 years old. Ranked when ≥ 5 complete and ≥ 90% of judged complete.", "Calculated", "—", "—", "—"),
    ("Hero Tolly Index ± band", "Hero", "Tolly Index Heroes O–P (films), AB–AC (final, with fame)", "Result", "(Σ c·Index + 3·M) / (Σ c + 3); band = 1.96 × spread / √(Σ c + 3).", "Calculated", "—", "—", f'=COUNT(\'Tolly Index Heroes\'!$O$2:$O${LH})&" ranked"'),
    ("Pillar profile, best film, spread", "Hero", "Tolly Index Heroes L, R–V", "Explains the result", "His confidence-weighted Rating / Reach / Stay, best film, and how much his films vary.", "Calculated", "—", "—", "—"),
]
for i, k in enumerate(kpis, start=2):
    kg[f"A{i}"] = i - 1
    for j, v in enumerate(k, start=2):
        c = kg.cell(row=i, column=j, value=v)
        c.font = f_body
        c.alignment = wrap
    kg[f"A{i}"].font = f_body
kg.freeze_panes = "C2"

# ───────────────────────────── Sources No Access ─────────────────────────────
na = wb.create_sheet("Sources No Access")
ncols = [("Source", 26), ("Category", 16), ("What it would add", 40), ("Feeds", 18), ("What happened when we tried", 34), ("How to get access", 46), ("Cost", 22), ("Who has to do it", 18)]
header(na, [c[0] for c in ncols], [fill_in] * len(ncols))
widths(na, [c[1] for c in ncols])
rows = [
    ("TMDB (The Movie Database)", "Connected 22 Oct 2026 (cross-check)", "Second audience rating: agrees with IMDb at r = 0.85 on 422 films", "Cross-check", "Has 0–9 votes for the 55 films short of IMDb votes; title search found 3 of 35 unlinked films (none usable)", "Done. Keep the key in the environment, never in the repo; regenerate it since it was shared in chat", "Free, non-commercial only; logo + attribution; cache ≤ 6 months; commercial needs a written agreement", "Done"),
    ("OMDb", "Connected 22 Oct 2026 (cross-check)", "Rotten Tomatoes / Metacritic scores: 35 RT and 2 Metacritic among the 281 most-voted films", "Cross-check", "Its IMDb numbers are stale (Kithakithalu 5.8/228 vs 6.1/311), so not used; title search found none of the 35 unlinked films", "Done. Regenerate the key since it was shared in chat", "Free key, 1,000 requests/day; CC BY-NC; no commercial use, indexes or derivatives without permission", "Done"),
    ("YouTube Data API v3", "Key is free (no billing needed) but our use is restricted", "Trailer views, likes, comment text", "REACH, VOICE", "Policies forbid scores derived from views/likes/comments (incl. sentiment) unless audited and accepted into the derived-metrics programme; stats stored max 30 days; search 100 calls/day", "Skip for the index for now. Only worth it after applying for the audit + derived-metrics amendment", "Free quota", "You (only if you want to apply)"),
    ("Reddit Data API", "Needs Reddit's approval (since Nov 2025)", "Threads and comments in r/tollywood, r/telugu (Voice)", "VOICE", "Responsible Builder Policy: every new app, personal or research, must be approved before any data access; Reddit pages are blocked from this environment", "Apply through Reddit's developer support form as a non-commercial project (draft text provided in chat). Approval can take weeks or be refused", "Free for approved non-commercial use; commercial needs written approval", "You (account owner)"),
    ("Instagram (Graph API: Business Discovery)", "Free; works for the app's own admins without review", "Follower and post counts of heroes' Business/Creator accounts (31 usernames already known)", "Context (hero)", "Needs your Instagram professional account linked to a Facebook Page and a Meta developer app (Business type)", "Steps in chat. A public site showing the numbers likely needs App Review + Business Verification", "Free", "You"),
    ("X (Twitter) API", "Paid", "Posts about each film", "VOICE", "Pay per use", "developer.x.com → project → buy credits", "~$0.005 per post read (~$50 per 10,000 posts)", "You (budget decision)"),
    ("IMDb commercial licence", "Paid", "Right to use IMDb ratings in a commercial product", "RATING, REACH", "Current datasets are personal / non-commercial only", "Licence via IMDb / AWS Data Exchange", "Price on request", "You (before a paid launch)"),
    ("Commercial box-office data (e.g. Ormax, Comscore)", "Paid", "Audited collections, footfalls, ticket prices", "Context (money stays out of the index)", "Not public", "Subscription from the provider", "Commercial", "You"),
    ("Letterboxd", "API by application; refuses data-analysis projects", "Film fans' ratings", "RATING, VOICE", "API page: not granting access for data-analysis, visualization, recommendation, or private/personal projects; website terms forbid scraping", "Not worth applying", "—", "—"),
    ("Wikipedia page-view history (monthly, REST)", "Blocked (rate limit)", "Attention at release vs today ('later ÷ launch')", "STAY", "429 Too Many Requests after one request; bulk dumps are 6.3 GB per month; no data before July 2015", "Run slowly from your own server, or download monthly dumps; still impossible for 2000–2014 films", "Free", "Engineering"),
    ("Rotten Tomatoes, Metacritic", "Not allowed", "Critic and audience scores (few Telugu films covered)", "Cross-check", "Pages load, but terms forbid automated collection", "Only through a licensed partner feed", "Commercial", "—"),
    ("Box Office Mojo, Sacnilk, trade blogs", "Not allowed", "Collections", "Context", "Terms forbid automated collection / no reuse permission", "Licence or manual entry with citation", "—", "—"),
    ("BookMyShow", "Not allowed", "Audience ratings and 'interested' counts for recent films", "RATING (recent films)", "Terms forbid automated collection", "Partnership with BookMyShow", "Commercial", "—"),
    ("IMDb website (reviews pages)", "Not allowed", "User review text and counts", "VOICE", "Website terms forbid scraping (datasets are fine)", "IMDb licence", "Commercial", "—"),
    ("123telugu, Great Andhra, Gulte, Idlebrain", "Not allowed", "Telugu critics' reviews and ratings", "Cross-check", "No reuse permission", "Ask each site for permission or a feed", "Unknown", "You"),
    ("Wikidata review scores (P444)", "Too thin", "Rotten Tomatoes / Metacritic scores stored on Wikidata", "Cross-check", "Only 8 of our films have one", "—", "Free", "—"),
    ("MovieLens 32M", "Too thin (cross-check only)", "Research ratings", "Cross-check", "207 of our films, 60 with 10+ ratings; none of the missing ones", "Already used as a cross-check (r = 0.69 with IMDb)", "Free (research, non-commercial)", "—"),
    ("This site's own visitor ratings", "Free route (recommended)", "Ratings and short reviews for every film, including the 88 incomplete ones", "RATING, VOICE", "Not built yet: the site has a flagged-off user ranking feature to start from", "Turn on visitor ratings with anti-brigading rules and a privacy policy", "Free; fully ours, commercial use allowed", "Engineering (me)"),
    ("Threads (keyword search API)", "Free, needs permission approval", "Public posts naming a film (no like counts)", "VOICE", "Needs threads_keyword_search approved by Meta; 2,200 queries/day", "Apply in the same Meta developer app (steps in chat)", "Free", "You"),
    ("Facebook Pages (Page Public Metadata Access)", "Free, needs App Review", "Likes/followers of film and hero Pages", "Context", "Feature needs App Review for public use", "Apply only if Instagram works out", "Free", "You"),
    ("Meta Content Library", "Free, academic/non-profit only", "Research access to public posts", "VOICE", "Requires a non-profit research institution", "Not available to us", "Free", "—"),
    ("Bluesky (public search)", "Free, no key; tested", "Public posts naming a film", "VOICE", "Tested on 1,194 films: 119 with 10+ toned posts; agrees with IMDb at r = 0.14; noisy for short titles", "Not used; re-test in a year", "Free", "—"),
    ("Trakt / Simkl", "Free key after registering an app", "Small rating counts linked by IMDb id", "Cross-check", "Terms pages did not load here; likely thin like TMDB", "Low priority", "Free", "You (optional)"),
    ("GDELT (news)", "Free, commercial use allowed with citation", "News article counts and tone", "Context", "Only the last 3 months; rate-limited this environment", "Useful for new releases only", "Free", "—"),
    ("Google Trends API", "Alpha, by invitation", "Search interest by region, 5 years", "REACH", "Apply for the alpha", "Optional application", "Not stated", "You (optional)"),
    ("Last.fm API", "Free key, non-commercial", "Song listener counts (soundtracks)", "Context", "Non-commercial only", "Optional", "Free", "You (optional)"),
    ("Spotify Web API", "Needs Premium", "—", "—", "Popularity removed Feb 2026; policy forbids derived metrics", "Not usable", "—", "—"),
    ("YouTube channel feeds (no key)", "Too thin", "Latest uploads of a channel", "REACH", "Only the 15 latest videos per channel, no old trailers", "Use the YouTube Data API with a key instead", "Free", "—"),
]
for i, rrow in enumerate(rows, start=2):
    for j, v in enumerate(rrow, start=1):
        c = na.cell(row=i, column=j, value=v)
        c.font = f_body
        c.alignment = wrap
na.freeze_panes = "B2"
