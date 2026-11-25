# Prompt for the browsing agent: box-office check for the 15 new heroes

Copy everything below the line into the agent that has the Chrome extension, and attach
`round5-new-heroes.csv` from this folder. A second file, `round6-director-films.csv`, has the same columns: Telugu
films whose result came from a low-confidence source (trade blog, hero article) and that now feed the Directors
ranking. Send it as a second run with the same prompt (the hero list below does not apply to it). The rules are the same as in `PROMPT-2.md`; this round
covers only the heroes added on 25 Nov 2026.

---

You are helping check film data for a non-commercial website that ranks film heroes popular with Telugu
audiences. I am attaching one CSV file, `round5-new-heroes.csv`. Fill in the empty columns by reading public
web pages in the browser, then give the file back to me with the same columns, in the same order, with the
same rows.

The heroes are Dhanush, Vijay, Kamal Haasan, Vikram, Ajith Kumar, Vijay Sethupathi, Sivakarthikeyan, Vishal,
Siddharth, Mohanlal, Mammootty, Fahadh Faasil, Prithviraj Sukumaran, Yash and Kichcha Sudeep.

## Ground rules

- **Read only.** Do not log in, post, comment, fill forms or sign up.
- **Go slowly.** One page at a time. If a site shows a captcha or "too many requests", stop using it.
- **Never guess.** If you cannot find something, leave the cell empty and say why in `notes`.
- **Do not change** `priority`, `film_key`, `hero_id`, `hero`, `title`, `year` or any `current_*` column.
- Dates as `YYYY-MM-DD`; today's date in `checked_on` for every row you fill.

## What to fill

Work in `priority` order: priority 1 first (every film that counts today), then priority 2 (big films left
out only because no Telugu release was found).

| Column | What to write |
|---|---|
| `telugu_release` | `original` (made in Telugu), `bilingual` (shot in Telugu too), `dubbed` (dubbed and released in Telugu in theatres or on OTT), or `none`. Pre-filled `original` rows only need checking. |
| `verified_result` | Exactly one of: `blockbuster`, `super_hit`, `hit`, `above_average`, `average`, `below_average`, `flop`, `disaster`: the film's **overall** result (all languages). |
| `worldwide_gross_crore` | Worldwide **gross** in crore rupees, number only (e.g. `245` or `240-250`). Not share, not net. |
| `budget_crore` | Budget in crore rupees, if a source states it |
| `source_url_1`, `source_url_2` | Two independent sources wherever possible; a result with no link is thrown away |
| `checked_on` | Today's date |
| `notes` | Anything uncertain (sources disagree, figure for one language only, re-release included) |

**Good sources:** the film's Wikipedia article (check the cited references), Box Office India, Sacnilk,
Koimoi, Pinkvilla, Andhra Box Office, Track Tollywood, 123telugu, Greatandhra, The Hindu, India Today, Times of
India, Hindustan Times; for Tamil films also Behindwoods, Galatta and Sify; for Malayalam films Manorama,
Mathrubhumi and Onmanorama; for Kannada films Prajavani and The News Minute.

**Rules for the result:** if two good sources disagree by one step, pick the lower one and say so in `notes`;
if by more, leave it empty and write both views. Fan sites, YouTube, social media and forums are not sources.
Do not use ratings or review scores as a box-office result.

Hand the file back as `film-verdicts.csv` (same columns). I import it with
`npm run tolly:update -- <folder> <date>`.
