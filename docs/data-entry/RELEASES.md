# Weekly update: Telugu releases (the Releases page and the home-page chart)

Every week, after Friday's releases:

1. **Add anything the sources miss** to `lib/data/releases/manual.csv`, one row per film. Typical rows:
   films dubbed into Telugu, direct-to-OTT premieres, small releases.

   | Column | What to write |
   |---|---|
   | `title` | Title as released in Telugu |
   | `date` | Release date in Telugu, `YYYY-MM-DD` |
   | `kind` | `theatrical` (Telugu film in theatres), `ott` (Telugu film straight to OTT) or `dubbed` (dubbed into Telugu) |
   | `original_language` | For dubbed films: Tamil, Malayalam, Kannada, Hindi, English… |
   | `director` | Director |
   | `cast` | Main cast, separated by `;` |
   | `source_url` | A news link confirming the Telugu release |
   | `notes` | Anything worth knowing |

   A row with the same title and year as an existing film replaces it, so this is also how to fix a wrong date
   or mark a film as direct-to-OTT.

2. **Rebuild:** `npm run releases:update`. This re-reads this year's "List of Telugu films" page on Wikipedia
   (earlier years come from the cache in `.cache/releases/`; add `-- --refresh` to re-read every year), merges
   our film data and `manual.csv`, and writes `lib/data/releases/releases.json`.

3. **Check and publish:** open `/releases`, look at this week's films, then commit `lib/data/releases/` and
   deploy.

What counts: Telugu films released in theatres or straight to OTT from 2000 on, and films dubbed into Telugu
(Indian films; the list of dubs is less complete for older years). Re-releases do not count.
