# Prompt for the browsing agent: box-office results, IMDb links, follower counts

Copy everything below the line into the agent that has the Chrome extension. Attach the three CSV files
from this folder: `film-verdicts.csv`, `films-to-look-up.csv` and `hero-social-new-heroes.csv`.

---

You are helping check film data for a non-commercial website that ranks Telugu film heroes. I am attaching
three CSV files. Fill in the empty columns by reading public web pages in the browser, then give the three
files back to me with the same columns, in the same order, with the same rows.

## Ground rules

- **Read only.** Open pages and read them. Do not log in, post, comment, like, follow, fill forms or sign up.
- **Go slowly.** One page at a time, like a person reading. Do not open dozens of tabs or automate downloads.
  If a site shows a captcha, a "too many requests" page or asks you to sign in, stop using that site.
- **Never guess.** If you cannot find something in a source, leave the cell empty and write why in `notes`.
  An empty cell is far better than a wrong one.
- **Do not change** `priority`, `film_key`, `hero_id`, `hero`, `title`, `year` or any `current_*` column.
  They are how I match your answers back.
- Write dates as `YYYY-MM-DD`. Put today's date in `checked_on` for every row you fill.

## File 1: `film-verdicts.csv` (most important)

Each row is one film. Work in `priority` order: all priority 1 rows first (Rajinikanth, Suriya, Karthi,
Dulquer Salmaan: every counted film), then 2, then 3.

Fill:

| Column | What to write |
|---|---|
| `verified_result` | Exactly one of: `blockbuster`, `super_hit`, `hit`, `above_average`, `average`, `below_average`, `flop`, `disaster` |
| `worldwide_gross_crore` | Worldwide gross in crore rupees, a number only (e.g. `245` or `240-250`). Gross, not share or net. |
| `budget_crore` | Budget in crore rupees, a number only, if a source states it |
| `source_url_1`, `source_url_2` | Links to the pages that support the result. **Two independent sources** wherever possible |
| `telugu_release` | Only for Tamil/Malayalam films: `original` (made in Telugu), `bilingual` (shot in Telugu and another language), `dubbed` (dubbed and released in Telugu theatres or on OTT in Telugu), or `none` (no Telugu version found) |
| `checked_on` | Today's date |
| `notes` | Anything uncertain: sources disagree, figure is for one language only, re-release included, etc. |

Rows whose `notes` already say "Left out: no Telugu release found yet" only need `telugu_release` (and a
source link showing the Telugu version, e.g. a Telugu poster, trailer, or release news). Add a result too if
you find one.

**Good sources**, in this order: the film's Wikipedia article (check the cited references, not just the
infobox), Box Office India, Sacnilk, Koimoi, Pinkvilla box-office reports, Andhra Box Office, Track Tollywood,
123telugu, Greatandhra, India Today / The Hindu / Times of India / Hindustan Times trade stories, and for
Tamil films Behindwoods, Galatta, Sify and The Hindu Tamil.

**Rules for the result**

- A result needs at least one link; rows with a result and no link are thrown away.
- If two good sources disagree by one step (e.g. `hit` vs `super_hit`), pick the lower one and say so in `notes`.
  If they disagree by more, leave `verified_result` empty and write both views in `notes`.
- Judge the result against the film's budget and the trade's own verdict, not by how much you like the film.
- Fan sites, YouTube videos, social media posts and forum threads are **not** sources.
- Do not use IMDb ratings or any review score as a box-office result.

## File 2: `films-to-look-up.csv`

These films are missing an IMDb link or their rating data. For each row:

- `imdb_id_found`: the IMDb title id (looks like `tt1234567`) of the film. Search IMDb for the title and year
  and check the cast includes the hero listed. Make sure it is the Telugu film, not a remake or dub with a
  different id.
- I only need the id: do not copy ratings or vote counts.
- `notes`: "no IMDb page" if there is none, or anything doubtful (two possible matches, wrong year, etc.).

## File 3: `hero-social-new-heroes.csv`

For the four heroes in the file, open their **verified** Instagram and X (Twitter) profiles (blue tick, or
linked from their official website or Wikipedia) without logging in where possible and write down:

- the username (`instagram_username`, `x_username`), whether it is verified (`instagram_verified`: yes/no),
  the follower count exactly as shown (`instagram_followers_as_shown`, `x_followers_as_shown`, e.g. `13.4M`)
  and today's date in `checked_on`. Leave the YouTube and Facebook columns empty unless they are easy to find;
- if a hero has no official account on a platform, write `no account` in `notes`.

Do not use fan accounts. Do not follow anyone.

## When you are done

Give me back the three CSV files (UTF-8, comma separated, header row unchanged) and a short summary:
how many rows you filled, how many you left empty and why, and any films where sources strongly disagreed.
