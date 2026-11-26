# Tolly Analysis videos: full documentation

How every Tolly Analysis video (YouTube Shorts and long-form) has been made so far. It covers the brand, the
pipeline, the templates, voice editing, music and SFX, subtitles, data and fact-checking, metadata, and the
owner's preferences learned from their feedback.

Read `.claude/skills/tolly-video/SKILL.md` first for the short version, and this file for the details.

---

## 1. The channel

- **Name:** Tolly Analysis (on screen: `TOLLY ANALYSIS`, with "ANALYSIS" in the accent colour).
- **Website:** tollyanalysis.com, built from this same repo (Next.js). **Contact:** info@tollyanalysis.com.
- **What it is:** Telugu heroes' careers and box office in numbers. Every film is plotted on a career graph, and
  the **Tolly Index** is our own 0–100 score per hero.
- **Audience:** Telugu movie fans, mostly on phones and mostly from YouTube Shorts.
- **Voice:** the owner records the voice-over in Telugu, casual and funny, mixing Telugu and English.
  - Typical opening: "Banisalandariki pranamalu!"
  - Typical outro: "Thappulunte kshaminchandi… leda comments lo shikshinchandi kaani subscribe maatram mingandi… ika selavu."
- **Language on screen:** English, plus Telugu **written in English letters** (e.g. "Geluchukundi", "Thadi
  gudda"). Never use Telugu script on screen.

## 2. Folder map

```
video/
  render.cjs              HTML page → MP4 (Playwright frames + ffmpeg)
  DOCUMENTATION.md        this file
  AGENT-PROMPT.md         the prompt that hands this work to an agent
  tools/
    transcribe.py         word-timestamped Telugu transcript (faster-whisper large-v3)
    clean-voice.sh        the voice cleaning chain
    music-bed.py          original background music generator (no copyright issues)
    sfx.py                impact hits + whooshes at given times
  hero-short/             9:16 single-hero short template (Vishwak Sen, Dulquer Salmaan)
    index.html            scenes s1 s2 s3 s4 s7 s5 s6 s0; per-hero COPY block
    data.js / data.json   exported from the site data (scripts/video-export.mts)
    voice/edit-*.py       voice cut lists for each short (the reference for cutting a recording)
    posters/              film posters (gitignored)
    SCRIPT-*.md           script, timing, title, description, hashtags per short
  hero-long/              16:9 long-form template, 10 chapters (Sharwanand vs Bhogi)
  vishwak-vs-dulquer/     9:16 two-hero comparison short (the first video)
  producer-loss/          9:16 countdown short "Producers ki thadi gudda kappina cinemalu"
    assets/               posters, meme frames, meme.wav (gitignored except anton.woff2)
scripts/video-export.mts  exports hero numbers for the templates
```

**Gitignored, never commit:**
- `*.mp4`, `frames/` and `still-*.png`
- posters, meme clips and frames
- voice recordings (`voice/*.wav`)
- everything in `producer-loss/assets/` except the font

These files are either copyrighted (posters and memes) or private (the owner's voice). Keep them local and
deliver them to the owner directly.

The owner will also give you a folder with **all the finished shorts**. Watch them before you make anything: they
set the standard for the style.

## 3. Tools and setup

| Need | How |
|---|---|
| Browser for rendering | Chromium and Playwright are pre-installed in the cloud container. `require('playwright')` works and `chromium.launch()` needs no options. Never run `playwright install`. |
| ffmpeg | `/usr/bin/ffmpeg` (with ffprobe) |
| numpy (music and SFX) | `python3 -m venv ~/asr && ~/asr/bin/pip install numpy faster-whisper`, then run `~/asr/bin/python -I video/tools/…` |
| Speech-to-text | faster-whisper **large-v3**, int8, CPU. The medium model outputs garbage on Telugu. The first run downloads about 3 GB. |
| Fonts | Anton (titles and subtitles) in `producer-loss/assets/anton.woff2` (from `@fontsource/anton`); Inter for body text |
| Hero photos | `public/heroes/<slug>.jpg`, which templates use as `../../public/heroes/<slug>.jpg`. The credit line for each photo goes in the description. |

The container is wiped between sessions. Anything worth keeping goes in the repo (code and docs) or to the owner
(MP4s and PNGs).

## 4. The rendering model

Every video is **one HTML page** whose look at any moment is a pure function of time:

```js
window.render = function (t) { /* set every element's style from t alone */ };
window.DURATION = 28;     // seconds
window.ready = true;      // set once images/data are loaded
```

- **Design size:** 540×960 CSS px for 9:16, or 960×540 for 16:9. render.cjs uses deviceScaleFactor 2, so the
  output is 1080×1920 or 1920×1080.
- **No CSS transitions, keyframes or timers.** Everything is computed from `t`, so any frame can be rendered in
  any order. A preview loop runs only when the URL has no `?render=1`, so you can open the page in a browser and
  watch it.
- **Helpers in every template:**
  - `clamp`
  - `prog(t, a, b)` (0→1 between a and b)
  - `out(x)` (ease-out cubic)
  - `back(x)` (overshoot pop)
  - `rise(el, p, px)`
  - `pop(el, p)`
  - `scene(id, t)` (fades a scene in and out, returns the local time)
- **Scenes:** `const S = { id: [start, end], … }`. Cut scenes on the voice: each scene starts where the voice
  starts talking about it.
- **Video and GIF clips** (memes) are shown as extracted JPG frames, toggling which one is visible:
  `ffmpeg -i meme.mp4 -vf fps=30,scale=500:-1 assets/meme/%03d.jpg`. Clamp the frame index to hold the last frame.

### render.cjs

```
node video/render.cjs video/<name> <out.mp4> 30 [--size 960x540] [--query "hero=x&S=..."] [--still 0.6,3,10]
```

- **Default size:** 540x960, rendered at 2× scale, so the output is 1080×1920.
- **Output:** MP4 (x264) with a **silent** audio track. Mux the real audio afterwards (section 7).
- **`--still t1,t2`:** writes `still-<out>-<t>.png` next to the output and does not encode a video. Always
  check stills before a full render. Stitch several side by side to view them at once:
  `ffmpeg -i a.png -i b.png -i c.png -filter_complex "hstack=3,scale=2160:-1" x.png`.
- **Speed:** a 28s short takes about 1–2 minutes and a 4-minute long video about 15 minutes. Run long renders in the background.

## 5. Templates

### 5.1 hero-short (9:16, one hero before a release)

- **URL parameters:**
  - `?hero=<slug>`
  - `?scenes=s1,s2,…` (which scenes play, in order)
  - `?S=e1,e2,…` (each scene's **end** time, in the same order, to fit the voice)
- **Scenes:**

| id | What |
|---|---|
| s1 | Opening: hero photo, next film's poster (landscape or `portraitPoster`), "In theatres <date>" |
| s2 | Career graph: a dot per film coloured by verdict, pill labels, eras or callouts ("Hat-trick to start!", "5 misses in a row"), chip line |
| s3 | In numbers: hit-rate ring, last-5 strip, biggest film (gross), Instagram, X, straight-Telugu record |
| s4 | Interesting facts (3 cards from `facts`) |
| s7 | Tolly Index today: value, rank of N, "after <next film> → ?" with a poster backdrop |
| s5, s6 | Older bar graph and "Inside Tolly Index" scenes (the owner asked for them removed: don't use them) |
| s0 | Clapperboard outro: hero name, next film and date; hero faces burst; Subscribe |

- **Per-hero copy:** each hero has an entry in the `COPY` object in `index.html`:
  - `color`, `next`, `date`, `credit`, `sub`
  - `labels` (which film names show on the graph, with `pos`, `dx` and `lift` nudges to avoid overlaps)
  - `callouts`, `graphChip`, `hook`, `graphLine`
  - `highlights`, `facts`, `ifHit`, `ifMiss`
  - flags: `portraitPoster`, `extraPosters`, `markTelugu`
- **To add a hero:**
  1. Run `npx tsx scripts/video-export.mts video/hero-short <slug> [<slug>…]`, listing **every** hero the
     template should keep. The export overwrites data.json and data.js.
  2. Add a `COPY` entry.
  3. Put the poster in `posters/<slug>.jpg`.
  4. Render stills.
- **Example render (Dulquer):**
  `node video/render.cjs video/hero-short out.mp4 30 --query "hero=dulquer-salmaan&scenes=s1,s2,s3,s4,s7,s0&S=6,21,29,37,44,50"`

### 5.2 hero-long (16:9, 10 chapters)

- **URL parameters:** `?hero=<slug>` and `?C=e1,…,e10` (chapter end times, to fit the voice).
- **Per-hero story:** the `STORY` object holds:
  - `hook` lines
  - `early` (supporting roles, first lead, breakthrough)
  - `eras` (from and to years, name, tone)
  - `labels`
  - `streakGood` and `streakBad`
- **Chapters:**
  1. Hook
  2. The beginning
  3. The career graph
  4. The golden run
  5. The dark phase
  6. Box office
  7. In numbers
  8. Next film: what history says (gross bands)
  9. Tolly Index
  10. Outro
- **Render:** `--size 960x540`.
- **Shorts from a long video:** re-render them 9:16 in hero-short. Don't crop the 16:9 video.

### 5.3 producer-loss (9:16 countdown, a reusable "Top 5" format)

This is the most polished format. Copy it for any "Top N" list (biggest flops, biggest openers, longest gaps and so on).

- **`FILMS`:** `{rank, id, title, year, budget, gross, say}`. `say` is the second in the raw take when the amount
  is spoken, so the stamp and shake hit on the word.
- **Voice offset:** `VOICE_AT` is when the voice starts in the video. `v1(x)` and `v2(x)` map times in take 1 and
  take 2 to video time.
- **s0 (opening):** the hook meme (Brahmanandam) plays in a gold-bordered box with kinetic title lines above it,
  popping on the spoken words, plus a "TOP 5 · …" chip. The video opens straight on the meme: there is no
  separate title scene.
- **Film cards f5…f1, one per film:**
  - huge rank number slams in
  - poster swings in 3D
  - budget bar (gold), then gross bar (red), both counting up
  - "Got back only X%"
  - a "GROSS SHORTFALL" stamp with screen shake on the spoken amount
  - a 5 4 3 2 1 ladder at the top
  - a white flash on every cut
- **s9 (outro):** a 2.4s table where all 5 loss bars fill **at the same time** (the owner asked for this), then
  "Subscribe · Tolly Analysis" and "Inka evaru ee list lo undali? Comment 👇", then it ends. Keep outros short.
- **Footer disclaimer:** a 9px line on every frame: "Budgets and worldwide grosses as reported (lower figure where
  reports differ). Budget − gross = gross shortfall, not the exact producer loss."

### 5.4 vishwak-vs-dulquer (two-hero comparison)

The first video, made before the voice workflow existed. Use it as a reference only.

## 6. Voice: from the owner's recording to a clean track

The owner sends WhatsApp or phone recordings (ogg, opus, m4a or wav), sometimes in several takes. **Work on the
owner's audio itself. Speech-to-text is only for finding where words are, never a replacement for the voice.**

1. **Convert:** `ffmpeg -i in.ogg -ac 1 -ar 48000 take1.wav`.
2. **Transcribe with word times:**
   `~/asr/bin/python -I video/tools/transcribe.py take1.wav take1.json`.
   It splits at silences and runs large-v3 on each piece; running it on the whole file drops Telugu speech.
3. **Build a cut list** as (source, start, end, speed) tuples in the order you want.
   - See `video/hero-short/voice/edit-dulquer-salmaan.py`, the full reference. It:
     - keeps only the speech inside each range (silencedetect)
     - tightens pauses to 0.16s within a scene and about 0.4s between scenes
     - can reorder lines and leave gaps (for a meme insert)
     - writes `scenes.json` with each scene's start and end in the new track, which you plug into `?S=` or `S`
   - **Cut on word boundaries** from the transcript. Pad each cut by about 0.06s before and 0.08s after.
   - Add 15–30 ms fades on every piece to avoid clicks.
4. **Clean:** `video/tools/clean-voice.sh cut.wav voice.wav [speed]`. The chain is:
   - highpass 85 Hz
   - afftdn (noise cancellation)
   - **agate** (removes breathing noises: the owner asked for this)
   - compressor
   - loudnorm −14 LUFS
   - +3 dB
   - limiter 0.85
5. **Speed:** the owner usually wants it faster.
   - Dulquer: main part 1.1×, outro 1.25×.
   - Producer short: the whole final video 1.1×.
   - Use `atempo`, which keeps the pitch.
6. **Listen-check without ears:** compare the transcript to the final track by re-running transcribe on it, and
   check peak and loudness with `ffmpeg -i voice.wav -af ebur128 -f null -` (aim for about −14 LUFS integrated).

**Rules learned from feedback:**
- **Keep the owner's jokes and asides.** Removing comedy was a mistake that had to be redone ("Banisalaku
  pranamalu didn't come in this video… keep the jokes").
- When asked to cut something, cut exactly that and keep every other statement.
- The voice must be **loud and clear**: "increase the sound a lot".
- Remove breaths and long pauses.
- Multiple takes: take each line from the take the owner names. For example, "use take 1 till '191 crores for
  RajaSaab', and the last line from take 2".

## 7. Music, SFX and the final mix

- **Music:** `~/asr/bin/python -I video/tools/music-bed.py music.wav <seconds>`.
  - An original pad and arpeggio at 90 BPM (Am-F-C-G), so it is safe on YouTube.
  - The owner wants it **light, in the background** ("lyt ga undali… background laaagane undali").
  - Mix it at about −19 dB and duck it under the voice (sidechain).
  - **Never use the owner's original background music or copyrighted songs.**
- **SFX:** `~/asr/bin/python -I video/tools/sfx.py sfx.wav <seconds> "<hit times>" "<whoosh times>"`.
  - Hits go on stamps and slams, about 0.05s before the spoken word.
  - Whooshes go on scene cuts. A whoosh peaks about 0.18s after its time.
- **Memes:** the meme's own audio plays at the start, about −11 dB under the voice, fading out by about 2s.
  The owner supplies meme clips. Ask for them; don't download memes yourself.
- **Mix template** (voice starting at 0.2s, 25s video):

```
ffmpeg -y -i meme.wav -i voice.wav -i music.wav -i sfx.wav -filter_complex "
[0:a]atrim=0:2.0,afade=t=out:st=1.7:d=0.3,volume=-11dB,aformat=channel_layouts=stereo[me];
[1:a]adelay=200|200,aformat=channel_layouts=stereo[v];
[me][v]amix=inputs=2:duration=longest:normalize=0,apad=whole_dur=25[mv];
[mv]asplit=2[mv1][sc];
[2:a]volume=-19dB[m];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[md];
[3:a]aformat=channel_layouts=stereo,volume=-9dB[fx];
[mv1][md][fx]amix=inputs=3:duration=first:normalize=0,atrim=0:25,afade=t=out:st=24.2:d=0.8,alimiter=limit=0.89:level=false[out]
" -map "[out]" -ar 48000 mix.wav
```

  Without a meme, drop input 0 and use `[1:a]adelay…,apad=whole_dur=N[mv]` directly.

- **Mux** (put the audio on the silent render):
  `ffmpeg -i silent.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4`
- **Whole video faster** (e.g. 1.1×), with picture and sound together:
  `ffmpeg -i silent.mp4 -i mix.wav -filter_complex "[0:v]setpts=PTS/1.1,fps=30[v];[1:a]atempo=1.1[a]" -map "[v]" -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4`

## 8. Subtitles (the owner likes these: the Vishwak Sen short style)

- **Font and style:**
  - Anton, uppercase, 40px (on a 540-wide stage), white
  - **2px black stroke** with `paint-order: stroke fill`, plus a hard 4px drop shadow
  - placed at the lower third (`top: 770px`), above the footer
- **Highlights:** names and numbers go in `<b>`, shown in **gold** (`#f5c04a`).
- **Timing:** one short line at a time (2–5 words), popping in with `scale(0.82 → 1)` over 0.12s with a
  back-ease. Times come from the transcript's word timestamps.
- **Format:** `const SUBS = [[time, "TEXT WITH <b>HIGHLIGHT</b>"], …, [endTime, ""]]`.
- **Spelling:** write Telugu in English letters. Spell names the way the owner wants them, e.g. "**Poori Charmi**
  😄", not "Puri Charmi". A light emoji now and then is welcome.
- Hide subtitles during the outro card.

## 9. Visual style

- **Something changes every second:** kinetic text, counters, bar fills, stamps, shakes, flashes, poster swings
  and zooms. Static slides were rejected ("not many slides", "better UI and animation").
- **Colours:**
  - dark wine background (`#100709` with a radial `#4d1020` glow at the top)
  - gold `#f5c04a`
  - red `#ff4d5e`
  - green `#3fae62`
  - wine accent `#c2335f`
  - each hero also has their own accent colour
- **Verdict colours:**

| Verdict | Colour |
|---|---|
| Disaster | `--r0` (red) |
| Flop | `--r1` |
| Below average | `--r2` |
| Average | `--r3` |
| Above average | `--r4` |
| Hit | `--r5` |
| Super hit | `--r6` |
| Blockbuster | `--r7` (green or gold) |

- **Text:** titles in Anton; body in Inter, weight 800–900, with tabular numbers.
- **Layout:** keep the top 40px for the `TOLLY ANALYSIS` brand line. Leave the bottom about 200px clear of
  important content: YouTube's UI covers it, and it is where the subtitles sit.
- **Openings:** keep intros short (about 1–2s). Hook in the first second with a meme or a bold claim. The owner
  said "the intro is too big".
- **Outros:** short. A clapperboard (hero shorts) or a leaderboard (lists), then Subscribe and a comment question.
- **Labels:** no overlapping labels. Check every still at full size.
- **Fixed per-video choices:** some positions are fixed for a given video. For example, in the Vishwak short the
  hero's next-film poster is on the first screen and the clapperboard is at the end.

## 10. Data and fact-checking (the most important part)

The owner's trust depends on correct numbers. They have caught errors before ("don't trust some numbers").

- **Source of truth:** the site data in `lib/data/real/snapshot.json`, `lib/data/tolly/heroes.json` and
  `films.json`.
  - Export numbers with `scripts/video-export.mts`.
  - Editor-checked verdicts are in `docs/data-entry/checked/*.csv`. Verdicts are applied with
    `npm run tolly:update -- <folder> <asOf>`.
- **Before any number goes on screen:**
  - Cross-check every verdict and gross with at least one trade source (Sacnilk, Koimoi, Pinkvilla, Track
    Tollywood, Wikipedia with citations).
  - When reports differ, use the **lower** figure and say so in the footer.
  - Note the date you checked it.
- **Gross figures:**
  - **Distributors' share is not gross.** Net figures and partial-run figures are not worldwide gross either.
    Leave them out rather than mixing them.
  - **Dubbed films' grosses don't count** in a hero's box-office totals.
- **Wording:**
  - Call budget − gross a "gross shortfall", never "the producer's exact loss".
  - Say "as reported".
  - Opinions ("our score") are labelled as our analysis.
- **Exclusions:** Panja Vaisshnav Tej is excluded from everything.
- **Hero coverage:** lead roles only. For Malayalam and Tamil heroes, count only films released in Telugu
  (straight or dubbed), and mark the dubbed ones.
- **Tolly Index:** a hero needs 90% of their films editor-checked before their Tolly Index is shown (Suriya is
  still held back). Read the current value and rank from heroes.json on the day you make the video.
- **Never mention IMDb or Letterboxd** anywhere in videos, titles or descriptions. The IMDb credit stays only on
  the website's Data credits page, because its licence requires it. Never show raw IMDb ratings or vote counts.
- **Credits in the description:**
  - Box office: "Box-office results: Wikipedia and trade reports (Sacnilk, Koimoi, Pinkvilla and others)."
  - "Scores are our own analysis and opinion."
  - The hero photo licence line from `COPY.credit` or the photo's Wikimedia page.
- **Posters and memes:**
  - fair-use style: short and transformed
  - supplied by the owner or taken from official promo material
  - never committed to git
- **Never ask for or handle tokens or API keys in chat.** TMDB and OMDb keys live only in the gitignored `.env.local`.

## 11. YouTube metadata (deliver with every video)

- **Title:** at most 70 characters, with the hook in Telugu-English plus the film or hero names people search,
  an emoji, and `#Shorts` for shorts. Example:
  `Producers Ki Thadi Gudda 💸 Top 5 Telugu Box Office Losses | RajaSaab, Game Changer #Shorts`
- **Description:**
  - first 2 lines: the hook plus keywords (what shows in search)
  - then "Comment cheyyandi …👇" and "Tappulunte cheppandi, sari chesukuntam."
  - `📊 Tolly Analysis – Telugu heroes' careers in numbers` and `📧 info@tollyanalysis.com`
  - the credit lines from section 10
  - 3 hashtags at the end (YouTube shows the first 3 above the title)
- **Hashtags:** 8–12 in total: `#Shorts #Tollywood #TeluguCinema #BoxOffice #TollyAnalysis`, plus the hero and
  film tags.
- **Thumbnail:** only when asked. A 1080×1920 PNG for shorts or 1280×720 for long videos, rendered with
  `--still` from a custom thumbnail state.
- Store the script, title, description and hashtags in `video/<name>/SCRIPT*.md`. See
  `hero-short/SCRIPT-dulquer-salmaan.md`.

## 12. Delivery checklist

1. Check stills at key moments: the opening, each scene, and the outro. Look for overlaps, cut-off text and
   wrong numbers.
2. Render the full video, mux the audio, and confirm the length with
   `ffprobe -v error -show_entries format=duration -of csv=p=0 final.mp4`.
3. Grab 2–3 frames from the **final** MP4 (`ffmpeg -ss T -i final.mp4 -frames:v 1 f.png`), not just stills
   from the page.
4. Send the MP4 to the owner with a short list of what changed, plus the title, description and hashtags.
5. Commit the HTML, scripts and SCRIPT.md (never media) to the working branch and push. Never merge to `main`
   without the owner's explicit OK: merging publishes the website.
6. Name versions `<name>-v2.mp4`, `-v3`, and so on, so the owner can tell them apart.

## 13. Video history (what exists and what the owner said)

| Video | Format | Notes |
|---|---|---|
| Vishwak Sen vs Dulquer | 9:16 comparison | first video, silent |
| Vishwak Sen before ENE Repeat | hero-short | ENE Repeat poster on the first screen, clapperboard at the end, numbers scene, "double hat-trick" line, jokes kept, loud voice |
| Dulquer Salmaan before Aakasamlo Oka Tara | hero-short | Telugu releases only, Sita Ramam fact removed, voice 1.1× (outro 1.25×), music bed, a gap at about 1:19 for a Balakrishna "lopala dachi uncham" meme the owner will send |
| Sharwanand before Bhogi (27 Nov 2026) | hero-long 16:9 | draft ready; waiting for the owner's chapter-by-chapter voice; 4 Shorts to cut afterwards (see SCRIPT-sharwanand.md) |
| Producers ki Thadi Gudda | producer-loss countdown | Brahmanandam meme with the title at the start, Poori Charmi 😄, last line "modhatisthanam geluchukundi" from take 2, short leaderboard outro, final 1.1× (22.7s) |

**Ideas the owner liked for next videos:**
- "after collections" follow-ups (ENE Repeat, Aakasamlo Oka Tara, Bhogi)
- guess-the-hero from the career graph
- head-to-head comparisons
- more Top-5 lists in the producer-loss format
