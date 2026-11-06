# Prompt for the Claude desktop app (data collection with Claude in Chrome)

Attach `hero-social.csv` and `films-to-look-up.csv` to a new chat in the Claude desktop app, then paste everything between the lines.

---

I'm building an internal ranking of Telugu film heroes. Using Claude in Chrome (my Chrome is already signed in to Instagram, X, IMDb and Letterboxd), fill in the two attached CSV files. Work through them yourself; only stop to ask me if something below says to.

**File 1: hero-social.csv (71 heroes)**
For each hero:
1. Instagram: open instagram.com/<instagram_username>. If the username is blank, search Instagram for the hero's name and pick the verified (blue tick) account that clearly belongs to this Telugu actor; write the username. Record followers exactly as shown in `instagram_followers_as_shown` (e.g. "28.4M"), the full number in `instagram_followers` (28400000), the post count, and yes/no in `instagram_verified`. No verified account found: leave blank and write why in `notes`.
2. X: open x.com/<x_username> (or search for the verified account) and record followers the same way.
3. YouTube and Facebook: only if the hero has an official, verified channel or page; record the URL and subscriber/follower count. Otherwise leave blank.
4. Put today's date in `checked_on`.

**File 2: films-to-look-up.csv (88 films)**
For each film:
1. If `imdb_id_known` is blank, search IMDb for the film (try other spellings, the year ±1, and the hero's and director's names). Accept a match only if the year and at least one lead actor or the director agree. Write the tt… id in `imdb_id_found`.
2. On the film's IMDb page, record the rating and the number of ratings (`imdb_rating`, `imdb_votes`). If IMDb shows no rating, leave both blank.
3. Search Letterboxd for the same film (check the year and director). Record the film's URL, its average rating out of 5 and the number of ratings. If Letterboxd shows no average, leave it blank.
4. Put today's date in `checked_on`; put anything uncertain in `notes`.

**Rules**
- Only read pages: never like, follow, comment, post or message.
- One page at a time, with a pause of a few seconds between pages. If a site shows a login wall, a captcha or a "suspicious activity" warning, stop and tell me; don't try to get around it.
- Never guess. A blank cell is better than a wrong number.
- Keep every column and the row order exactly as in the files.

When done, give me both files back as CSV downloads, plus a short summary: how many heroes and films you filled, and anything you couldn't find.

---

Then bring the two filled files back to the cloud session (attach them there, or put them in Google Drive in a folder called "Tolly Index"). They get imported, checked and added to the index there.
