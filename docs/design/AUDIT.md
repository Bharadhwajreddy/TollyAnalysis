# Tollywood Analysis: UX/UI audit and redesign brief

Audited against the production build at `localhost:3100` (data as of 25 Nov 2026), at 1440×900 and 390×844, light and dark colour schemes, with Artificial Analysis (AA) as the reference. Screenshots are in `(screenshots not kept)`.

---

## 0. TL;DR

The site has good raw material: about 2,800 films with dates, directors, verdicts, budgets and grosses, a 56-hero composite index, 27 years of release counts, and careful sourcing. It is presented as a pile of unrelated widgets. The main problems:

1. **Three competing "who is No. 1" answers.** The Tolly Index puts Allu Arjun first (56 heroes). The Star Score puts Jr NTR first (89 heroes). Rankings uses the Star Score again, with industry colours. The hero page shows both ("#4 of 56", "#5 of 88"). Hero counts on different pages are 56, 88, 89 and 91. Film counts are "1,467 scored", "1688 eligible · 0 scored · 1257 provisional" and "3,364 releases".
2. **The film, the one thing that connects every dataset, has no identity.** There are no film pages, film titles are plain text everywhere, tracked heroes in the release lists are not linked, and film marks on charts cannot be clicked. Every hero score, director hit rate and yearly count is a roll-up of films, yet you can never reach a film. That is the "breadcrumbs" feeling.
3. **Colour means nothing and everything at once.** `#2a78d6` stands for "debut before 2000", for the "Akkineni family" and for the "Box office" pillar. Orange stands for "debut 2000–2007", "Ghattamaneni family" and "Total box office". Leaderboards are coloured by debut era or industry, so a ranking reads as a rainbow. The Star Score breakdown uses nine hues for nine bars.
4. **Template layout.** Every block is a white rounded card with a mono uppercase kicker, a Playfair title and a muted subtitle (`.section-kicker` plus `.card` in `app/globals.css`). Below that sit pill chips, four equal stat tiles, a "Go deeper" card grid with icons in circles, and a gradient "cinema" banner. This is the AI-site starter kit.
5. **Broken or unfinished pieces.** Sections are invisible or half-transparent at rest because of a scroll-linked reveal (measured below). There is no dark mode. Several cards are half-width and leave holes beside them. Film-table rows are 200 px tall and empty. Trends and Compare default to Fahadh Faasil, a Malayalam actor. Trends axes show 3 ticks. There is a default Next 404. A 3.3 s clapperboard intro plays on first visit. The mobile nav hides half its items with no affordance.

The redesign direction I propose is **"The Ledger"**: a film-first, time-anchored system in which every film is the same mark on the same 2000–2026 spine, everywhere. Heroes, directors and years are lenses on that one set of marks, joined by a shared focus state that cross-highlights between views. One headline score. A monochrome chart grammar where colour is reserved for film outcome and for "you are here".

---

## 1. Diagnosis

### 1.1 Global and systemic

| # | Problem | Evidence | Responsible |
|---|---|---|---|
| G1 | **Scroll-linked reveal leaves content invisible.** `.reveal` uses `animation-timeline: view()` with `animation-range: entry 0% entry 45%`, so a section's opacity is tied to scroll position. It is not a one-off entrance. | Measured at 1440×900 right after load on `/`: "The top 10" card **opacity 0.457**, "Top films" **0.563** (both above the fold), every section below **0**. At 390 wide all seven sections are at 0. Jumping to `/#duel` leaves "Pick a hero" at opacity 0 although it is on screen (top = 848 px). Full-page screenshots, print and any non-scrolling capture (OG crawlers, PDF) show blank cards. Tall sections (Top 10 is 946 px) only become fully opaque after about 425 px of scrolling. `.fill-x` bars (Most followed) have the same problem. | `app/globals.css` lines 491–510, `className="reveal"` throughout `app/page.tsx` |
| G2 | **Two headline scores, three ranking pages.** Tolly Index (`/tolly-index`, home) and Star Score (`/star-score`, `/rankings`, `/heroes` sorting, Compare) disagree on No. 1 and on the hero universe. | Home podium: Allu Arjun 75.5. Star Score banner: Jr NTR 82.5. Heroes grid sorted by Star Score. Hero header shows both. | `app/page.tsx`, `components/dashboard/dashboard.tsx`, `components/rankings/rankings.tsx`, `app/heroes/page.tsx`, `app/hero/[slug]/page.tsx` |
| G3 | **Colour encodes arbitrary groupings, and the hexes are reused for other meanings.** | `lib/constants/groups.ts`: ERA and FAMILY palettes share hexes. The hero Tolly card uses blue for Box office and green for Recent form (`components/tolly/tolly-parts.tsx`). Rankings uses `--series-telugu/tamil/malayalam`. The Star Score breakdown has 9 hues. | `lib/constants/groups.ts`, `lib/constants/colors.ts`, `components/ui/colour-by.tsx`, `components/dashboard/star-breakdown.tsx` |
| G4 | **No film entity.** No `/film/[slug]` route. Film names are inert text in Top films, Best film, milestones, the films table, director tables and release lists. | `find app -name page.tsx` has no film route. In `/releases`, "Dulquer Salmaan", "Venkatesh" and "Dhanush" in cast lines are plain text. | `app/`, `components/home/top-films.tsx`, `app/releases/page.tsx`, `components/hero/hero-films-table.tsx` |
| G5 | **Card soup and template typography.** Every section is `.card` with a `section-kicker` eyebrow, a Playfair H2 and a muted line. Pills appear for filters, legends, verdicts, metric pickers and facts. | Home has 9 cards and 4 tiles. Star Score has 14 cards. Hero page has 11. | `app/globals.css` (`.card`, `.section-kicker`, `.eyebrow`, `.cinema`), every page |
| G6 | **No dark mode.** With `prefers-color-scheme: dark` the body is still `rgb(247,243,236)`. `themeColor` is a single value. | Playwright dark context | `app/globals.css`, `app/layout.tsx` |
| G7 | **Nav overload and no motion grammar.** 9 primary items plus a "How it works" button. The active state is a `border-b-2` swap with only `transition-colors`. No hover indicator, no shared transitions. On mobile the nav is a hidden-scrollbar strip: "Releases… Trends… How it works" are off-screen with no fade or chevron. | Screenshots `home-m-00.png` | `components/layout/site-header.tsx` |
| G8 | **Intro clapperboard** (3.3 s, 24 faces) on first session visit. It is a gimmick on a data site, delays the LCP content, and flashes on the 404 route in the first frame. | `shots/intro.png`, `shots/404.png` | `components/home/intro.tsx`, `lib/intro.ts`, `app/globals.css` intro block (~250 lines) |
| G9 | **Number formatting is inconsistent.** "₹4.01k cr" (directors table) vs "₹4,014 cr" (director page). "82.5/100" vs "82.5". "36.4M" vs "27M" (no decimal). "58%" vs "0.58". Ratios are written "7.24×" in one table and as a percentage elsewhere. | Screens | `lib/data/real/hero-facts.ts` (`compactCount`), `app/directors/page.tsx`, `components/dashboard/shared.tsx` |
| G10 | **Tooltips** are clipped under the sticky header and sub-nav (the hero career-graph tooltip loses its title row), have no arrow, put no entity token in the header, have no keyboard parity on HTML-dot charts, and are sometimes plain `title=""` attributes. | `shots/nani-career-hover.png` | `components/charts/chart-tooltip.tsx`, `components/home/home-charts.tsx` (`.dot-tip`), `app/hero/[slug]/page.tsx` |
| G11 | **Label collisions** in scatters ("Naveen Polishetty" over an avatar, "Prithviraj Sukumaran" through Kichcha Sudeep's dot, "Pawan Kalyan/Prabhas" stacked), and end-label collisions in line charts ("All releases · 176 / Wikipedia list only · 165 / in theatres · 165"). | `star-score-d-02.png`, `releases-d-00.png` | `components/charts/label-layout*`, `components/charts/pareto-chart.tsx`, `components/releases/releases-chart.tsx` |
| G12 | **Placeholder avatars** look broken: coloured disks with "S" or "TR" initials in chart colours. | Scatter plots | `components/charts/svg-avatar.tsx`, `components/hero/hero-avatar.tsx` |
| G13 | **Missing route files.** No `loading.tsx`, `error.tsx`, `not-found.tsx` or `opengraph-image`. The 404 is the stock Next page. | `find app` | `app/` |
| G14 | **Accessibility gaps.** `CountUp` sets `aria-label` on a `<span>`, which is ignored without a role. Colour is the only verdict cue in the career graph and the Hits/flops bar. Range bars on `/tolly-index` have no axis, so the position is meaningless. There is no roving focus on chart marks except the scatter. | Code and screens | `components/ui/count-up.tsx`, `components/hero/career-chart.tsx`, `components/tolly/tolly-ranking.tsx` |
| G15 | **Data hygiene visible to users.** Duplicate films in the snapshot (`RRR` 2022 twice, `Court` and `Court: State vs a Nobody` 2025). The genre list contains "soundtrack". There is an obviously suspect budget (Geetha Govindam ₹5 cr reported against ₹132 cr gross = 26×). | `lib/data/real/snapshot.json` | `scripts/tolly/*`, `lib/data/real/load.ts` |
| G16 | **Contradictory copy.** "Not ranked yet: too few of their films have audience ratings" next to "Vishal: 29 of 29 films rated". Methodology says the recipe is a "secret masala" ("ingredients, not quantities") while the hero page prints "Audience · 37%, Box office · 35%" and `lib/constants/metrics.ts` prints the Star Score weights in a tooltip. | `/tolly-index`, `/methodology`, `/hero/*` | `app/tolly-index/page.tsx`, `app/methodology/page.tsx`, `lib/constants/metrics.ts` |
| G17 | **Dead stats rendered.** "Average audience rating: — not enough data · No audience ratings" on every hero. The "X (Twitter) followers —" row. The "Audience score — —" card in Compare. | `/hero/prabhas`, `/compare` | `app/hero/[slug]/page.tsx` stats block, `components/compare/compare.tsx` |

### 1.2 Home `/` (`app/page.tsx`, `components/home/*`)

- **What reads as AI template:** a gradient "cinema" banner with a gold-highlighted serif question, a pill CTA and a ghost pill CTA, then a podium with medal colours (gold, silver and bronze blocks growing from the bottom). Then four equal stat tiles, of which "36.4M followers: Allu Arjun, the most followed" is a vanity number. Then cards in a 1.55fr/1fr grid, then a scatter, a line chart, a duel, an accordion "See all the graphs" that embeds the whole Star Score dashboard (`components/home/all-graphs.tsx` wraps `<Dashboard embedded/>`), a 24-face "Pick a hero" wall, and a 4-card "Go deeper" grid with icons in tinted circles. It is eleven blocks with no argument running through them.
- **Hierarchy:** the question "Who is Tollywood's biggest hero?" is answered three times on one screen: the podium, the Top 10, and Top films leading with Baahubali. The real answer (the Top 10 with the reasons) sits at half opacity under the fold.
- **Top 10** (`components/home/top-ten.tsx`): bars are coloured by debut era with a "Colour by" switch nobody needs. The bars start at 0 although scores range from 34 to 76, so the top 10 look almost identical (75.5 vs 64.8 reads as a 14% difference). "Best: Pushpa: The Rise" is set in tiny muted text at the far right.
- **Top films** (`components/home/top-films.tsx`): an expandable list with ▾ toggles and "Show the top 25" — a second ranking inside a card. The tab "Most loved / Biggest box office" uses a filled wine pill, which is a different segmented style from the one used elsewhere (`components/ui/segmented.tsx`).
- **Most followed:** progress bars in a mustard colour `#b7791f` that appears nowhere else.
- **"More films, or more hits?"** (`components/home/home-charts.tsx`): 80 photo avatars in absolutely positioned HTML divs. Heavy overplotting in the 10–25 films × 30–70% region. There is no quadrant meaning, no median lines, "Better ↗" in green, and placeholder "S" disks. At 390 px it is an unreadable heap (`home-m-03.png`).
- **Releases chart:** 5 overlapping lines, explained in 1.4. A mono "EVERY FRIDAY" kicker.
- **Head to head** (`components/home/head-to-head.tsx`): this block is good and should be kept and improved. Its problems: native `<select>`s, a "Surprise me 🎲" button, and the loser bar in beige with no value context.
- **Pick a hero / Go deeper:** redundant with the nav and search. Kill both.
- **Mobile:** the banner takes 1.1 screens before the podium, the stat tiles take another screen, and the nav is clipped.

### 1.3 Tolly Index `/tolly-index` (`app/tolly-index/page.tsx`, `components/tolly/tolly-ranking.tsx`)

- The top-3 cards duplicate rows 1–3 of the table right below them.
- **The range column has no axis.** A dot on a track whose domain is not shown. 34.8 sits at the far left and 75.5 near the right, so the column is either a hidden min–max scale or a 0–100 scale. The reader cannot tell. The ± band is drawn but not explained in context.
- Index numbers are coloured by debut era (orange, blue, green), so the most important number in each row changes colour for an irrelevant reason.
- The table is `min-w-[960px]` inside a card. On mobile the ± values are clipped at the edge and rows have uneven heights (Prabhas's row is twice as tall because "Best film" wraps off-screen) (`tolly-index-m-01.png`).
- "Top 10 films" here includes Tamil films (Anniyan, Jai Bhim, Soorarai Pottru, Anbe Sivam). The home "Top films" says "Films made in Telugu only". Same name, different universe.
- "Rating 82 · Reach 99 · Staying power 99" under each film shows the rating pillar as a bare number labelled "Rating". It is derived and not the raw score, but the label invites reading it as one. Rename it "Audience" and show it as a pillar bar.
- "Not ranked yet": the reason contradicts the data (G16). This list is really "Tamil/Malayalam/Kannada heroes outside the Telugu index" and should say so.

### 1.4 Star Score `/star-score` (`components/dashboard/dashboard.tsx`, 585 lines)

- This is a second home page: cinema banner, tilted polaroid cards of the top 3 (a gimmick), a filter bar, 4 KPI tiles, a column chart, two half-cards, a promo strip, "Go deeper", four accordions and a table.
- **Column chart:** bars coloured by debut era. The y-axis starts at 0, so 82.5 vs 73.7 is hard to see. Avatars are copied from AA but with labels wrapped onto two lines ("Jr / NTR") and redundant "#1, #2" text under each column.
- **Scatters** (`components/charts/pareto-chart.tsx`): an "Across / Up" pair of native selects plus "⇄ Swap axes" is good functionality with poor presentation. There is no Pareto frontier shown on the default axes, labels collide, and a "Find a hero in this chart" bar sits below the chart. The "Bigger films vs more hits" x-axis is linear, so 40 heroes cluster in the first 15% (it needs a log scale for gross).
- **Accordions** ("Box office scale", "Recent form", "Career reach") hide charts behind a "+". The content exists but is buried.
- The table's "82.5/100" suffix is repeated in every row. Header sort glyphs "↕" sit on every column, visual noise.

### 1.5 Heroes `/heroes`

- A 4-column grid of identical cards: avatar ringed in era colour, name, a stats line that wraps ("31 films · 18 hits · 58% / success"), a debut year, a family dot and a Star Score. 89 cards and about 10 screens on mobile (`heroes-m`, 10,555 px tall).
- Sort chips (Star Score, Name, Most films, Debut year) but no filter (industry, era, active or not) and no search.
- Nothing shows careers. This page should be the most visual one (see the Ledger in section 2).

### 1.6 Hero page `/hero/[slug]` (`app/hero/[slug]/page.tsx`, 651 lines)

- **Header:** cinema banner plus 4 equal tiles (Tolly Index, Star Score, Success ratio, Blockbusters). The two scores conflict (G2). The photo is cropped hard on the right edge (Prabhas's face cut by the card edge on desktop).
- **Fact pills** row, then a "Family/Awards" box, then a sticky sub-nav with 8 anchors. The **sub-nav has no active-section tracking** (nothing is highlighted while scrolled into Star Score) and no sliding indicator. "Compare ↗" is mixed in with the in-page anchors.
- **Tolly Index card:** a large number box on the left, empty for about 300 px below it (`hero_prabhas-d-01.png`). Pillar bars are coloured blue/green/orange per pillar (G3), with a "typical hero" tick that is not labelled in place.
- **Star Score breakdown:** 9 rainbow bars (`components/dashboard/star-breakdown.tsx`) showing percentiles labelled with raw facts on the right. The double encoding is confusing ("₹5,046 cr total" → 100).
- **Milestones:** decent content in a template "timeline with dots" form, disconnected from the career graph directly below it, which shows the same films.
- **Hits and flops:** a 100% stacked bar in a half-width card with an empty right half. Legend counts sit in a 3-column grid with odd alignment ("Not reported / too recent 0").
- **Career graph** (`components/hero/career-chart.tsx`): an ordinal verdict on y, films joined by a grey polyline. The line implies continuity and interpolation between independent films, and it zig-zags violently. Verdict is shown by colour only. Points are spaced by date, but the line visually equalises gaps. The upcoming film "?" is a nice idea, but its label is clipped ("Alias Rukmini" overlaps the edge).
- **Year by year:** a half-width card with an empty right half. Stacked hits / not-hits per year duplicates the career graph.
- **"Compared with other heroes":** 12 tick-bars in orange. The tick ("typical hero") is not in the legend beyond one line of text. Green/red triangles mean "above or below typical", but "Average gap 9.6 mo ▼" is red although a lower gap is arguably good. The direction semantics are inconsistent.
- **All statistics (21):** an accordion that repeats the above, including dead rows (G17).
- **Films table** (`components/hero/hero-films-table.tsx`): 11+ columns, horizontally clipped at 1440 (the "G…" column is cut off). The Kalki 2898 AD row is about 200 px tall and empty because an off-screen column wraps long text. "via Wikipedia film article" repeats on every row. Director names are links (good), hero co-stars are not, and film titles are not.
- **Mobile:** the films table is clipped with no scroll cue, and the stat tiles are cramped.

### 1.7 Directors `/directors`, `/director/[slug]`

- List page: three cinema top-cards ("100%", "100%", "100%"), a sort pill row, then a table with monogram avatars that all look the same (wine on pink). The hit-rate bar is green for every row. "5 / 7" film counts need explaining.
- Director page: cinema header, 4 tiles, then a **career graph with no film labels at all** (`director_s-s-rajamouli-d-00.png`). 12 dots and you cannot tell which is RRR. Then milestone cards, a films table (hero names not linked), and "Heroes worked with" (not linked, no visual).
- The most interesting director data (pairings: E. V. V. Satyanarayana × Allari Naresh 8 films / 6 hits; Sukumar × Allu Arjun 4/3; Rajamouli 12 for 12 across 8 heroes) is not visualised anywhere.

### 1.8 Releases `/releases` (`components/releases/releases-chart.tsx`)

- **Wrong chart form.** Five lines: All, Wikipedia-only (dashed), Telugu in theatres, Dubbed, OTT. Total = theatrical + dubbed + OTT is a part-to-whole relationship, so it should be stacked columns. "Wikipedia list only" is a methodology diagnostic exposed as a primary series. The theatres line sits almost on top of the total line.
- **The partial year is drawn as a crash** (2025 = 200 → 2026 = 176 "to 25 Nov"), which reads as a decline. It needs a "to date" treatment.
- End labels collide. The vertical hover rule is wine while the series are purple/wine/gold/teal.
- The list section (2-column month cards) is solid, but titles are not linked, tracked heroes are not tokens, and verdicts are not shown for films we have verdicts for. Mobile is 14,000 px tall.
- **Gem not shown:** dubbed releases went from 2 (2000) to 26 (2022), about 19% of that year's releases. Total releases went from 70 (2009) to 271 (2024), almost 4×. 2020 fell to 72, the first OTT-direct year.

### 1.9 Rankings `/rankings` (`components/rankings/rankings.tsx`)

- A third leaderboard. 11 metric pills that wrap to two lines, horizontal bars coloured by industry (wine/teal/gold), and 89 rows with no pagination. It duplicates the Star Score page's controls (All time / Last 5 years / Last 10 films, Include emerging). Merge it into the Index explorer.

### 1.10 Compare `/compare` (`components/compare/compare.tsx`)

- Defaults to **Fahadh Faasil vs Vijay**, two non-Telugu heroes. It should default to the top two of the index or to the last viewed hero.
- A grid of 10 mini cards, each holding 2 bars: low density, lots of chrome. An empty "Audience score — —" card. Bold marks the "winner" but the bars do not.
- "Evidence / confidence 14.6% Low" is jargon. There are no career strips overlaid, no shared films or directors, and no "align by debut" option, which is the most interesting comparison.

### 1.11 Trends `/trends` (`components/trends/trends.tsx`)

- "Eligible lead releases per year" is a different count from Releases with no explanation. The legend lists "Telugu-dubbed (theatrical)" with no data.
- "Average film outcomes by release year": a flat line around 45 on a 0–100 axis, wasting 60% of the plot.
- "Career trajectory": defaults to Fahadh Faasil. The line chart has 3 x-ticks (2013, 2016, 2019) while the data runs to 2026, and the bar chart labels a single year (2020). It looks broken.
- Fold the useful parts into Years and the hero page. Kill the route (redirect).

### 1.12 Methodology `/methodology`, Annexure `/annexure/*`

- Tone whiplash: a cinema card titled "Secret masala 🌶️" in Tenglish with emoji, on the page that should carry the most authority. It also contradicts the published weights (G16). AA's methodology pages are its credibility engine. Publish the recipe.
- "What goes into the pot" is a 2×2 card grid with coloured dots, the same pillar colours as G3.
- Annexure: the side-nav numbering ("2. Hero Registry", "3–4. Hero detail") does not match the card labels ("Section 1 Hero Registry", "Section 2 Hero detail"). The summary line says "0 scored · 1257 provisional" while the home page says "1,467 films scored".

### 1.13 Mobile summary (390×844)

- The nav hides 5 of 10 items off-screen with no affordance. There is no menu and no search in the header.
- Wide tables (`min-w-[960px]`) clip inside cards with no edge fade or sticky first column.
- Photo-avatar scatters are unusable at this width.
- Pages are very long: home 7,681 px, releases 14,026 px, heroes 10,555 px, directors 10,908 px.
- Tap targets: the sort-chip and legend pills are about 28 px tall. Use 40 px minimum, or 44 px for primary controls.

---

## 2. The linking idea: "The Ledger"

### 2.1 First principles

Every number on this site is a roll-up of **films**:
- a hero's Tolly Index = f(his films' audience pillars, verdicts, grosses, recency) + fame;
- a director's hit rate = his films' verdicts;
- releases per year = count of films by date;
- trends = films grouped by year.

A film has exactly four coordinates that every other entity hangs from: **when** (release date), **who** (hero(es), director), **how it did** (verdict, gross vs budget) and **how it is remembered** (film score). The site currently shows the aggregates and hides the atoms. The fix is not more links bolted onto widgets. It is one visual unit and one axis, repeated everywhere, so that the reader learns the language once.

### 2.2 The system (four parts, one idea)

**A. One mark: the Film Mark.** A film is always drawn the same way, at every size:
- a vertical tick placed at its **release date** on a shared 2000–2026 time scale;
- **height** = reported worldwide gross on a log scale (₹1 cr → 20%, ₹2,000 cr → 100% of row height). When gross is unknown the tick is a short fixed stub of 30% height;
- **fill** = verdict, on one diverging ramp: blockbuster, hit, average, flop, disaster. **Shape redundancy** for colour-blind readers: hits are solid, average is half-filled (top half outline), flops are outline only, unknown verdict is a dotted outline;
- an upcoming film is a dashed outline with a "?" glyph (keep the existing idea).

At 3 px wide this gives a "film strip" or barcode for a career. At 12 px it gains a title label. As a token in text (see C) it becomes a 6×10 px inline mark before the title. The mark is the same everywhere.

**B. One spine: the Timeline 2000 → 2026.** Every temporal chart (hero reel, director reel, Ledger rows, releases per year, compare overlays) uses the same x-scale definition (`lib/timeline.ts`: domain `[2000-01-01, today]`, year ticks every 2 years on mobile and every year on desktop, decade gridlines stronger). The current year is always rendered "to date" with a hatched end-cap. Because the scale is shared, the reader can carry a position from one chart to another: "2017" is in the same place on every page.

**C. Entity tokens: everything is linkable and peekable.** Four token components, used in prose, tables, legends, tooltips and chart labels:
- `HeroToken`: 20 px avatar + name. Hover or focus opens a **Peek** card (320 px) with avatar, rank and index, a 26-year mini strip, best film and an "Open" link.
- `FilmToken`: inline film mark + title + year. Its Peek shows the verdict, film score, gross/budget, hero and director tokens and a "Open film" link.
- `DirectorToken`: a monogram square, not a circle (so it never reads as a hero) + name. Its Peek shows a mini strip, hit rate and top heroes.
- `YearToken`: "2017". Its Peek shows the release count (stacked mini bar), top film and hits.

Any name in the data that matches an entity renders as a token, including cast lists on Releases and co-stars in film rows. Tokens are plain `<a>` links with a `data-peek` attribute. Peek is a progressive enhancement: hover after 300 ms or focus + `Space`. Touch devices navigate directly. Peek content is served from a single precomputed JSON index (`lib/peek-index.ts` generated at build), so no request is needed per hover.

**D. One focus state with cross-highlighting.** A page-level focus store (`useFocus()`: `{hero?, director?, year?, film?}`) is synced to URL search params (`?hero=nani&year=2017`) so focus is shareable. Every chart subscribes:
- marks that match the focus are drawn at full ink or verdict colour;
- non-matching marks fall to `--field` (warm grey, low contrast);
- hovering any token or legend item sets a transient focus (cleared on leave). Clicking pins it, and a chip "Focused: S. S. Rajamouli ×" appears in the section header.

Example: on the Ledger, hover the "S. S. Rajamouli" director token and his 12 films light up across the Prabhas, Jr NTR, Ram Charan, Nani, Ravi Teja, Nithiin, Sunil and Kichcha Sudeep rows. Every other mark greys out. That one interaction says more about "director–hero links" than any table on the current site.

This is the AA "focus model" idea (their model pages show every model, with the current one in colour and the rest washed out), generalised into a cross-entity grammar that AA does not have.

### 2.3 The signature view: the Ledger

The hero moment of the site, used on Home, `/heroes` and `/directors`, and reused in Compare:

```
               2000        2005        2010        2015        2020      2026▒
 1  ◉ Allu Arjun  75.5 ±1.3 │      ▮ ▪  ▮   ▮ ▪ ▮▮  ▪ ▮   ▮    ▮      ▮▮  ▮      │
 2  ◉ Nani        73.1 ±1.3 │                  ▪ ▪▮  ▮▮▮▮▮▮▮▮ ▯ ▮▯ ▮▮ ▮ ▮ ▮▮ ┆?   │
 3  ◉ Jr NTR      71.5 ±1.6 │ ▮ ▮ ▯ ▮ ▯  ▮ ▯  ▮▯ ▮  ▮ ▮   ▮  ▯  ▮       █   ▮      │
 …
    rank · token · index      one row per hero; each tick a film (height = gross, fill = verdict)
```

- Rows are sorted by the active metric (Index by default; tabs swap the metric and rows **reorder with a FLIP animation**).
- The left block holds the rank, hero token, value and an interval bar on a visible axis.
- The right block is the career strip on the shared timeline. A column hover shows a year rule, the year token and that year's release count.
- Brushing a range on the axis (2014–2017) focuses those years everywhere on the page.
- "Top 10 of 56 ▾" selector (AA "N of M" pattern) with a search field in its popover.
- Mobile: the strip collapses to a 140 px wide sparkline column. Tapping a row expands it to a full-width strip with labels (accordion row, one open at a time).

### 2.4 Why this direction, and what it rules out

- It answers the owner's main complaint directly: the linking element is visible, and it is the same element everywhere.
- It is unique to this domain. A film career is a sequence of discrete bets over time, and the strip makes that legible. AA does not have this because models are not careers.
- It uses data the site already has (date, verdict, gross, director per film). Nothing is invented.
- It is buildable with plain SVG plus one shared scale module. No chart library.
- **It rules out:** per-hero colours (56 hues cannot be told apart; identity is photo + name, and colour is reserved for outcome and focus), colour-by-era or family rainbows, podiums, polaroids, icon-card grids, the scroll-faded sections, and accordions that hide charts.

### 2.5 One headline score

Make the **Tolly Index** the only headline score and the only "No. 1". Present the Star Score's inputs as the **Box office** pillar view of the index explorer (tabs: Index · Audience · Box office · Form · Fame · Career), not as a competing score. Remove "Star Score" from the nav, the hero header and the Heroes sort. Redirect `/star-score` → `/tolly-index?view=boxoffice` and `/rankings` → `/tolly-index?view=table`. Non-Telugu heroes (the 33 outside the index) appear in Heroes and Compare with a clear "Outside the Telugu index" tag and no rank. This removes the "56 / 88 / 89 / 91" confusion. The owner needs to sign this off, but I would not ship the redesign without it.

---

## 3. Design system spec

### 3.1 Colour tokens

Base: warm monochrome "paper and ink", one accent (wine) for focus, one diverging ramp for verdicts. All values were validated (contrast against `--surface` listed).

```css
:root {                       /* LIGHT */
  color-scheme: light;
  --paper:      #f7f4ee;  /* page */
  --surface:    #fffdf9;  /* frames, popovers */
  --surface-2:  #f1ece3;  /* table header, segmented track, hover row */
  --ink:        #1b1613;  /* 17.7:1 primary text, focus marks */
  --ink-2:      #4a403a;  /* 9.9:1 secondary text */
  --muted:      #6e625a;  /* 5.8:1 captions, tick labels */
  --faint:      #8f847c;  /* 3.6:1 disabled, non-text only */
  --rule:       #e4ddd2;  /* 1px borders */
  --grid:       #ece6dc;  /* gridlines */
  --field:      #cfc7bd;  /* de-emphasised marks (decorative, exempt) */
  --field-2:    #b7aea5;  /* de-emphasised marks on hover */
  --accent:     #7a1f3d;  /* wine: focus, links, active (9.9:1) */
  --accent-2:   #641832;  /* hover/pressed */
  --accent-wash:#f4e6ea;  /* focus background, selection */
  --focus-ring: #0b5f73;  /* 7.1:1 keyboard ring, never used for data */
  /* verdict ramp (diverging, each ≥3:1 on surface) */
  --v-blockbuster: #145846; /* 8.2 */
  --v-hit:         #2f7d66; /* 4.9 */
  --v-average:     #9a8558; /* 3.5 */
  --v-flop:        #c0573a; /* 4.4 */
  --v-disaster:    #8a2a1a; /* 8.5 */
  --v-unknown:     var(--faint);
  /* compare slots (only on /compare and duel) */
  --slot-a: #7a1f3d; --slot-b: #1f5f8b; --slot-c: #9a6a00; --slot-d: #4a4f57;
  --shadow-pop: 0 1px 2px rgb(27 22 19 / .06), 0 12px 32px rgb(27 22 19 / .12);
}
:root[data-theme="dark"], @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  color-scheme: dark;
  --paper:#141110; --surface:#1c1816; --surface-2:#25201d;
  --ink:#f3eee8; --ink-2:#cfc5bc; --muted:#a39890; --faint:#7d736c;
  --rule:#2f2926; --grid:#29231f; --field:#4a423d; --field-2:#5b524c;
  --accent:#e58aa5; --accent-2:#f0a8bd; --accent-wash:#3a1d27; --focus-ring:#6cc7dc;
  --v-blockbuster:#7fd1b5; --v-hit:#3fa585; --v-average:#bfa874; --v-flop:#f2916d; --v-disaster:#d9604a;
  --slot-a:#e58aa5; --slot-b:#7fb6e0; --slot-c:#e0b85c; --slot-d:#b9bec6;
  --shadow-pop: 0 12px 32px rgb(0 0 0 / .5);
}}
```

Rules:
- **Colour is semantic only.** Verdict ramp = film outcome. Accent = "you are here", selection, links. Slots = compare identities (maximum 4). Everything else is ink on paper.
- The "cinema" gradient is removed. If one dark band is wanted (the footer), use plain `--ink` with `--paper` text and no radial glows.
- Selection colour: `::selection { background: var(--accent-wash); color: var(--ink); }`.

### 3.2 Type

Keep Playfair Display (display) and Inter (UI and numbers). Retire JetBrains Mono from the UI. Mono eyebrows are part of the template look; keep mono only for CSV/code if needed.

| Token | Font | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display` | Playfair | 64/64 (≥1024), 40/44 (mobile) | 700 | -0.02em | Page H1 only |
| `title-1` | Playfair | 32/38, 26/32 | 600 | -0.01em | Section titles |
| `title-2` | Playfair | 22/28 | 600 | -0.005em | Chart frame titles |
| `body` | Inter | 16/26 | 400 | 0 | Prose |
| `ui` | Inter | 14/20 | 500 | 0 | Controls, table cells |
| `small` | Inter | 13/18 | 400 | 0 | Subtitles, tooltips |
| `caption` | Inter | 12/16 | 400 | 0.01em | Source lines, tick labels |
| `label` | Inter | 11/14 | 600 | 0.06em, uppercase | Table column headers only |
| `num-xl` | Inter | 56/56 | 600 | -0.03em | Headline score (one per page) |
| `num-l` | Inter | 28/32 | 600 | -0.02em | Supporting KPIs |

- All numerals are `font-variant-numeric: tabular-nums lining-nums` (global on body, already partly present).
- Playfair is never used for numbers (keep the current `.num` intent).
- No serif-title + muted-subtitle + kicker triplets. A section gets a title, and optionally one sentence that states the finding ("Nani strung together 8 hits in a row, 2014–2017"), not a description of the chart ("Each photo is a hero…").

### 3.3 Space, layout, radii, elevation

- 4 px base. Steps: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Page container 1280 max, gutters 16 (mobile) / 24 (tablet) / 32 (desktop). 12-column grid, 24 gutter.
- **Section rail layout** (AA-style, for Index, Hero, Director, Film, Years): 200 px left rail (sticky, top 88) + content. The rail is hidden below 1024 px and replaced by a sticky horizontal section bar with a sliding indicator.
- Vertical rhythm: 96 px between major sections on desktop, 64 on mobile. Sections are separated by **space and a 1px rule, not by cards**. Cards (`--surface` + 1px `--rule`, radius 12) are reserved for **ChartFrames, popovers and Peek**. There is no nesting of frames inside frames.
- Radii: plot areas 0, frames 12, inputs and segmented 8, tokens and pills 999 (pills only for tokens and filter chips), avatars 50%, director monogram 4.
- Elevation: none at rest. `--shadow-pop` for popovers, Peek, command palette and tooltips. The sticky header gets a 1px `--rule` bottom border that only appears after 8 px of scroll (`[data-scrolled]`).

### 3.4 Chart grammar

**`<ChartFrame>`** replaces `components/ui/chart-card.tsx` and is the only chart container.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Title (title-2)                         [Top 10 of 56 ▾] [🔗][⤓][▦] │
│ One-line finding or definition (small, --muted)                      │
│ ┌ tabs: Index │ Audience │ Box office │ Form │ Fame │ Career ┐  ←sliding pill
│                                                                      │
│                              PLOT                                    │
│                                                                      │
│ Legend (inline, interactive)                                         │
│ Source: Tollywood Analysis film ledger · as of 25 Nov 2026 · Method →│
└──────────────────────────────────────────────────────────────────────┘
```

- Props: `id, title, finding?, tabs?, value?, onTab?, selector?, actions: {link, png, table}, legend?, source, children`.
- Actions: **link** copies the URL with `#id` and the current params, then shows a "Copied" toast. **PNG** renders the SVG to canvas with the title and source baked in. **Table** swaps the plot for an accessible data table (same data, sortable) with a crossfade.
- `id` is the anchor. The frame registers itself with the section rail.

**Axes and grid**
- Gridlines are horizontal only (or vertical only for horizontal bars), 1px `--grid`. No chart borders. The zero baseline is 1px `--ink-2`.
- Tick labels: `caption`, `--muted`, tabular. 4–6 ticks via a nice-tick algorithm. Never more than one label per 48 px.
- Axis titles go at the end of the axis, inline with the last tick ("₹ crore, log"), not rotated. For the y-axis, the title sits above the axis, left-aligned.
- Bars that encode a score whose range sits far from 0 (index 34–76) use a **dot-on-line or interval** encoding with a truncated, labelled axis, not bars from zero. Bars are only used for counts and sums (films, hits, gross, releases), always from zero.
- Log scales for gross and budget (2 cr … 2,000 cr), with ticks 1, 10, 100, 1,000 labelled "₹1 cr, ₹10 cr, ₹100 cr, ₹1,000 cr".
- Time axis = the shared Timeline (section 2.2B).

**Labels**
- Prefer direct labels to legends. In scatters, label the top 8 by the active metric plus the focused and pinned items, with collision avoidance (greedy placement over 8 candidate positions; drop a label rather than overlap; leader lines when the offset exceeds 12 px).
- End labels on line charts are stacked with 14 px minimum spacing (vertical dodge).
- No two-line wrapping of hero names under columns. Abbreviate surname-first on overflow ("Jr NTR" stays, "Kartikeya G.") with the full name in the tooltip.

**Colour on charts**
- Default: focus marks `--ink` (or verdict colour for film marks), everything else `--field`.
- Single-series bars are `--ink`, the focused bar `--accent`.
- Categorical colour appears only when the category is the point of the chart (verdict, release kind, compare slots). Release kind uses ink tints: theatrical `--ink-2`, dubbed `--v-average`, OTT `--focus-ring` at 70%. That is three distinct tones with shape backup in the legend.
- "Group by" (era, family, industry) is a **facet** that splits into small multiples or highlights one group at a time from the legend. It never paints a rainbow.

**Hero avatars on charts**
- Under columns: a 24 px avatar with a 1px `--rule` ring, a 2px `--accent` ring when focused, and the name below in `caption`, single line, truncated with an ellipsis.
- In scatters: avatars (22 px) only for labelled points. Other points are 7 px dots in `--field` (focus: `--ink`). This fixes the 80-face heap.
- Fallback monogram: a `--surface-2` disk with `--ink-2` initials and no colour. Lazy `<image>` with `decoding="async"`, sources from `heroThumb()`.

**Tooltips** (one component, `components/charts/tooltip.tsx`)
- 240 px max width, `--surface`, 1px `--rule`, radius 10, `--shadow-pop`, 8 px arrow pointing at the mark.
- Rendered in a portal with `position: fixed`, so it is never clipped by the sticky header. It flips below when there is less than 16 px of room above, and clamps to the viewport with 8 px margins.
- Header: the entity token (avatar or film mark + name). Body: key/value rows, keys `--muted`, values `--ink` tabular, right-aligned. Footer hint: "Click to open · Shift-click to pin".
- Appears after 60 ms and disappears 120 ms after leave, so the pointer can travel into it. Pressing Escape dismisses it.
- Keyboard: marks are reachable with roving tabindex (one tab stop per chart, arrows move between marks, Enter opens, Space pins). The tooltip follows focus.

**Interaction states for marks**
- Rest: as above. Hover: mark at full colour, the rest of the field at 35% opacity, crosshair or row rule in `--rule`. Pinned: 2px `--accent` outline plus a label.
- Transitions are 160 ms ease-out on `opacity` and `fill`.

### 3.5 Motion spec

Tokens:
```css
--dur-1: 120ms;  /* micro: color, opacity on hover */
--dur-2: 180ms;  /* indicators: sliding pill, focus ring */
--dur-3: 260ms;  /* popovers, peek, tooltip enter */
--dur-4: 360ms;  /* chart morph, row reorder */
--dur-5: 420ms;  /* page shared-element morph */
--ease-out:    cubic-bezier(0.22, 1, 0.36, 1);   /* default */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* morphs */
--ease-exit:   cubic-bezier(0.4, 0, 1, 1);       /* leaving */
```

**Sliding highlight**, one hook for all segmented UIs: `useSlidingIndicator(containerRef, {active, hovered})` measures the target's `offsetLeft` and `offsetWidth` (re-measured with ResizeObserver and `document.fonts.ready`) and writes `--x` and `--w` to a single absolutely positioned indicator element. CSS: `transform: translateX(var(--x)); width: var(--w); transition: transform var(--dur-2) var(--ease-out), width var(--dur-2) var(--ease-out)`. It is used for:
- **Main nav:** a hover pill (`--surface-2`) that follows the pointer between items and returns to the active item on leave. The active item also has a 2px `--ink` underline that slides on route change.
- **Tabs** in ChartFrame and **segmented controls** (time window, verdict filter): the pill slides on selection, and a secondary hover ghost at 50% follows the pointer.
- **Section rail:** a 2px `--ink` vertical bar slides to the active section (driven by IntersectionObserver with rootMargin `-40% 0px -55% 0px`).
- **Table rows:** a single row-highlight element (`--surface-2`) slides vertically to the hovered row (transform only), instead of per-row background flicker.
- **Sort indicator:** the column-header caret slides between columns.

**Enter:** content is visible by default and there is no section fade-in. Only charts draw in, once, the first time they intersect (IntersectionObserver, threshold 0.25): marks grow from the baseline (`scaleY`/`scaleX` 0→1, `--dur-4`, staggered 6 ms per mark, total stagger capped at 240 ms). The SSR markup is the final state. JavaScript adds `data-enter="pending"` only to frames that are below the fold at hydration time. Anything already in view, reached by hash or printed is never hidden.

**Chart transitions on metric switch:** bars are keyed `<g>` elements per entity, never re-mounted.
- Value change: the bar's `transform: scaleX()` (horizontal, `transform-box: fill-box; transform-origin: left`) transitions over `--dur-4 --ease-in-out`.
- Rank change: the row's `transform: translateY(rank*rowH)` transitions over the same duration (FLIP with no layout read needed, because positions are computed).
- The value label tweens its number via `useTweenedNumber` (requestAnimationFrame, `--dur-4`, tabular so it does not jitter).
- Entering items fade from 0 at their final position. Leaving items fade to 0 over `--dur-1`.
- Scatter axis switch: points transition `transform: translate(x,y)`, and axes crossfade their ticks (old ticks fade out over 120 ms, new ones fade in over 200 ms while positions interpolate).

**Number count-ups:** only for the single headline number on a page (`num-xl`), 600 ms ease-out, first view only. Never in tables, tooltips or lists. `aria-hidden` on the animated node, with the real value in a visually hidden sibling.

**Page transitions** (React `<ViewTransition>`, `import { ViewTransition } from "react"`, Next 16 App Router; no config needed):
- The header gets `view-transition-name: site-header` with `animation: none`, so it never moves.
- The main area crossfades by default: old content fades out over 120 ms, new content fades in over 200 ms with 8 px of upward travel.
- **Shared elements:** `hero-face-{slug}` (avatar) and `hero-name-{slug}` (name) morph from any Ledger row, token or Peek into the hero page header. `film-{key}` morphs a film token into the film page title. `director-{slug}` does the same for directors. Use `share="morph" default="none"` on each named pair, as the Next guide requires.
- **Directional:** Prev/Next hero (by rank) on hero pages uses `transitionTypes={['nav-forward']}` / `['nav-back']` with a 24 px horizontal slide. Browser back gets the crossfade only.
- **Same-route swaps** (year switch on Years, tab switch inside a frame) wrap the swapped content in `<ViewTransition key={year}>` for a crossfade, not a slide.

**Reduced motion:** all transforms off. Sliding indicators jump. Page transitions become a 100 ms opacity crossfade. No count-ups and no draw-in. This is enforced by a single `@media (prefers-reduced-motion: reduce)` block plus a `useReducedMotion()` hook for the requestAnimationFrame tweens.

---

## 4. Page-by-page redesign

### 4.0 Information architecture and header

```
[TA. Tollywood Analysis]  Index  Heroes  Films  Directors  Years  Compare        [⌘K Search…]  Method
```
- Six primary items (down from nine). "Method" is a text link at the far right. `⌘K` (or `/`) opens a command palette searching heroes, films, directors and years, with entity tokens in the results, recent items and keyboard navigation.
- Mobile: logo + search icon + menu button. The menu is a full-height sheet with the 6 items as large rows (48 px) with the active item marked, plus Method, Data credits and the theme toggle.
- Redirects (`next.config.ts` `redirects()`, permanent: false while in beta): `/star-score` → `/tolly-index?view=boxoffice`, `/rankings` → `/tolly-index?view=table`, `/trends` → `/releases`. Keep the `/releases` URL but label it "Years" (or move it to `/years` with a redirect; owner's call).

### 4.1 Home `/`

Hero moment: **the Ledger, top 10, on the first screen**. The question is answered with the evidence attached.

```
┌ Header ────────────────────────────────────────────────────────────────────────┐
│ Who is Tollywood's biggest hero?                                  As of 25 Nov 2026│
│ 56 heroes, 1,467 films, one score out of 100. Method →            [⌘K Find a hero] │
│                                                                                  │
│ ┌ ChartFrame "The Tolly Index"  tabs[Index|Audience|Box office|Form|Fame|Career] ┐│
│ │ #  Hero            Score  30 ─────●──── 80   2000 ───── career strip ───── 2026▒││
│ │ 1  ◉ Allu Arjun    75.5   ├──[●]┤            ▮ ▪ ▮  ▮ ▪ ▮▮ ▪ ▮  ▮   ▮  ▮▮ ▮     ││
│ │ 2  ◉ Nani          73.1   ├─[●]┤                 ▪ ▪▮ ▮▮▮▮▮▮▮▮ ▯▮▯ ▮▮ ▮ ▮ ┆?   ││
│ │ …  (10 rows)                                                                    ││
│ │ [Show all 56 →]          Legend: ▮ blockbuster ▮ hit ◧ average ▯ flop  height=gross ││
│ └ Source · Method ────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│ Findings (editorial list, not cards)                                             │
│  01  8 in a row   Nani's run of eight straight hits, 2014–2017 (Yevade          ▮▮▮▮▮▮▮▮ │
│                   Subramanyam → Middle Class Abbayi). Longest of any hero in the Telugu index.        │
│  02  12 for 12    S. S. Rajamouli has never made a non-hit with our heroes.      ▮▮▮▮…   │
│  03  ×3.9         Telugu releases: 70 in 2009, 271 in 2024.                     ▁▂▃▅█▆   │
│  04  ₹1,811 cr    Baahubali 2 is still the biggest reported gross, ahead of Pushpa 2 (₹1,800 cr). │
│                                                                                  │
│ Head to head  [◉ Allu Arjun ▾] vs [◉ Nani ▾]  → pillar butterfly (keep, restyle)  │
│                                                                                  │
│ This year in Telugu cinema: 176 releases to 25 Nov  [stacked mini columns]  Years →│
│  Latest: FilmToken · FilmToken · FilmToken (tracked heroes as tokens)            │
└ Footer ──────────────────────────────────────────────────────────────────────────┘
```
- **Keep:** the question H1, search, the Top 10 (as Ledger rows), Head to head (restyled), the releases chart (as stacked mini columns).
- **Merge:** Top films goes to `/films`, plus one finding. Most followed goes to the Fame tab. The "More films or more hits?" scatter goes to the Index explorer's Scatter view.
- **Kill:** intro clapperboard, podium, 4 stat tiles, "See all the graphs" accordion (the embedded Dashboard), Pick-a-hero wall, Go deeper cards, all `.reveal`.
- Each Finding is generated from data at build time (`lib/findings.ts`), so it stays honest. Every number links to its evidence (a film token, director page or year).

### 4.2 Index `/tolly-index` (absorbs Star Score and Rankings)

Hero moment: **the full leaderboard explorer**, with Table / Ledger / Scatter views of one dataset.

```
Rail                │ The Tolly Index                                   As of 25 Nov 2026
● Leaderboard       │ One score out of 100 for 56 Telugu heroes. Weights →
  Pillars           │ ┌ ChartFrame ───────────────────────────────────────────────────┐
  Trade-offs        │ │ view [Table|Ledger|Scatter]  window [All time|5 yrs|10 films]  │
  Box office        │ │ metric tabs [Index|Audience|Box office|Form|Fame|Career]       │
  Outside the index │ │ # ▲  Hero        Index (30–80 axis, ± band)  Aud BO Form Fame Car  Best film │
  Method            │ │ 1    ◉ Allu Arjun  ├──[●]──┤ 75.5 ±1.3    ▆  █   ▆   █   ▄   ▮ Pushpa (2021) │
                    │ │ …  sticky header, sliding row highlight, sortable columns       │
                    │ └ Source · Download CSV · Copy link ────────────────────────────┘
                    │ Pillars: five dot-plot strips (56 dots each), hover a hero = lit in all 5
                    │ Trade-offs: scatter with X/Y pickers (log for ₹), Pareto frontier, medians
                    │ Box office: hits, ₹100-cr films, total, biggest, per film (Star Score inputs)
                    │ Outside the Telugu index: 33 heroes with a reason column (true reason)
```
- Pillar cells are 40×10 px monochrome mini bars (percentile). The header shows the pillar weight ("Audience 37%").
- Clicking a row opens **Hero Peek** as a side sheet (420 px, the URL gains `?peek=nani`) with his strip, pillars and best films. "Open page" morphs into the hero page.
- The top-3 cards are killed.

### 4.3 Heroes `/heroes`

Hero moment: **the full Ledger, all heroes**, with filters.

- Controls: search, Group by [None | Debut era | Family | Industry] (faceted sections, not colour), Sort [Index | Films | Debut | Name], Window brush on the timeline.
- Each row: avatar, name, debut year, films count, index (or "Outside index"), and the career strip.
- Grouping by family puts the Mega/Nandamuri/Akkineni rows next to each other, and the strips make the generational hand-off visible (honest and interesting).
- Mobile: rows with a sparkline strip; tapping expands the row.
- The 89-card grid is killed.

### 4.4 Hero page `/hero/[slug]`

Hero moment: **the Career Reel**, a full-width film strip with every film labelled.

```
Rail            │ ◉(morph) Prabhas                      ← #3 Jr NTR   #5 Mahesh Babu →
● Overview      │ Telugu film hero · debut 2002 · 24 films as lead
  Career reel   │ 71.2  ±1.4   #4 of 56            12 hits of 23 judged · ₹5,046 cr total · 2002–2026
  Where he stands│ (one headline score; three facts as text, not tiles)
  Films         │
  Partners      │ ┌ Career reel ─────────────────────────────────────────────────────┐
  Compare       │ │ 2002        2006        2010        2014        2018        2022  2026│
                │ │  ▯ ▮ ▯ ▮ ▯▯▯  ▮ ▯ ▮  ▮    ▮  ▮▮       █(B2)   ▮   ▯ ▯  █ ▮ ▯ ┆?Fauzi │
                │ │  labels on peaks + best/worst; annotations: "Longest gap 2015→2017"      │
                │ │  Directors row: [SSR ×3] [Prashanth Neel] [Nag Ashwin] … hover = lights films│
                │ └ verdict legend · height = gross (log) · Source ─────────────────────────┘
                │ Where he stands: 5 pillar dot-strips, 56 dots, him in --accent, labelled
                │   with the value and "typical" median tick; sentence finding per pillar
                │ Films ledger: Film · Date · Verdict · Score · Gross · Budget · ×  · Director
                │   filter [All|Hits|Average|Flops|Unknown] (sliding pill); row expands inline
                │ Partners: directors (films · hits, mini strips) · co-leads (hero tokens)
                │ Compare with: 3 nearest by index + same debut era → /compare?h=prabhas,x
```
- **Kill:** cinema banner, the 4 tiles, the Star Score card (it becomes the Box office pillar detail inside "Where he stands", expanded on demand), milestones (folded into reel annotations: first film, first hit, biggest film, latest), Hits and flops bar (folded into the reel legend counts: "5 ▮ 7 ▮ 1 ◧ 11 ▯"), Year by year (redundant with the reel), All statistics accordion (moved behind a "Table" action in the Films and Where-he-stands frames), dead stats.
- **Facts** (age, birthplace, family, awards, next film, Instagram, Wikipedia, photo credit) go in a compact definition list in the rail below the nav, or under the H1 on mobile.
- The photo appears as a 96 px avatar in the header (morph target), not a giant cropped banner. The photo credit appears in the facts list.

### 4.5 Film page `/film/[slug]` (new)

Hero moment: **"Where this film sits"**: three aligned strips (the hero's career, the director's career, all releases that year) with this film highlighted in each. This is where the linking idea pays off.

```
Baahubali 2: The Conclusion (2017) ◼(morph)
FilmToken meta: Released 28 Apr 2017 · ◉ Prabhas · ▢ S. S. Rajamouli · Music M. M. Keeravani · 171 min · Action, Fantasy
┌──────────────┬──────────────┬──────────────┐
│ Blockbuster  │ Film score   │ ₹1,810.6 cr  │   (verdict + source; score with pillars; gross / budget ₹250 cr = 7.2×)
└──────────────┴──────────────┴──────────────┘
Where it sits:  Prabhas    ▯ ▮ ▯ … [█] …     (his 24 films)
                Rajamouli  ▮ ▮ ▮ … [█] …     (his 12 films)
                2017       ▁▁▂▃▂▃▅▃▂▁▂▁ weekly releases, this week marked; 173 releases that year
Also in 2017: top 5 films by score (tokens) · Same hero next/prev film ← →
Sources: verdict sentence + link (Wikipedia), gross source
```
- Built with `generateStaticParams` from `lib/data/real/snapshot.json` (about 2,800 pages; or only the films in the tolly ledger, about 1,700, with the rest returning 404). The film score pillars are shown as Audience / Reach / Staying power bars. **No raw ratings or vote counts.**

### 4.6 Films `/films` (new)

Hero moment: **Budget vs gross** on a log-log scatter with a break-even diagonal and ×2 / ×5 guide lines. Filter by hero, director or year; focus links to the Ledger.
- Tabs: Most loved (film score), Biggest (gross), Most efficient (gross ÷ budget, minimum budget ₹10 cr so the suspect ₹5 cr entries do not dominate, with a note), Biggest misses.
- The table lists Film token, year, hero, director, verdict, score, gross, budget and ×.
- This absorbs home "Top films" and Tolly Index "Top 10 films", with a clear Telugu / All languages switch (G15 consistency).

### 4.7 Directors `/directors` and `/director/[slug]`

- List: the same Ledger with director rows (strip = his films coloured by verdict). Sort tabs: Hit rate / Hits / Box office / Films. Minimum films toggle. The left block shows the hit rate as a dot on a 0–100% axis with the "n of m" count.
- **Gem frame: "Pairings"**, a matrix of the top 15 directors × the top 15 heroes. A cell shows the number of films (dot size) and the hit share (fill on the verdict ramp). Hovering a cell lights those films in the Ledger above. Example: E. V. V. Satyanarayana × Allari Naresh, 8 films / 6 hits; Puri Jagannadh × Ravi Teja, 5 / 3; Sukumar × Allu Arjun, 4 / 3; Rajamouli × Jr NTR, 4 / 4 (counting RRR); Rajamouli × Prabhas, 3 / 3.
- Director page: H1 + headline hit rate + facts. A Reel with **film labels** (fixes the unlabelled graph). "Heroes worked with" as mini strips (one row per hero, only this director's films lit). Films table with hero tokens.

### 4.8 Years `/releases` (absorbs Trends)

Hero moment: **stacked columns 2000–2026** (theatrical / dubbed / OTT). 2026 is hatched with a "to 25 Nov" cap label, and no projection is drawn.

```
┌ Telugu releases per year ──────────── [Count | Share dubbed]  [🔗][⤓][▦] ┐
│ 300                                                     █                 │
│ 200                                         █ █ █     █ █ █ ▒(to 25 Nov)  │
│ 100  ▆ ▇ █ ▆ █ █ ▆ ▆ █ ▅ █ ▇ █ █ █ █                ▄                    │
│      2000 … 2009 (70) ……………………………… 2020 (72, OTT appears) … 2024 (271)     │
│ annotations: 2009 low · 2020 pandemic · 2024 peak                         │
└ Source: Wikipedia year lists + editor additions · Method ────────────────┘
Selected year: [◀ 2024 ▶]  (same-route crossfade)
  Week strip: 52 cells, release count per week (calendar heat, ink scale)
  Tracked-hero films this year: FilmTokens with verdict marks
  Month lists (existing, with tokens; collapsed beyond 3 months, "Show all")
Secondary frames: "Average film score by year" (axis 40–60, not 0–100);
                  "Star-led share" (tracked-hero Telugu films ÷ all Telugu theatrical). Ship this only after the definitions are verified.
```
- Kill: the 5-line chart, the "Wikipedia list only" series (move it to the Method/coverage page), the Trends page.

### 4.9 Compare `/compare`

Hero moment: **aligned career reels**, one row per slot, with a toggle [Calendar years | Years since debut]. "Since debut" lines careers up at year 0. This is genuinely new and is the most honest way to compare a 1978 debut with a 2005 debut.
- Default: `?h=` from the URL, else the last-viewed hero + #1, else #1 vs #2. Never alphabetical.
- Slot chips coloured A–D, with "+ Add hero" opening the command palette filtered to heroes.
- Frames: pillar butterfly (2 heroes) or grouped dot-plot (3–4); a metrics table with the winner per row marked by a slot-coloured dot; shared films (co-leads) and shared directors as tokens.

### 4.10 Method `/methodology` and Data `/annexure`

- Publish the recipe: a horizontal 100% bar of weights (Audience 37 · Box office 35 · Form 7 · Fame 10 · Career 11), each segment expandable to its sub-factors with weights from `tolly/heroes.json meta.heroFactors`. Add a worked example for one hero ("Allu Arjun: 71.9 × 0.37 + …") and the ± band explained with a picture.
- Keep one line of the owner's Telugu humour as a pull-quote if they want it, but drop the emoji and the "secret" framing.
- Coverage: real counts (films with a verdict 1,759 of 2,789; with gross 816; with budget 628), presented as a coverage bar per year. One vocabulary ("scored", "provisional", "insufficient") used identically on every page.
- Fix the annexure numbering to match the side-nav.

### 4.11 404, error, loading

- `app/not-found.tsx`: "No film by that name, or any hero." plus the search field, the top 5 Ledger rows and links to Index and Heroes. No intro.
- `app/error.tsx`: a retry button and a link home.
- `loading.tsx` for `/hero/[slug]`, `/director/[slug]` and `/film/[slug]`: header skeleton (avatar disk + 2 lines) and a reel skeleton (grey ticks). The skeleton yields to content through ViewTransition (exit 150 ms / enter 210 ms).

---

## 5. Implementation checklist

Priority: **P0** = broken, misleading, or a blocker for the system. **P1** = core redesign. **P2** = polish.

### A. Foundations and bugs

1. **P0 · `app/globals.css`, `app/page.tsx`**: Delete `.reveal` and `.fill-x` scroll-linked animations and remove every `reveal` class. *Accept:* on `/` at 1440×900 and 390×844, every section's computed opacity is 1 at load, on `/#duel`, and in a full-page screenshot.
2. **P0 · `components/home/intro.tsx`, `lib/intro.ts`, `app/layout.tsx`, `app/globals.css`**: Remove the intro overlay, its guard script and its ~250 lines of CSS. *Accept:* no element with `.intro` in the DOM; LCP element is the H1 on `/`.
3. **P0 · `app/globals.css`, `app/layout.tsx`**: Replace tokens with section 3.1 (light and dark). Add `data-theme` support and a theme toggle in the footer and mobile menu. Use `themeColor` as an array with `media` for light and dark. *Accept:* in a dark-scheme context the body background is `#141110` and all text passes AA.
4. **P0 · `lib/constants/groups.ts`, `components/ui/colour-by.tsx`, every consumer**: Remove "Colour by" and era/family/industry colours from all charts. Grouping becomes a facet (item 41). *Accept:* `grep -r "ColourBySwitch\|ERA_GROUPS.*color"` finds nothing used for fills.
5. **P0 · `components/tolly/tolly-parts.tsx`, `components/dashboard/star-breakdown.tsx`**: Pillar and factor bars become monochrome (`--ink` value, `--rule` track). *Accept:* no more than 2 hues on any hero page outside verdict marks.
6. **P0 · product decision + `components/layout/site-header.tsx`, `app/hero/[slug]/page.tsx`, `app/heroes/page.tsx`**: One headline score (section 2.5). Remove Star Score as a headline and as a nav item. *Accept:* the string "Star Score" appears only as the "Box office" view label or in the Method changelog.
7. **P0 · `next.config.ts`**: Add `redirects()` for `/star-score`, `/rankings` and `/trends` as in section 4.0. *Accept:* each returns 307 to its new location with the query preserved.
8. **P0 · `app/tolly-index/page.tsx`**: Fix the "Not ranked yet" copy to give the real reason per hero (outside the Telugu index / too few rated films), computed from `tolly/heroes.json` `reason`. *Accept:* no hero shows "N of N films rated" next to "too few rated".
9. **P0 · `app/tolly-index/page.tsx`, `components/home/top-films.tsx`, `lib/tolly/top.ts`**: Every "top films" list declares and obeys the same language scope (default Telugu, with a toggle). *Accept:* the same list on Home and on Films gives identical top-5 results for the same setting.
10. **P0 · `lib/data/real/load.ts` (or `scripts/tolly/*`)**: De-duplicate films (same title and year with the same QID or IMDb id; for example the duplicate `RRR` 2022 entry and `Court` / `Court: State vs a Nobody`). *Accept:* a unit test asserts unique (normalised title, year, director) across the snapshot.
11. **P0 · `app/hero/[slug]/page.tsx`, `components/compare/compare.tsx`**: Hide metrics with no data instead of showing "—" rows and cards ("Average audience rating", "X followers", "Audience score — —"). *Accept:* no stat row or card renders where every value is null.
12. **P0 · `components/trends/trends.tsx`, `components/compare/compare.tsx`**: Default selections are the URL first, then the last viewed hero (from `sessionStorage`, try/catch), then Index #1 and #2. *Accept:* fresh `/compare` shows Allu Arjun vs Nani.
13. **P0 · `components/charts/chart-tooltip.tsx`**: Portal and `position: fixed`, flip and clamp logic, z-index above the sticky header and sub-nav. *Accept:* hovering the top-most career mark on `/hero/nani` shows the full tooltip with the title row visible.
14. **P0 · `components/hero/hero-films-table.tsx`**: Rebuild with ≤8 columns that fit 1280 px, with details in an expandable row. Fixes the empty 200 px Kalki row and the clipped "G…" column. *Accept:* no horizontal scroll at ≥1024 px; every row ≤ 64 px when collapsed.
15. **P0 · `components/releases/releases-chart.tsx`**: Replace the multi-line chart with stacked columns (theatrical / dubbed / OTT). Remove the "Wikipedia list only" series. Draw the current year hatched with a "to {date}" label. *Accept:* 2026 is visually distinct and labelled; the legend has 3 items.
16. **P0 · `app/annexure/page.tsx`, `components/annexure/annexure-nav.tsx`**: Make the section numbers match. Reconcile the "0 scored" summary with the vocabulary used elsewhere. *Accept:* side-nav labels equal card labels; the film counts on Home, Method and Annexure use the same definitions and agree.
17. **P0 · `app/not-found.tsx` (new)**: A branded 404 as in section 4.11. *Accept:* `/hero/xyz` renders it with status 404 and no overlay.
18. **P0 · `components/layout/site-header.tsx`**: Mobile menu sheet (focus-trapped, Escape closes, body scroll locked, 48 px rows). Remove the horizontal-scroll nav. *Accept:* all destinations are reachable at 390 px with 2 taps; axe reports no issues.
19. **P0 · `lib/data/real/hero-facts.ts` → `lib/format.ts` (new)**: One formatter module: `inr(cr)` → "₹1,811 cr" (Indian grouping, no "k"), `compact(n)` → "36.4M" (always one decimal under 100M), `pct`, `score` (one decimal, no "/100" in tables), `multiple` → "7.2×", `date` → "28 Apr 2017". *Accept:* `grep "k cr"` finds nothing; every page uses `lib/format.ts`.
20. **P0 · `app/methodology/page.tsx`**: Remove the "secret" framing that contradicts the published weights, and publish the weights (section 4.10). *Accept:* the weights shown on Method equal `tolly/heroes.json meta.heroFactors`.

### B. Design-system primitives

21. **P1 · `components/ui/chart-frame.tsx` (new, replaces `chart-card.tsx`)**: Implement the section 3.4 anatomy: title, finding, tabs, selector, actions (link/PNG/table), legend, source. *Accept:* all charts on the site use it; the `chart-card.tsx` file is deleted.
22. **P1 · `components/ui/use-sliding-indicator.ts` (new)**: The hook from section 3.5, with ResizeObserver, `fonts.ready` and reduced-motion handling. *Accept:* used by nav, tabs, segmented, rail and table rows; the indicator never lands off-target after a resize.
23. **P1 · `components/ui/segmented.tsx`**: Rebuild on the hook. Single style for every toggle (time window, verdict filter, view, tabs): `--surface-2` track, `--surface` pill, 32 px height (40 px on touch). Arrow-key navigation inside the radiogroup. *Accept:* the filled-wine-pill style from `top-films.tsx` and the `heroes` sort chips is gone.
24. **P1 · `components/layout/site-header.tsx`**: Six items with a hover pill that follows the pointer and an active underline that slides on route change. *Accept:* hovering from "Index" to "Years" glides in 180 ms; there is no jump.
25. **P1 · `components/layout/section-rail.tsx` (new)**: Sticky left rail with IntersectionObserver-tracked active state and a sliding bar. A horizontal sticky bar under 1024 px. Clicking scrolls with `scroll-margin-top: 96px`. *Accept:* the active item updates within one frame of a section crossing 40% of the viewport.
26. **P1 · `components/entity/hero-token.tsx`, `film-token.tsx`, `director-token.tsx`, `year-token.tsx` (new)**: Tokens as in section 2.2C. *Accept:* every hero, film, director and year name rendered by the app goes through a token (lint rule or review checklist).
27. **P1 · `components/entity/peek.tsx` + `lib/peek-index.ts` (new, build-time JSON)**: Hover after 300 ms or focus + Space opens the Peek popover. Touch devices navigate directly. Escape closes. Focus returns to the token. *Accept:* the Peek renders in under 16 ms from the in-memory index; no network request on hover.
28. **P1 · `components/search/command-palette.tsx` (new)**: `⌘K`, `Ctrl-K` and `/` open it. Fuzzy search over heroes, films, directors and years (prefix first, then contains; reuse the `hero-search.tsx` logic). Grouped results with tokens, arrow keys plus Enter, recent items. *Accept:* "baahu" returns both Baahubali films first; opening a result morphs the token.
29. **P1 · `components/charts/film-mark.tsx` (new)**: The section 2.2A mark with verdict fill, shape redundancy, log-gross height and an upcoming state. *Accept:* in a greyscale screenshot, hit, average, flop and unknown are distinguishable by shape alone.
30. **P1 · `lib/timeline.ts` (new)**: Shared time scale, ticks, decade lines and hatched current year. *Accept:* every temporal chart imports it; the 2017 tick has the same relative x on all charts of the same width.
31. **P1 · `lib/focus.ts` (new) `useFocus()`**: URL-synced focus store `{hero, director, year, film}` with transient hover vs pinned focus. *Accept:* `?director=s-s-rajamouli` on `/heroes` loads with his films lit.
32. **P1 · `components/charts/tooltip.tsx`**: Arrow, entity header, key/value rows, footer hint, 60/120 ms timing, keyboard parity. *Accept:* the tooltip appears on focus via Tab plus arrows, not only on hover.
33. **P1 · `components/charts/svg-avatar.tsx`, `components/hero/hero-avatar.tsx`**: A neutral monogram fallback (`--surface-2` / `--ink-2`), a 1px ring, a 2px `--accent` ring on focus. *Accept:* no coloured "S"/"TR" disks anywhere.
34. **P1 · `components/charts/label-layout*`**: Greedy 8-position placement, leader lines and drop-on-collision. Vertical dodge for line end labels (≥14 px). *Accept:* zero overlapping label bounding boxes in the scatters at 1440 and 768 (automated check in Playwright comparing `getBBox()` pairs).
35. **P1 · `components/charts/use-tweened-number.ts`, `use-reduced-motion.ts` (new)**: requestAnimationFrame tween for value labels. *Accept:* switching a metric tab tweens labels with no width jitter.
36. **P1 · `components/ui/count-up.tsx`**: Restrict to `num-xl`. Put the real value in an `sr-only` sibling instead of `aria-label` on a span. 600 ms. *Accept:* screen readers announce the final value once.
37. **P1 · `app/globals.css`**: Global numerals `tabular-nums lining-nums`. Remove `.section-kicker`, `.eyebrow`, `.cinema` and `.lift`. *Accept:* the classes are no longer referenced.
38. **P1 · `app/layout.tsx`**: Load JetBrains Mono only where needed, or remove it. *Accept:* one fewer font request on `/`.
39. **P1 · `components/ui/table.tsx` (new)**: Sticky header, a sliding row highlight, sortable headers with a sliding caret plus `aria-sort`, a sticky first column on mobile, edge-fade scroll shadows. *Accept:* used by the Index, Films, Directors, Hero films and Compare tables.
40. **P1 · `components/ui/chart-actions.ts`**: Copy link (with params and anchor, toast "Link copied"), PNG export (serialise the SVG plus title and source onto a canvas at 2×), table toggle. *Accept:* the PNG includes the source line and renders identically in light and dark (exports always use light tokens).
41. **P1 · `components/ui/facet.tsx`**: "Group by" control that produces small multiples or sectioned rows instead of colours. *Accept:* Heroes grouped by family shows labelled sections in one colour.

### C. Charts

42. **P1 · `components/charts/ledger.tsx` (new)**: The Ledger (section 2.3): rows, left block, strip, FLIP reorder on metric change, column hover year rule, brushing, N-of-M selector, mobile expand. *Accept:* switching Index → Box office reorders 10 rows over 360 ms with no remount (React keys stable, checked in the profiler).
43. **P1 · `components/charts/interval-bar.tsx` (new)**: Index ± band on a visible truncated axis (30–80) with ticks. Replaces the axis-less range in `tolly-ranking.tsx`. *Accept:* the axis shows ticks and a label; the band width equals 2 × band.
44. **P1 · `components/charts/dot-strip.tsx` (new)**: Pillar dot-plot (56 dots, focus lit, median tick labelled "typical"). Replaces "Compared with other heroes" and the Star Score breakdown. *Accept:* hovering a dot on one strip lights the same hero on the other four.
45. **P1 · `components/charts/ranked-bars.tsx`**: Monochrome. Value scores use the dot or interval form; counts use bars from 0. Keyed groups with transform transitions. Single-line names. *Accept:* no `color` prop driven by group; a metric switch morphs the bars.
46. **P1 · `components/charts/pareto-chart.tsx`**: Dots for unlabelled points and avatars for labelled ones, median crosshair lines, Pareto frontier drawn and toggled, log option for ₹ axes, axis-switch transition, a "Find hero" input in the frame header. *Accept:* at 390 px, ≤ 12 avatars render; the rest are dots.
47. **P1 · `components/hero/career-chart.tsx` → `components/charts/reel.tsx`**: The career reel with film marks, labels for peaks and extremes, annotation layer (best streak, longest gap, first hit, biggest film), a directors row with cross-highlight, an upcoming film. Remove the connecting polyline. *Accept:* every film is reachable by keyboard; streak annotations match `lib/findings.ts`.
48. **P1 · `app/director/[slug]/page.tsx`**: Use the reel with film labels. *Accept:* each of the 12 Rajamouli marks shows its title on hover and the top 6 by gross are labelled at rest.
49. **P1 · `components/charts/pairings-matrix.tsx` (new)**: Director × hero matrix for `/directors`. *Accept:* cell (EVV, Allari Naresh) reads "8 films · 6 hits" and hovering it lights 8 marks.
50. **P1 · `components/charts/stacked-columns.tsx` (new)**: For Years, with a hatched partial year, annotations and the year-select interaction. *Accept:* clicking a column updates the year panel with a same-route crossfade and the `?year=` param.
51. **P1 · `components/charts/week-strip.tsx` (new)**: 52-week calendar strip of release counts on an ink scale. *Accept:* the cell tooltip lists that week's films as tokens.
52. **P1 · `components/charts/budget-gross.tsx` (new)**: Log-log scatter on `/films` with break-even, ×2 and ×5 lines. *Accept:* films below the diagonal are marked consistently; points use the verdict fill.
53. **P1 · `components/charts/aligned-reels.tsx` (new)**: Compare reels with a Calendar / Since-debut toggle and a morph between alignments (`translateX`). *Accept:* the toggle animates all marks in 360 ms; reduced motion jumps.
54. **P1 · `components/home/head-to-head.tsx`**: Restyle as a pillar butterfly with slot colours. Replace the native selects with a token combobox (palette-backed). Remove "Surprise me 🎲" or render it as a plain text button. *Accept:* the winner per pillar is indicated by the slot dot and bold value; the two bars share one scale.
55. **P2 · `components/charts/sparkline.tsx`**: For Findings and mobile Ledger rows. *Accept:* a 120×24 px viewBox; no axes; the end value is labelled.
56. **P1 · all charts**: Draw-in on first intersection only, SSR final state, `data-enter` set at hydration for below-fold frames only. *Accept:* disabling JavaScript shows complete charts.
57. **P1 · all charts**: Roving tabindex, `role="img"` + `aria-label` summary on the SVG, plus the table toggle as the accessible alternative. *Accept:* axe shows no issues; VoiceOver reads the chart summary sentence.
58. **P2 · `components/charts/*`**: Hatch pattern `<pattern id="partial">` shared through one `<defs>` sprite in the layout. *Accept:* a single definition is reused.

### D. Pages

59. **P1 · `app/page.tsx`**: Rebuild per section 4.1 (H1, Ledger top 10, Findings, Head to head, This year). Delete the podium, tiles, Most followed, scatter, AllGraphs, wall and Go deeper. *Accept:* the page is ≤ 3.5 screens at 1440 and ≤ 6 at 390.
60. **P1 · `lib/findings.ts` (new)**: Compute streaks, perfect directors, release growth and the biggest gross from the data. Each finding carries its evidence links. *Accept:* unit tests; Nani's 8-hit streak (Yevade Subramanyam → Middle Class Abbayi) and Rajamouli's 12/12 match the data.
61. **P1 · `app/tolly-index/page.tsx`**: Explorer (section 4.2) with Table / Ledger / Scatter views, metric tabs and a window segmented control. Include the Rankings metrics as additional columns or tabs. *Accept:* every metric previously on `/rankings` is reachable within 2 clicks.
62. **P1 · `app/tolly-index/page.tsx`**: Hero Peek side sheet (`?peek=`), Escape closes and focus is restored. *Accept:* the browser back button closes the sheet.
63. **P1 · `app/heroes/page.tsx`**: Full Ledger with search, group-by facet, sort and brush. *Accept:* 89 heroes in ≤ 3 screens at 1440.
64. **P1 · `app/hero/[slug]/page.tsx`**: Rebuild per section 4.4. Split the 651 lines into `components/hero/{header,reel-section,standing,films,partners}.tsx`. *Accept:* no half-width cards with empty neighbours; the rail tracks scroll.
65. **P1 · `app/hero/[slug]/page.tsx`**: Prev/next hero by rank with directional view transitions. *Accept:* the `nav-forward` slide plays for "next" only; reduced motion crossfades.
66. **P1 · `app/hero/[slug]/page.tsx`**: "Partners" section listing directors (films, hits, mini strip) and co-leads (tokens). *Accept:* the Prabhas page lists S. S. Rajamouli ×3, 3 hits.
67. **P1 · `app/hero/[slug]/page.tsx`**: "Compare with" suggestions (±2 ranks, same debut era). *Accept:* the links open `/compare?h=a,b`.
68. **P1 · `app/film/[slug]/page.tsx` (new)** + `generateStaticParams`: Film page per section 4.5. *Accept:* the Baahubali 2 page shows three aligned strips with it highlighted; no raw rating or votes anywhere.
69. **P1 · `app/films/page.tsx` (new)**: Films explorer (section 4.6). *Accept:* the "Most efficient" tab applies a ≥ ₹10 cr budget floor with a note.
70. **P1 · `app/directors/page.tsx`**: Ledger of directors + Pairings matrix. Kill the cinema top-cards. *Accept:* the table hit-rate bars are monochrome with an axis.
71. **P1 · `app/director/[slug]/page.tsx`**: Header, reel, heroes-worked-with strips, films table with hero tokens. *Accept:* every hero and film name is a token.
72. **P1 · `app/releases/page.tsx`**: Years per section 4.8. Tracked heroes in cast lists become tokens. Show verdict marks for known films. Collapse the month lists after 3 months behind "Show all". *Accept:* mobile page height ≤ 8 screens by default.
73. **P1 · `app/releases/page.tsx`**: Move the "Average film score by year" frame here (domain 40–60) and delete `components/trends/trends.tsx`. *Accept:* the y-axis domain fits the data with 10% padding.
74. **P1 · `app/compare/page.tsx`, `components/compare/compare.tsx`**: Per section 4.9 (slots, aligned reels, butterfly or dot plot, table, shared films and directors). *Accept:* a URL like `/compare?h=allu-arjun,nani,prabhas` restores the state; the 10 mini cards are gone.
75. **P1 · `app/methodology/page.tsx`**: Weight bar with drill-down, worked example, ± band illustration, coverage per year. *Accept:* the worked example reproduces Allu Arjun's 75.5 within ±0.1.
76. **P2 · `app/annexure/*`**: Apply the system tokens and tables. Data credits remain the only place IMDb or Letterboxd may be named. *Accept:* a grep of rendered HTML outside `/annexure/sources` and `/annexure/photo-credits` finds no "IMDb" or "Letterboxd".
77. **P1 · `app/error.tsx`, `app/hero/[slug]/loading.tsx`, `app/director/[slug]/loading.tsx`, `app/film/[slug]/loading.tsx`**: Skeletons as in section 4.11. *Accept:* the skeleton tick count matches the expected layout; no layout shift (CLS < 0.02).
78. **P2 · `components/layout/site-footer.tsx`**: Simplify to 3 columns (Explore, Data, About) with a plain `--ink` band, the theme toggle and "Data as of". *Accept:* no radial gradients.

### E. Motion and transitions

79. **P1 · `app/layout.tsx`, `app/globals.css`**: Persistent header with `view-transition-name: site-header` and no animation. Default main crossfade (120 ms out / 200 ms in, 8 px rise). *Accept:* during navigation the header pixels do not move (frame capture).
80. **P1 · tokens + hero header**: Wrap `hero-face-{slug}` and `hero-name-{slug}` in `<ViewTransition name share="morph" default="none">` in the Ledger, tokens, Peek and the hero header. *Accept:* clicking a Ledger avatar morphs it into the header avatar (needs prefetched pages; Links prefetch by default).
81. **P1 · film token + film page**: `film-{key}` morph. *Accept:* as above.
82. **P1 · `app/releases/page.tsx`**: Wrap the year panel in `<ViewTransition key={year}>` for a crossfade. *Accept:* switching years crossfades; there is no slide.
83. **P1 · `app/globals.css`**: Motion tokens (section 3.5) and the single reduced-motion block. *Accept:* with reduced motion, sliding indicators jump, there are no transforms during page transitions, and count-ups are off.
84. **P2 · `app/globals.css`**: `::view-transition-image-pair(.morph)` with a 3 px blur at 30% to hide interpolation artefacts. *Accept:* visually smooth avatar morph at 2× DPR.
85. **P2 · Ledger/table**: Sliding row highlight with `transform: translateY`, 180 ms; hidden when the pointer leaves the table. *Accept:* no per-row background transitions.

### F. Accessibility and quality

86. **P0 · all interactive SVG**: Keyboard parity for every hover affordance. *Accept:* every tooltip is reachable via keyboard; this is part of the Playwright a11y test.
87. **P0 · global**: Focus ring `2px solid var(--focus-ring)` with 2 px offset, never removed, visible on the dark footer too. *Accept:* contrast ≥ 3:1 against adjacent colours in both themes.
88. **P0 · verdict encodings**: Shape redundancy (item 29) and text labels in tables. *Accept:* Sim Daltonism / Chrome deuteranopia emulation still distinguishes hit from flop.
89. **P1 · touch targets**: ≥ 40 px for chips and segmented controls, ≥ 44 px for primary controls on mobile. *Accept:* audited at 390 px.
90. **P1 · `components/ui/table.tsx`**: `<caption>` (visually hidden), `scope="col"`, `aria-sort`. *Accept:* axe shows no issues.
91. **P1 · `app/layout.tsx`**: Keep the skip link, restyled. Add `lang="en"` (already present). Wrap Telugu titles in `<span lang="te">` if any Telugu script appears. *Accept:* passes axe.
92. **P1 · contrast**: All text tokens ≥ 4.5:1 and marks ≥ 3:1 (except decorative `--field`), checked by a script in `scripts/check-contrast.mts` run in CI. *Accept:* CI fails on regression.
93. **P1 · `app/globals.css`**: Print styles: hide the header, rail, actions and tooltips; frames on white; charts at 100% width; URL after each link in the footer. *Accept:* printing `/hero/prabhas` to PDF gives a 2–3 page clean report.
94. **P2 · `app/globals.css`**: Thin, themed scrollbars on horizontal table scroll areas only (`scrollbar-width: thin; scrollbar-color: var(--field) transparent`). *Accept:* the page scrollbar is untouched.
95. **P2 · `app/globals.css`**: `::selection` colours. *Accept:* readable selected text in both themes.
96. **P1 · links**: Prose links are `--accent` with a 1px underline at 0.2em offset that thickens to 2px on hover. Tokens have no underline; hover shows the name in `--accent`. *Accept:* links are consistent site-wide.
97. **P1 · scroll restoration**: Next default plus the section rail. Make sure Peek sheets and palette routes use `scroll={false}`. *Accept:* back from a hero to `/heroes` restores the scroll position and focus on the row.
98. **P1 · sticky header**: `[data-scrolled]` hairline after 8 px of scroll. Height 56 (mobile) / 64. *Accept:* `scroll-padding-top` matches the header plus section bar.

### G. Metadata, SEO, assets

99. **P1 · `app/opengraph-image.tsx`, `app/hero/[slug]/opengraph-image.tsx`, `app/film/[slug]/opengraph-image.tsx`**: OG images that render the Ledger row or reel in light tokens with the title. *Accept:* 1200×630 output, under 300 KB, text legible at 50% size.
100. **P2 · `app/icon.svg`, `app/apple-icon.png`**: Monogram "TA." on ink, with a dark-scheme variant. *Accept:* crisp at 16 px.
101. **P2 · `app/sitemap.ts`, `app/robots.ts`**: Ready for when the beta flag lifts (keep noindex now). *Accept:* the sitemap lists heroes, films, directors and years.
102. **P2 · `generateMetadata`** on the hero, film and director pages: title "Prabhas: Tolly Index 71.2 (#4)", plus a description with 2 facts. *Accept:* unique titles on every page.

### H. Data presentation honesty

103. **P0 · all pages**: Never show raw audience ratings or votes, and do not name IMDb/Letterboxd outside data credits. Rename the "Rating" pillar label to "Audience". *Accept:* a rendered-HTML grep test in `tests/` covers every route.
104. **P1 · gross/budget displays**: Show "reported" in tooltips. Show ranges when `low ≠ high` ("₹350–400 cr"). *Accept:* the `budget.low/high` fields are respected.
105. **P1 · suspect values**: A flag list (`lib/data/real/suspect.json`) to hide extreme multiples (>20× with budget < ₹10 cr) from "efficiency" rankings, with a footnote. *Accept:* Geetha Govindam does not top "Most efficient" without a caveat.
106. **P1 · partial-year handling**: Every year-based chart marks the current year "to date". *Accept:* no chart shows 2026 as a decline without the hatch and label.
107. **P1 · sample size**: Ratios with fewer than 5 judged films are shown hollow with an "n=3" label and excluded from rank by default. *Accept:* the scatter's "Include newcomers" toggle controls this consistently across pages.
108. **P1 · single vocabulary**: Verdict names (Blockbuster, Super hit, Hit, Above average, Average, Below average, Flop, Disaster), film states (Scored / Provisional / Too new / Not enough data) and "hit" = hit, super hit or blockbuster, defined once in `lib/constants/results.ts` and used everywhere. *Accept:* the glossary on Method matches the UI strings.

### I. Mobile specifics

109. **P0 · tables**: Sticky first column, edge fade, horizontal scroll hint on first view (a 400 ms nudge of 12 px, once per session, skipped with reduced motion). *Accept:* on the Index table at 390 the hero name stays visible while scrolling.
110. **P1 · Ledger mobile**: Sparkline strip; tapping expands the row to a full strip with labels; one row open at a time. *Accept:* each row is 56 px collapsed; the expanded strip shows ≥ 6 labels.
111. **P1 · charts mobile**: Scatter shows at most 12 avatars, and labels are limited to the top 4 plus focus. Tooltips become a bottom sheet on touch. *Accept:* no tooltip clipped by the viewport at 390.
112. **P1 · section bar mobile**: A horizontal sticky section bar with a sliding underline that auto-scrolls the active item into view. *Accept:* the active item is always fully visible.
113. **P2 · safe areas**: `padding-bottom: env(safe-area-inset-bottom)` for bottom sheets. *Accept:* nothing hides behind the iOS home indicator.

### J. Performance and engineering

114. **P1 · `components/dashboard/dashboard.tsx`**: Delete it after the explorer replaces it (and its demo-mode branch on Home, if demo mode is kept behind a flag). *Accept:* bundle for `/` < 120 KB JS gzip.
115. **P1 · images**: Hero thumbs served at 2× the displayed size (48 px for 24 px avatars) in WebP, with `width` and `height` attributes set. *Accept:* no layout shift from avatars; LCP < 1.8 s on the throttled profile.
116. **P1 · `lib/peek-index.ts`**: Generated at build (heroes, films, directors, years), about 150 KB, loaded lazily on first hover or palette open. *Accept:* not in the initial bundle.
117. **P2 · Playwright visual tests (`tests/`)**: Snapshots of Home, Index, Hero, Film, Years and Compare at 1440 and 390 in light and dark. *Accept:* the CI job is green.
118. **P2 · `tests/`**: Label-overlap test (item 34), opacity-at-load test (item 1), IMDb grep test (item 103). *Accept:* all three run in CI.

### K. Small details that make it feel finished

119. **P2**: Hover on a Ledger strip column shows a 1px `--rule` year rule plus the year token chip on the axis. *Accept:* it follows the pointer at 60 fps.
120. **P2**: Sortable headers show a caret only on the active column and on hover. The idle "↕" glyphs are removed. *Accept:* clean headers.
121. **P2**: Empty states for filters ("No flops in this window. Good for him.") in muted text with a "Reset filters" link. *Accept:* every filterable view has one.
122. **P2**: Toast system (copy link, CSV downloaded), bottom-centre, 2.4 s, `role="status"`. *Accept:* one component.
123. **P2**: "Data as of 25 Nov 2026" with a relative time ("2 days ago") in the header area of Index and Years. *Accept:* computed from `tollyMeta.asOf` and `releasesAsOf`.
124. **P2**: Keyboard shortcuts: `⌘K` search, `g i` Index, `g h` Heroes, `[`/`]` previous/next hero on hero pages, `?` opens the shortcut sheet. *Accept:* the shortcuts are listed in the sheet.
125. **P2**: Number alignment: right-aligned numeric columns with tabular figures and units in the header ("Gross, ₹ cr"), not repeated per cell. *Accept:* no "/100" or "cr" repeated in table cells.
126. **P2**: Avatar image fade-in (opacity 0→1 over 160 ms on load) over the monogram fallback. *Accept:* no flash of a broken image.
127. **P2**: `text-wrap: balance` on H1/H2 and `text-wrap: pretty` on paragraphs. *Accept:* no single-word last lines in titles.
128. **P2**: Hero photo credit shown on hover over the header avatar plus in the facts list. *Accept:* the CC attribution is preserved on every page that shows a photo large.

---

## 6. My bar for "done" (1.5× AA)

I would sign off when all of these are true:

1. **One answer.** Every page agrees on who is No. 1, on how many heroes are ranked and on how many films are scored. A first-time visitor never sees two scores fighting.
2. **The linking test.** From any number on any page I can reach the films behind it in one click, and from any film I can reach its hero, director and year in one click. I hover a director anywhere and his films light up in whatever chart I am looking at. If I can find a film title that is not a token, it is not done.
3. **The grey test.** Screenshot every page in greyscale: verdicts are still readable by shape, focus is still obvious, and nothing was relying on a rainbow. In colour, there are at most three hue families on any screen (ink, accent, verdict ramp) except on Compare.
4. **The motion test.** With a frame-by-frame capture: nav, tabs, segmented controls, rail and table rows all use the same sliding indicator with the same easing. Metric switches morph and reorder bars and never re-mount them. A Ledger avatar morphs into the hero header. The header never moves during navigation. Reduced motion removes all of it cleanly. Nothing is ever invisible at rest.
5. **The chart craft test.** No label overlaps (automated). Every axis is labelled with units. Every partial year is marked. Log scales are used where the data spans orders of magnitude. Every chart has link, PNG and table actions and a source line. Tooltips are never clipped and work from the keyboard.
6. **The mobile test.** Every page is usable one-handed at 390 px. The Ledger works as expandable rows, tables keep the first column sticky, there are no clipped controls, and no page is taller than about 8 screens by default.
7. **The honesty test.** No raw ratings or vote counts and no IMDb/Letterboxd mentions outside data credits (automated grep). Every Finding is computed from data and links to its evidence. Suspect values carry caveats. The methodology publishes the real weights and a worked example that reproduces a score.
8. **The template test.** Show the site to someone who has seen 50 AI-generated dashboards. They cannot point at a single eyebrow + serif + subtitle card stack, icon-in-circle grid, podium, gradient banner or pill-everything row. They can say in one sentence what makes it look like this site: "every film is a tick on the same timeline."
9. **Quality gates:** axe clean on all routes in both themes. Lighthouse (mobile) Performance ≥ 90, Accessibility 100, CLS < 0.02. Visual regression suite green at 1440 and 390 in light and dark.

AA wins on consistency: one chart frame, one selector, one motion language, used everywhere. Matching it means doing the same. Getting to 1.5× means adding what AA's domain does not need and this one does: a shared atom (the film), a shared spine (time) and a shared focus state that makes every view a lens on the same data. When those three are in place and the details above are clean, it is done.

---

## Appendix: data gems verified in `lib/data`

| Gem | Value | Source |
|---|---|---|
| Longest hit streak (Telugu hero) | **Nani, 8 in a row**: Yevade Subramanyam → Middle Class Abbayi | `real/snapshot.json` credits + verdicts |
| Other streaks | Nagarjuna 7 (Santosham → Sri Ramadasu); Vijay 9 (Theri → Jana Nayagan, Tamil, outside the index) | same |
| Longest runs without a hit | Vijay Deverakonda 7, Jagapathi Babu 7, Nithiin 6 (present neutrally, if at all) | same |
| Perfect directors | S. S. Rajamouli 12/12 hits (2001–2022, 8 different heroes); Anil Ravipudi 9/9 | `/directors` data |
| Most prolific pairing | E. V. V. Satyanarayana × Allari Naresh, 8 films / 6 hits | computed |
| Biggest reported grosses | Baahubali 2 ₹1,810.6 cr; Pushpa 2 ₹1,800 cr; RRR ₹1,387 cr; Kalki 2898 AD ₹1,100 cr | snapshot `gross.high` |
| Release growth | 70 (2009) → 271 (2024); 2020 fell to 72; 2026 is 176 to 25 Nov | `releases/releases.json` |
| Rise of dubbed films | 2 (2000) → 26 (2022), about 19% of that year's releases | same |
| Coverage | verdicts for 1,759 of 2,789 films; gross for 816; budget for 628 | snapshot |
| Data issues to fix first | duplicate `RRR` 2022 and `Court` 2025 entries; "soundtrack" in genres; Geetha Govindam budget ₹5 cr (26× multiple) needs checking | snapshot |
