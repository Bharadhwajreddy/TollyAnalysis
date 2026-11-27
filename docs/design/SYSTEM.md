# Design system: "The Ledger"

The redesign brief (full audit) is in `docs/design/AUDIT.md`. This file is the short version every page follows.

## The idea
Every number on the site is a roll-up of films. So a film is always drawn the same way — one **mark** on one
**time spine** (2000 → today) — and heroes, directors and years are just rows/lenses over those marks.
Every hero, film and director name is a **token** (a link). Hovering a director/year anywhere can **light up** his
films in every strip on the page (`components/charts/focus.tsx`).

## Building blocks (use these; do not re-invent)
| Need | Use |
|---|---|
| All films as atoms (date, outcome, gross, budget, score, heroes, director, slug) | `lib/ledger.ts` `getLedger()` → `films`, `bySlug`, `byHero`, `byDirector`; `toDot()` for client charts; `isHit`, `isJudged`, `longestStreak` |
| Hero numbers consistent with the marks | `lib/ledger-rows.ts` `getHeroSummaries()`, `heroLedgerRows()`, `directorLedgerRows()`, `spineEnd()`, `nextFilm()` |
| Client-safe types, labels, colours | `lib/ledger-types.ts` (`FilmDot`, `Outcome`, `OUTCOME_LABEL`, `VERDICT_LABEL`, `OUTCOME_VAR`, `filmHref`…) |
| Formatting | `lib/format.ts` (`inr` "₹1,811 cr", `compact`, `int`, `score`, `pct`, `multiple`, `date` "28 Apr 2017", `plural`) — never hand-format |
| Time scale | `lib/timeline.ts` (`yearPos`, `spine`, `grossShare`) |
| A career / any set of films on the spine | `components/charts/film-strip.tsx` `<FilmStrip films start end height axis labels highlight partialFrom upcoming ariaLabel/>`; `<Mark/>` for a single mark; `FilmTip` |
| Rows of careers, sortable by metric with gliding re-sort | `components/charts/ledger.tsx` `<Ledger rows metrics …/>`; metric sets in `lib/ledger-metrics.ts` |
| Releases per year (stacked, running year hatched) | `components/charts/year-columns.tsx` `<YearColumns/>`, `<YearLegend/>` |
| Tooltip (portal, never clipped, arrow, flips) | `components/charts/float-tip.tsx` `<FloatTip state/>`, `<TipRow/>` |
| Draw-in only when hydrated below the fold | `components/charts/use-enter.ts` + classes `grow-mark`, `grow-mark-x`, `fade-mark` |
| Cross-highlight | `components/charts/focus.tsx` `FocusProvider`, `useFocus`, `useFocusTrigger`, `lit`, `FocusChip` |
| Chart container | `components/ui/chart-frame.tsx` `<ChartFrame id title finding controls legend source aside flush/>`, `<Source/>` |
| Toggles / tabs (sliding pill) | `components/ui/segmented.tsx`; custom groups: `components/ui/use-sliding-indicator.ts` |
| Number tween | `components/ui/use-tween.ts` |
| Tokens | `components/entity/tokens.tsx` `HeroToken`, `HeroFace` (morphs into the hero page header via view transition `face-<slug>`), `FilmToken`, `MiniMark`, `DirectorToken`, `DirectorMono` |
| Legend for marks | `components/charts/outcome-legend.tsx` |
| Page title / section title | `components/layout/page-header.tsx` `PageHeader`, `SectionTitle` |
| Search | `components/search/*` (⌘K palette, `SearchField`) |

## Rules
- **Colour is semantic only.** Ink on paper; `--accent` (wine) = you-are-here, links, focus; `--v-*` = film outcome;
  `--k-*` = release kind; `--slot-a..d` = compare slots. No colour by era/family/industry. No rainbows. Use the CSS
  variables (they switch for dark mode) — never hard-coded hex.
- **No card soup.** Sections are separated by space (`mt-24`) and 1px rules (`border-rule`). `frame` (bordered
  surface) only for charts, tables, popovers. No eyebrow kicker + serif + subtitle triplets, no icon-in-circle grids,
  no gradient banners, no podiums, no emoji.
- **Type:** Playfair (`font-serif`) for H1/H2/frame titles only; Inter for everything else; numbers `num`/`tabular`,
  never serif. `label` class only for table headers/captions.
- **Scores far from zero** (index 30–80) use a dot on a labelled axis, not bars from 0. Counts/sums use bars from 0.
  Gross/budget spanning orders of magnitude: log scale.
- **Every film title is a `FilmToken`, every hero a `HeroToken`, every director a `DirectorToken`.**
- **Running year** is always "so far"/hatched; never drawn as a decline.
- **Motion:** sliding indicators (`Segmented`, `useSlidingIndicator`), re-sorts glide (transform), values tween.
  Nothing is hidden at rest; draw-in only via `useEnter`. Respect reduced motion (globals handle CSS).
- **Honesty:** never show raw IMDb ratings or vote counts; never name IMDb/Letterboxd outside `/annexure/sources`.
  "Film score" is our 0–100 score. Say "reported" for grosses.
- **Next 16:** `params`/`searchParams` are Promises; use `PageProps<"/route">`. No functions as props from server to
  client components. Read `node_modules/next/dist/docs/` when unsure.
- Mobile first-class: 390 px wide, no horizontal page scroll, tap targets ≥ 40 px, wide tables in `scroll-x` with a
  sticky first column.
