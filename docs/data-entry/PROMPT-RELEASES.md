# Prompt for the browsing agent: theatrical or OTT? And missing dubbed films

Copy everything below the line into the agent that has the Chrome extension. Attach two files from this
folder: `releases-check.csv` and `releases-missing.csv` (empty, headers only).

When the files come back:
- save `releases-check.csv` as `lib/data/releases/checked/<date>-releases-check.csv`;
- append the rows of `releases-missing.csv` to `lib/data/releases/manual.csv`;
- run `npm run releases:update`, look at `/releases`, commit and deploy.

---

You are helping check film data for a non-commercial website about Telugu cinema. I am attaching two CSV
files. Fill them in by reading public web pages in the browser, then give both files back with the same
columns in the same order.

## Ground rules

- **Read only.** Do not log in, post, comment, fill forms or sign up.
- **Go slowly.** One page at a time. If a site shows a captcha or "too many requests", stop using that site.
- **Never guess.** If you cannot confirm something, leave the cell empty and write why in `notes`. An empty
  cell is far better than a wrong one.
- **Do not change** `priority`, `title`, `year`, `current_date`, `director`, `cast` or `current_kind`.
- Dates as `YYYY-MM-DD`. Today's date in `checked_on` for every row you fill.

## File 1: `releases-check.csv`: how was each film first released?

Each row is a Telugu film released from 2019 on. Work in `priority` order:

- **Priority 1 (50 rows), most important:** films an automatic rule thought might be direct-to-OTT. Some are,
  many are not. For example, *Little Hearts* (2025) and *Raju Weds Rambai* (2025) were theatrical releases,
  even though a streaming company (ETV Win) co-produced them.
- Priority 2: all films of 2020–2022 (the lockdown years, when many films went straight to OTT).
- Priority 3: 2023–2026. Priority 4: 2019.

Fill:

| Column | What to write |
|---|---|
| `verified_kind` | Exactly one of: `theatrical` (first released in cinemas, even if it streamed later), `ott` (first released on a streaming service, never in cinemas first), `not_released` (no release found yet), `duplicate` (the same film as another row, written differently: say which in `notes`), `not_telugu` (not a Telugu film or Telugu version) |
| `verified_date` | The first release date (cinema date for `theatrical`, streaming premiere date for `ott`) |
| `ott_platform` | For `ott` only: Aha, ETV Win, Netflix, Prime Video, ZEE5, JioHotstar, SonyLIV… |
| `source_url` | A link that shows how it was released. **Rows without a link are ignored.** |
| `checked_on` | Today's date |
| `notes` | Anything uncertain |

**How to tell theatrical from OTT, carefully:**

- A film is `ott` only if it **skipped cinemas**: news says "direct OTT release", "premieres on Aha", "skips
  theatrical release", "digital premiere", or it is listed as an Aha/ETV Win/Netflix "original film".
- News like "OTT release date", "now streaming on…" or "OTT rights sold to…" usually means the film streamed
  **after** a cinema run. That is still `theatrical`.
- A streaming company among the producers does **not** make a film `ott`.
- Box-office figures, "in theatres", "big screens", or first-day collections mean `theatrical`.
- If a film was released in a handful of cinemas and on OTT the same day, write `theatrical` and explain in `notes`.

**Good sources:** the film's Wikipedia article (check its references), 123telugu, Greatandhra, Gulte, Cinema
Express, The Hindu, Times of India, Hindustan Times, Deccan Chronicle, Telangana Today, The Hans India, and
the streaming service's own page for the film.

## File 2: `releases-missing.csv`: films dubbed into Telugu that we are missing

For each year from 2023 to 2026, find Indian films (Tamil, Malayalam, Kannada, Hindi) that were **released in
Telugu-dubbed versions in cinemas** in Andhra Pradesh and Telangana, and add one row per film. Start with the
big ones (star films, pan-India releases), then smaller ones. Skip films already in the website's list at
`/releases` (the year's list shows "Dubbed" next to the ones we have).

| Column | What to write |
|---|---|
| `title` | Title of the Telugu version, as released |
| `date` | Telugu release date |
| `kind` | `dubbed` |
| `original_language` | Tamil, Malayalam, Kannada or Hindi |
| `director` | Director |
| `cast` | Main cast, separated by `;` |
| `source_url` | A link showing the Telugu release (a Telugu poster announcement, trailer news, release news) |
| `notes` | e.g. "Telugu version released a week later" |

A film released in Telugu only on OTT (not in cinemas) can be added too: write `ott` in `notes`.
