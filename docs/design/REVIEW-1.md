# Review round 1: Tollywood Analysis redesign ("The Ledger")

**Scope.** I reviewed the production build at `localhost:3100` on 27 Nov 2026 (data as of 25 Nov 2026) at 1440×900 and 390×844, in light and dark, with reduced motion, by keyboard, mid-transition and with data spot checks.

**Pages covered.** `/`, `/tolly-index` (all three views), `/heroes`, `/hero/{prabhas,nani,allari-naresh,suriya}`, `/film/{baahubali-2-the-conclusion-2017,rrr-2022}`, `/films`, `/directors`, `/director/s-s-rajamouli`, `/releases`, `/compare`, `/methodology`, `/hero/xyz` and the redirects.

**Evidence.** Screenshots are in `(screenshots not kept)`. Files named `ix-*` are the interaction captures.

**Taken as given.** The weights stay secret, the methodology keeps its Telugu humour, and the Tolly Index is the only headline score. None of these are counted as defects.

---

## 1. Verdict

**Sign off as "1.5× Artificial Analysis" today: No.**

This is a different product from the one I audited. The template look is gone. There is a real system: one film mark, one 2000–2026 spine, entity tokens, a sliding-pill grammar and a dark mode that works. The Films budget-vs-gross chart, the hero "Where he stands" dot strips, the Tolly Index scatter with its frontier, the film page "Where it sits" funnel and the directors pairing matrix are all at or above AA quality.

It is not 1.5× yet, for three reasons:

1. **The signature view is dead to the touch.** On the Ledger (Home, Index and Heroes) the film marks have no tooltip and no click target. Hovering or clicking Pushpa on Allu Arjun's row does nothing. The linking idea works on hero and film pages but not in the view that is supposed to carry it.
2. **The "two scores" problem has come back under a new name.** `/star-score` now lands on a "Box office score" in which Jr NTR is No. 1 with 82.5 and Prabhas has 77.6. Everywhere else (table, hero page, head-to-head) Prabhas's "Box office" is 83.6–84 and Allu Arjun's is 84.6–85. Also, the home page says 1,467 scored films and the film page says 1,473.
3. **Visible breakages.**
   - `/directors` has about 4,400 px of blank page after the footer (6,400 px on mobile). Home has about 200 px.
   - The mobile Index table header collapses to one word per line.
   - The mobile head-to-head card is clipped on the right.
   - Rows in the Ledger re-sort pass through each other with overlapping text.
   - "₹5,046 cr" wraps onto two lines in every Box office row.
   - Header ticks collide with the column labels ("INDEX 30", "80 2000", "100%2000").

| Dimension | Score /10 | One-line reason |
|---|---|---|
| Visual quality | **7.5** | Calm, typographic, coherent in light and dark. Let down by the chip walls on hero pages, header tick collisions, the wrapped value column, and the cramped "Not ranked yet" rows. |
| UX | **6.5** | Search, the sliding sub-nav, prev/next and tokens are good. But Ledger marks are inert, there are 849 tab stops on `/directors`, the second hero is hidden on mobile Compare, the search box keeps the old query, and box-office numbers conflict. |
| Chart craft | **7.5** | Films scatter, dot strips, scatter frontier, year columns and the pairing matrix are excellent. The Ledger's Box office tab uses a dot for a sum, the hero films table has a decorative mini-track with no axis, and reel labels are truncated with room to spare. |
| Motion | **6.0** | Nav pill, segmented pills and the avatar morph all work. Re-sorts overlap text mid-flight, the headline count-up restarts from 0 on every hero (Nani passes through "32.9" at #2), and there are no draw-ins or tooltip choreography on the Ledger. |

---

## 2. Remaining defects and missed opportunities

Priority key:
- **P0** = broken, misleading or contradicts the system.
- **P1** = clearly below the bar.
- **P2** = polish.

File paths are my best attribution from the class names and `docs/design/SYSTEM.md`. Verify each before editing.

### A. Data correctness and consistency

1. **P0 · `/tolly-index?view=boxoffice` (the `/star-score` target), `/tolly-index?view=table`, `/hero/*`, Home head-to-head · `lib/ledger-metrics.ts`, the index explorer table component, `lib/tolly/view.ts`**
   - **Problem.** "Box office score" in the Box office tab is the old Star Score (Jr NTR 82.5, Allu Arjun 81.1, Prabhas 77.6, Nani 80.9). The "Box office" pillar elsewhere is different (Prabhas 84 in the table, 83.6 on his page; Allu Arjun 85 / 84.6; Nani 81 / 81.3).
   - **Fix.** Pick one source: the Tolly Index box-office pillar from `tolly/heroes.json` `factors`. Show it in the Box office tab, sorted by that value. The tab's other columns (success %, blockbusters, ₹100-cr films, totals, biggest, per film, recent) stay as raw facts. If the old Star Score must survive, it cannot be called "Box office".
   - **Accept.** For every hero, "Box office" is the same number to one decimal on the Index table, the Box office tab, the hero page, Compare and the home head-to-head. No column on the site is headed "Box office score" unless it is that number.
2. **P0 · Home intro vs film page · `app/page.tsx`, `app/film/[slug]/page.tsx`**
   - **Problem.** Home says "1,467 scored films". Baahubali 2's page says "#5 of all 1,473 scored films".
   - **Fix.** Use one definition (`status === "complete"`, 1,467) or label the second one explicitly (e.g. "scored and provisional").
   - **Accept.** The same number appears on Home, Method and every film page.
3. **P0 · `/films` "Telugu originals" · `lib/ledger.ts` (language classification)**
   - **Problem.** Tamil films are counted as Telugu originals. Sivaji: The Boss (2007), Snehithudu (Nanban, 2012) and Deiva Thirumagal (2011) appear in the Telugu-originals ranking because the snapshot lists `languages: ['Tamil','Telugu']`, and "includes Telugu" is treated as "Telugu original".
   - **Fix.** The original language is `languages[0]` (Wikipedia lists the original first). A film is Telugu-original only when that is Telugu, or for true bilinguals on an editor allow-list (`lib/data/real/bilinguals.json`, e.g. Baahubali, Ghazi).
   - **Accept.** Sivaji, Snehithudu and Deiva Thirumagal are absent from "Telugu originals" and present under "All languages". The intro counts (1,362 / 320) are recomputed.
4. **P0 · `/film/baahubali-2-the-conclusion-2017` "Best of 2017" · `lib/ledger.ts` de-dupe**
   - **Problem.** Ghazi is listed with heroes "Priyadarshi, Rana Daggubati". There is a second, empty Ghazi 2017 record in `tolly/films.json` (hero `priyadarshi`, no pillars, no snapshot data) that is being merged in.
   - **Fix.** Drop records with no snapshot match and no pillars. De-dupe by normalised title + year, keeping the record with a QID.
   - **Accept.** Ghazi shows only Rana Daggubati. A unit test asserts that no film has two records.
5. **P1 · Film page "Best of {year}" · `app/film/[slug]/page.tsx`**
   - **Problem.** It mixes Tamil and Malayalam films (Mersal, Theeran, Thondimuthalum) into the ranking without saying so, while `/films` defaults to Telugu originals.
   - **Fix.** Default to Telugu originals, with a small "All languages" toggle (same Segmented component). Sentence: "ranks first of N Telugu films that year".
   - **Accept.** Same scope and wording as `/films`.
6. **P1 · Gross ranges shown inconsistently · `lib/format.ts` callers in `/films`, director films table, Home findings, Compare**
   - **Problem.** `/films` shows RRR as ₹1,300 cr and Sivaji as ₹125 cr (the low figure). The hero films table shows ranges ("₹1,042–1,100 cr"). Home finding 04 says "Pushpa 2 (₹1,642 cr)", but the data range is ₹1,642–1,800 cr.
   - **Fix.** Add `inrRange(low, high)` and use it everywhere a single film's gross or budget is shown. Sort and rank by `high` (or midpoint, documented on Method).
   - **Accept.** Pushpa 2 reads "₹1,642–1,800 cr" on Home, `/films`, the Allu Arjun page and Compare. No page shows a bare low figure when `low ≠ high`.
7. **P1 · Hero headline "₹X cr reported gross" · hero header component (`components/hero/header*`)**
   - **Problem.** Allari Naresh shows "₹28 cr reported gross" for a 59-film career, which is 4 films with a figure. Rajinikanth's totals are ₹125 cr everywhere (one Telugu-version film), which looks wrong to any reader.
   - **Fix.** Always qualify, as the director page already does: "₹28 cr from 4 films with a reported gross". For non-Telugu-industry heroes: "Telugu releases only". Hide the total when fewer than 3 films have a figure.
   - **Accept.** No total gross appears on the site without its "from N films" qualifier. This includes the Index table Gross column (add the n as a small muted number) and Compare.
8. **P1 · `/tolly-index` "Outside the Telugu index", `/heroes` intro · copy in `app/tolly-index/page.tsx`, `app/heroes/page.tsx`**
   - **Problem.** The copy says Tamil, Malayalam and Kannada stars "are not ranked against Telugu heroes while their Telugu box-office records are checked". Yet Rajinikanth (#6) and Dulquer Salmaan (#13) are ranked, and the Heroes intro calls all 56 "Telugu heroes".
   - **Fix.** Say "56 heroes in the Tolly Index, including Rajinikanth and Dulquer Salmaan, whose Telugu records are checked". Show a small "Tamil" or "Malayalam" tag next to their names in the Ledger and table.
   - **Accept.** No sentence on the site contradicts who is ranked.
9. **P1 · `/directors` header stats · `app/directors/page.tsx`**
   - **Problem.** "RANKED 74 from 4 judged films" reads as "ranked 74th". The intro says "the 126 with three or more", the ledger says "ranked once 4 of their films have a known result", and "Show all 126" appears below.
   - **Fix.** Use "74 directors ranked · at least 4 films with a result". Make the intro say "126 directors with three or more films; 74 have enough results to rank". Unranked directors render below a divider without a rank number.
   - **Accept.** One rule, stated once, matching the list.
10. **P1 · Directors intro "593 directors made 1,239 Telugu films" vs `/films` "1,362 Telugu films"**
    - **Fix.** Add "(123 films have no director on record)", or reconcile the counts.
    - **Accept.** The numbers add up on screen.
11. **P1 · Most efficient / Most loved tables on `/films`**
    - **Problem.** Geetha Govindam still shows "₹5 cr → ₹132 cr, 26×" with no caveat (brief item 105).
    - **Fix.** Add a suspect flag list and a footnote marker "†" with a tooltip: "Reported budget looks low; multiple shown for reference". Exclude flagged films from "Most efficient".
    - **Accept.** Geetha Govindam is not ranked in Most efficient, and the 26× carries the marker wherever it appears.

### B. Layout breakages

12. **P0 · `/directors` blank scroll after the footer (also Home, about 200 px) · `components/charts/ledger.tsx`**
    - **Problem.** Ledger rows are absolutely positioned (`div.absolute inset-x-0 top-0 … transition-opacity`) and translated down. Rows hidden behind "Show all 126/56" still extend the document. Measured: `/directors` document is 7,530 px but the footer ends at 3,162 px (mobile: 11,032 vs 4,634). Home is 3,771 vs 3,564.
    - **Fix.** Do not render rows beyond the visible count. Or give the Ledger body an explicit height and `overflow: clip` (`contain: paint`). Collapsed rows must also be `inert` / `visibility: hidden` so they leave the tab order.
    - **Accept.** On every page at both widths, `document.documentElement.scrollHeight` equals the footer's bottom edge (±1 px).
13. **P0 · `/tolly-index?view=table` mobile header · ChartFrame header layout (`components/ui/chart-frame.tsx`)**
    - **Problem.** The frame description is squeezed beside the view toggle and wraps to one word per line, about 300 px tall (`ix-m-table.png`).
    - **Fix.** Below 640 px, stack the title, the description at full width, then the controls. `aside` drops under the text.
    - **Accept.** At 390 px the description is at most 4 lines and spans the frame width.
14. **P0 · Home head-to-head, mobile · `components/home/head-to-head.tsx`**
    - **Problem.** The card and the "The bars share one scale…" paragraph overflow the right edge ("For every number sid" is cut, and the card's right border is missing; `home-m-03/04`).
    - **Fix.** Make the grid column `minmax(0,1fr)`, remove fixed widths on the avatar and score cluster, and let the paragraph wrap.
    - **Accept.** At 360/390/414 px no element's right edge exceeds viewport − 16 px.
15. **P1 · Ledger value column wraps ("₹5,046 / cr") · `components/charts/ledger.tsx`, `lib/ledger-metrics.ts`**
    - **Fix.** Put the unit in the column header ("Gross, ₹ cr") and show bare tabular numbers in the cells. Or widen the column to fit "₹5,046 cr" and add `white-space: nowrap`.
    - **Accept.** No value cell is ever on two lines, for any metric, at ≥ 1024 px.
16. **P1 · Ledger and directors header tick collisions · `components/charts/ledger.tsx`**
    - **Problem.** "TOLLY INDEX 30", "80 2000" and "100%2000" render touching.
    - **Fix.** Put the axis ticks on their own header row, aligned to the interval column, with 16 px of gutter before the timeline. Set the first and last ticks with `text-anchor: start` and `end`.
    - **Accept.** At least 8 px between any two header labels (automated bbox check).
17. **P1 · `/tolly-index` "Not ranked yet" rows**
    - **Problem.** The right column wraps "44 / films / ·" across three lines and the reason text runs to 3–4 lines, so rows are uneven.
    - **Fix.** Use a 2-row cell: line 1 "44 films", line 2 "22 of 42 judged films scored (52%) · 90% needed", truncated with a full-text tooltip. Give the progress bar a fixed width and put the label on it.
    - **Accept.** All rows have the same height (56 px) at 1440.
18. **P1 · `/compare` mobile "Every number" table**
    - **Problem.** Only the first hero's column is visible. Nani's is off-screen in an unmarked horizontal scroll.
    - **Fix.** At under 640 px, render each measure as a row with two stacked values (slot dot + value), or use `table-layout: fixed` with two 30% value columns and a measure column that wraps.
    - **Accept.** At 390 px both heroes' values are visible without scrolling.
19. **P1 · `/hero/[slug]` director chip wall · reel section component**
    - **Problem.** Allari Naresh gets 39 pill chips (4 rows) and Nani gets 26. It is the "pills everywhere" pattern again and pushes the reel's annotations below the fold.
    - **Fix.** Replace the chips with a **directors lane** directly under the reel axis. Each director with 2 or more films becomes a labelled horizontal track with his marks lit, so the lane shares the reel's x-axis. List the 1-film directors as an inline comma list (as "Partners" already does). On desktop, show the top 6 lanes plus "and N more".
    - **Accept.** The hero reel section is no taller than 560 px at 1440 for every hero, and hovering a lane lights the marks above.
20. **P2 · Home head-to-head desktop**
    - **Problem.** The left column (title + 2 paragraphs) leaves a 300 px void under it, beside a tall card.
    - **Fix.** Fill the void with a sticky "Pick a pair" list of 4 suggested duels (#1 vs #2, Prabhas vs Mahesh, Chiranjeevi vs Balakrishna, Nani vs Vijay Deverakonda) as token pairs. Or narrow the grid to 1fr / 1.6fr.
    - **Accept.** No empty block taller than 120 px.
21. **P2 · `/methodology` "Rules that keep it fair"**
    - **Problem.** The paragraphs are indented 24 px with no marker, so it reads as a misaligned list.
    - **Fix.** Use numbered markers in `--muted` tabular, or remove the indent.
    - **Accept.** The text aligns with the section heading or has a visible marker.
22. **P2 · `/hero/allari-naresh` 1440 overflow**
    - **Problem.** A `span.underline…` reaches x = 1477 (clipped).
    - **Fix.** Add `min-w-0` / `break-words` to the token list container.
    - **Accept.** No element's right edge exceeds 1440 − 32.
23. **P2 · Index table "Best film" column**
    - **Problem.** Titles truncate ("Pushpa: The…", "Baahubali 2: …") while the year column takes 40 px.
    - **Fix.** Drop the year into the tooltip, or set the year in `--muted` below the title, and give the title the width.
    - **Accept.** The top 20 best films show untruncated at 1440.

### C. The linking idea: interaction gaps

24. **P0 · Ledger marks inert (Home, `/tolly-index`, `/heroes`, `/directors`) · `components/charts/ledger.tsx`, `film-strip.tsx`**
    - **Problem.** Hovering a mark only highlights the row. There is no tooltip, and clicking does nothing (verified on Allu Arjun → Pushpa). The DOM has 0 `a[href^="/film/"]` on `/tolly-index` and `/heroes`.
    - **Fix.** Reuse `FilmTip` / `FloatTip` from the hero reel. Pointer hover over a mark (hit area ≥ 8 px wide via an invisible rect) shows the film token, date, result, gross and score. Click opens the film. Shift-click pins the focus.
    - **Accept.** On every Ledger row, hovering any mark shows its tooltip within 80 ms and clicking navigates to `/film/<slug>`.
25. **P0 · Ledger keyboard: 2 tab stops per row (link + `svg`), 849 stops on `/directors`, about 220 on `/tolly-index`**
    - **Fix.** One tab stop per Ledger (roving tabindex):
      - ↑ / ↓ moves between rows; ← / → moves between marks in the row, with the tooltip following.
      - Enter opens the film or hero; Home / End jump to the first or last row.
      - The hero link stays a normal link, but the strip `svg` gets `tabindex="-1"` until the roving cursor enters it.
    - **Accept.** `/directors` has fewer than 120 tab stops, and every film is reachable by keyboard.
26. **P1 · Cross-highlight on the Ledger · `components/charts/focus.tsx`**
    - **Problem.** "Light up a director" exists on `/heroes` but not on Home or `/tolly-index`. Hovering a director anywhere does not light the Ledger.
    - **Fix.** Wrap every page that holds a Ledger in `FocusProvider`. Add the director/year picker to the Index Ledger frame header. Make findings ("12 for 12") hover-light the matching marks in the Ledger above.
    - **Accept.** On Home, hovering finding 02 lights Rajamouli's 12 films across the top-10 rows.
27. **P1 · Compare reels and the directors pairing matrix: marks not linked (0 film links on `/compare`) · `components/charts/aligned-reels*`, `pairings-matrix*`**
    - **Fix.** Give them the same tooltip and click as item 24. Clicking a matrix cell pins the director + hero focus and scrolls the Ledger above to those rows.
    - **Accept.** Every film mark on `/compare` and `/directors` opens its film.
28. **P1 · Year columns (`/releases`, Home) do not link to tracked films**
    - **Fix.** Make a year column's tooltip list the top 3 tracked films that year as tokens. Clicking a column sets `?year=` (works) and scrolls to the panel.
    - **Accept.** The tooltip shows the count split plus 3 film tokens.
29. **P2 · `/releases` list · year page list component**
    - **Problem.** Every untracked director gets a monogram square (several hundred per year), which is visual noise. Some tracked-hero films lack a mark (e.g. "Aakasamlo Oka Tara", Dulquer Salmaan, 20 Nov) while others have a 6 px dotted glyph that reads as a rendering speck.
    - **Fix.** Use monograms only for directors with a page and plain text for the rest. Show marks only for films in the ledger. For "too recent", use the word "New" in `--muted` instead of a 6 px dotted glyph.
    - **Accept.** The list looks like a clean schedule, and every tracked-hero film has a consistent marker.
30. **P2 · Director page films table**
    - **Problem.** Titles are links but have no `MiniMark`, unlike every other films table.
    - **Fix.** Use `FilmToken`.
    - **Accept.** Visual parity with the hero films table.

### D. Chart craft

31. **P1 · Ledger "Box office" tab encodes a sum (total gross) as a dot on a 0–6k line**
    - **Problem.** This contradicts SYSTEM.md: sums use bars from zero. The tab name also clashes with the 0–100 "Box office" pillar.
    - **Fix.** Rename the tab "Gross" and draw a horizontal bar from 0, in `--ink`. Keep "Box office" for the pillar (0–100, dot on a 30–100 axis like the index).
    - **Accept.** No two tabs or columns named "Box office" mean different things.
32. **P1 · Hero films table "Film score" mini-track · `components/hero/*films*`**
    - **Problem.** A 30 px track with a dot and no axis is decoration.
    - **Fix.** Either give the column header a shared 40–90 axis (ticks in the header, the same scale for every row) or remove the track and keep the number.
    - **Accept.** No scale-less glyph remains.
33. **P1 · Hero films table, empty columns**
    - **Problem.** For pre-2015 careers, Gross, Budget and × are mostly "—" (three columns of dashes on Allari Naresh).
    - **Fix.** Merge them into one "Gross / budget" cell ("₹451 cr on ₹350 cr · 1.3×"), and hide the column when fewer than 20% of rows have data.
    - **Accept.** No column is more than 80% dashes.
34. **P1 · Reel labels truncated with space available ("Baahubali: The Begin…", "Salaar: Part 1 – Cea…") · `film-strip.tsx` label layout**
    - **Fix.** Measure the text and allow up to 28 characters. Place labels on 3 tiers before truncating, with collision checks against neighbours rather than a fixed character cap.
    - **Accept.** Prabhas's six labelled films show full titles at 1440.
35. **P1 · Ledger re-sort overlap · `ledger.tsx` FLIP**
    - **Problem.** At 120 ms, rows cross with full-opacity text on top of each other ("Prabhas/Jr NTR", "₹2,513 cr" over "₹4,660 cr"; `ix-resort-120.png`).
    - **Fix.**
      - Rows that move more than 2 positions drop to 0.35 opacity during the move. The row's text column moves with the row, but the value label crossfades to the new value at the end.
      - Stagger by target index (12 ms) and cap the duration at 320 ms.
      - The moving rows' z-index follows direction: rising rows go above falling rows.
    - **Accept.** Frame captures at 80 / 160 / 240 ms show no two full-opacity labels overlapping.
36. **P2 · Ledger hatched "running year" block**
    - **Problem.** It is drawn on every row, including retired heroes. It is visually heavy across 56 rows.
    - **Fix.** Draw the hatch once in the header and as a faint `--grid` column in the rows.
    - **Accept.** Rows show the 2026 column as a tint, not 56 hatches.
37. **P2 · Index scatter (`?view=scatter`)**
    - **Problem.** The default axes are "Reported gross × Audience", and the 10 heroes without gross are dropped silently except in the legend count.
    - **Fix.** Add a muted rail of dots at the bottom-left labelled "no reported gross (10)", with tooltips.
    - **Accept.** All 56 heroes are reachable in the scatter.
38. **P2 · Dot strips "Fame 8th of 51" vs "of 56" elsewhere**
    - **Fix.** Add "(5 heroes have no follower data)" to that row's caption.
    - **Accept.** The denominator change is explained in place.
39. **P2 · Films scatter labels ("Sivaji: The Boss" over "Eega", "Arjun Reddy" touching a dot) · budget-gross chart label layout**
    - **Fix.** Run the same collision pass as the Index scatter, with leader lines.
    - **Accept.** No label bbox overlaps another label or a ringed point.
40. **P2 · Years week strip (`/releases`)**
    - **Problem.** The grey ramp has 5 steps but the legend shows them without numbers.
    - **Fix.** Label the legend steps "0 · 1–2 · 3–4 · 5–6 · 7+".
    - **Accept.** The legend has numeric bins.
41. **P2 · Home "2026 so far" mini columns**
    - **Problem.** The OTT series is a hairline that cannot be seen.
    - **Fix.** Fold OTT into "Telugu films" for the mini chart, with the split in the tooltip. Keep 3 series only on `/releases`.
    - **Accept.** The mini chart legend has 2 items plus "so far".

### E. Motion

42. **P1 · Hero headline count-up restarts from 0 on every hero navigation · `components/ui/use-tween.ts`, hero header**
    - **Problem.** Nani's page shows "32.9" next to "#2 of 56" mid-flight (`ix-nav-160.png`).
    - **Fix.** On client navigation between heroes, tween from the previous hero's index to the new one (store the last value in a module-level ref). On a first or hard load, show the final value immediately or count from axis min (30), never from 0.
    - **Accept.** No frame shows an index below 30 for a ranked hero.
43. **P1 · Ledger draw-in · `use-enter.ts`**
    - **Problem.** The Ledger appears all at once while hero reels draw in.
    - **Fix.** On first view only (below the fold at hydration), grow the marks left to right by date (stagger proportional to x, total 500 ms). Rows above the fold render final.
    - **Accept.** Matches the reel; never hidden at rest; off with reduced motion.
44. **P1 · Shared-element morph covers only the face**
    - **Fix.** Add `view-transition-name` for the hero name (`name-<slug>`) and the index number (`score-<slug>`) from Ledger row to hero header. Add film title morphs from tokens to the film H1 (brief items 80–81).
    - **Accept.** Clicking a Ledger row visibly morphs avatar, name and score into place.
45. **P1 · Avatar morph flies over the sticky sub-nav (`ix-nav-160.png`)**
    - **Fix.** Give the morph group `z-index` above content but below the header. Set `::view-transition-group(face-*)` with `animation-timing-function: var(--ease-in-out)` and a 380 ms duration so it lands before the page fade ends.
    - **Accept.** No frame shows the avatar overlapping the "Career reel" tab label for more than 80 ms.
46. **P2 · Search palette keeps the previous query after Escape and reopen ("baahu" + "raja" = "baahuraja")**
    - **Fix.** Clear the query on close, or select-all on open.
    - **Accept.** Reopening shows an empty field (or a selected previous query) and typing replaces it.
47. **P2 · Search palette open/close**
    - **Fix.** Scale 0.98 → 1 plus fade over 160 ms, backdrop fade over 200 ms. Close at 120 ms. Instant with reduced motion.
    - **Accept.** Frame capture shows the transition.
48. **P2 · Year switch on `/releases`**
    - **Fix.** Confirm the `<ViewTransition key={year}>` crossfade exists. The ◀ ▶ buttons need accessible names ("Previous year, 2025") and keyboard shortcuts `[` and `]`.
    - **Accept.** Screen reader announces the target year, and the crossfade is visible.
49. **P2 · Tooltip choreography**
    - **Fix.** Tooltips glide between adjacent marks (transform transition 90 ms) instead of re-mounting.
    - **Accept.** Moving across a reel shows one tooltip sliding, not flicker.

### F. UX details

50. **P1 · Index table header "HERO ↑" sort**
    - **Problem.** It sorts by rank, which equals the default, so the click appears to do nothing.
    - **Fix.** The Hero column sorts A–Z; the "#" sub-label is a separate rank sort.
    - **Accept.** Clicking Hero alphabetises the table.
51. **P1 · Native `<select>` in the home head-to-head and the scatter axis pickers**
    - **Fix.** Replace with a token combobox backed by the search index: type to filter, avatars in the options.
    - **Accept.** Keyboard and type-ahead work, and the visuals match the palette.
52. **P1 · `/heroes` "Light up a director" input**
    - **Problem.** Placeholder only, with no list of suggestions on focus.
    - **Fix.** On focus, show the top 8 directors by films with tracked heroes.
    - **Accept.** One click lights a director without typing.
53. **P1 · Ledger "Show all 56"**
    - **Problem.** It expands in place with no "Show fewer" or scroll anchor.
    - **Fix.** Toggle the label to "Show top 10", keep the scroll position anchored to the button, and add `aria-expanded`.
    - **Accept.** Collapsing returns the viewport to the button.
54. **P2 · Hero reel annotation wording on mobile**
    - **Problem.** "FIRST HIT · Film 3" and "LATEST FILM · Flop" set the verdict or ordinal as the big text, which reads oddly.
    - **Fix.** Make the big text the film title and put the verdict small: "Varsham · 2004 · his 3rd film".
    - **Accept.** The large type in annotations is always a film title or a number with a unit.
55. **P2 · 404 highlights "Heroes" in the nav for `/hero/xyz`**
    - **Fix.** No active nav item on `not-found`.
    - **Accept.** No active pill on 404.
56. **P2 · Home stat strip "UPDATED 25 Nov 2026 · every week"**
    - **Fix.** Use a relative time ("2 days ago"), with the absolute date in `title`.
    - **Accept.** The relative date is shown, and it is correct.
57. **P2 · `/compare` "What they share" empty state**
    - **Problem.** It takes 200 px to say "nothing".
    - **Fix.** Collapse it to one line ("No films or directors in common") when both lists are empty, and offer "Try Allu Arjun vs Ram Charan" (a pair that does share).
    - **Accept.** The empty state is at most 1 line plus a suggestion.
58. **P2 · Footer column labels and home stat labels are uppercase micro-eyebrows**
    - **Note.** This is acceptable, but keep `label` strictly for table headers per SYSTEM.md.
    - **Fix.** Use sentence-case `ui` 13 px `--muted` for footer group titles.
    - **Accept.** Uppercase labels appear only in tables.

### G. Accessibility and quality

59. **P1 · Keyboard focus inside Ledger rows**
    - **Problem.** The focus ring is drawn on the hero link only (`ix-focus-home.png`), not on the row, so the strip has no visible focus.
    - **Fix.** When the roving cursor is in a row (item 25), draw a 2 px `--focus-ring` outline around the row and the focused mark.
    - **Accept.** The focus location is always visible.
60. **P1 · Strip `svg` accessible names**
    - **Problem.** "Allu Arjun: 20 films on a timeline" gives no summary.
    - **Fix.** Use a summary sentence: "Allu Arjun, 20 films 2003–2024: 14 hits, 2 blockbusters, 4 flops; biggest Pushpa 2 (2024)". Add the table toggle (ChartFrame "Table" action, brief item 40) as the full alternative. It is still missing on most frames: only the link action is present.
    - **Accept.** Every frame has link and table actions. A PNG action is optional but should be consistent.
61. **P2 · Contrast of the "not reported" dotted marks and the hatch in light mode**
    - **Problem.** Both are under 2:1 against `--surface`.
    - **Fix.** Decorative exemption is fine for the hatch, but the dotted "not reported" mark carries data. Raise it to `--faint` (3.6:1).
    - **Accept.** The data mark is at least 3:1.
62. **P2 · Dark mode: hatch and `--field` dots on dark are slightly muddy (dark hero dot strips)**
    - **Fix.** In dark, set `--field` to `#5b524c` and the hatch stroke at 35%.
    - **Accept.** Grey dots are distinguishable from the gridline at 100% zoom.

---

## 3. The five changes that would most raise the bar

1. **Bring the Ledger to life (items 24–26, 35, 43, 59).** Make every mark peekable, clickable and keyboard-reachable, with one roving tab stop and cross-highlight from directors and findings. Re-sort without collisions. This turns the signature view from a picture into the instrument the whole concept promises. It is the one change that moves UX from 6.5 to 8+.
2. **One number per idea (items 1, 2, 6, 7, 31).**
   - Remove the old Star Score masquerading as "Box office score".
   - Rename the gross tab "Gross".
   - Show gross ranges everywhere and qualify every total with "from N films".
   - Reconcile 1,467 vs 1,473.

   Trust is this site's product, and right now a careful reader can catch three contradictions in two minutes.
3. **Fix the breakages a first visitor will hit (items 12–18).** The blank 4,400 px after the `/directors` footer, the one-word-per-line mobile table header, the clipped mobile head-to-head, the wrapped "₹ cr" values, the header tick collisions and the hidden second hero on mobile Compare. These are cheap fixes, and today they undo the polish elsewhere.
4. **Language and de-dupe hygiene (items 3–5, 8).** Classify the original language by `languages[0]` plus a bilingual allow-list, drop the phantom Ghazi record, scope "Best of {year}" to Telugu by default, and make the copy match who is actually ranked. This removes the remaining "Tamil film in the Telugu list" errors that fans will notice first.
5. **Replace the chip walls with lanes, and finish the motion story (items 19, 42, 44, 45).** On hero pages, show the directors as lanes under the reel on the same axis, not as 26–39 pills. Morph the name and score along with the face. Never count a headline up from 0. That gives the page-to-page continuity and block-to-block calm that was the owner's main AA reference.

**What I would need to sign off next round:**
- Items 1–4, 12–16, 18, 24–25 and 35 are done.
- Every page has scroll height equal to its footer at both widths.
- Every film mark on every chart opens its film.
- No number appears with two different values anywhere on the site.
