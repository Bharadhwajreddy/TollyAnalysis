---
name: tolly-video
description: Make Tolly Analysis YouTube videos (Telugu box-office Shorts and long-form) from the owner's voice recordings - animated HTML pages rendered to MP4, voice cut and cleaned, music, SFX, subtitles, fact-checked numbers, SEO title/description/hashtags. Use for any request to make, edit, re-time, speed up or re-render a video, short, reel, thumbnail or its YouTube metadata.
---

# Tolly Analysis videos

Full details are in `video/DOCUMENTATION.md`. Read it the first time; this page is the working checklist.

## Golden rules

1. **Numbers must be right.** Cross-check every verdict, gross and budget with a trade source. Use the lower
   figure when reports differ, and never count a distributors' share or a net figure as gross. Dubbed films don't
   count in a hero's box-office totals. Say "as reported" or "gross shortfall"; don't claim exact losses.
2. **Never mention IMDb or Letterboxd** in a video, title or description. Never show IMDb ratings. Panja Vaisshnav
   Tej stays excluded.
3. **Use the owner's own voice.** Speech-to-text only finds where the words are. Keep their jokes. Cut exactly
   what they ask and keep everything else. Make the voice loud and clean, with the breaths removed.
4. **Something changes every second.** Use kinetic text, counters, bars, stamps, shake and flashes. Keep the
   intro about 1–2s and the outro short. No static slides.
5. **Telugu in English letters** on screen. Never use Telugu script.
6. **Music:** only our generated bed (`video/tools/music-bed.py`), quiet and ducked under the voice. Never use
   copyrighted music. Memes come only from the owner.
7. **Never commit media.** That means MP4s, posters, memes and voice recordings. Commit the HTML, scripts and
   SCRIPT.md files. Push to the working branch and never merge to `main` without an explicit OK. No tokens in chat.

## Workflow

1. **Script:** write `video/<name>/SCRIPT.md` with a table: time | on screen | what to say (Telugu in English
   letters). Base it on the data export:
   `npx tsx scripts/video-export.mts video/<template> <slug>…`
2. **Build:** copy the closest template:
   - `hero-short`: one hero before a release, 9:16
   - `hero-long`: 16:9 chapters
   - `producer-loss`: a Top-N countdown, the most polished format
   - Each page has a pure `render(t)` function, `DURATION`, `ready`, and scene windows
     `S = {id: [start, end]}`.
3. **Check stills:** `node video/render.cjs video/<name> out.mp4 30 --still 0.5,3,8,…`. Look at every still.
4. **Voice** (when the owner sends recordings):
   1. Run `~/asr/bin/python -I video/tools/transcribe.py take.wav take.json` to get word times.
   2. Write a cut list modelled on `video/hero-short/voice/edit-dulquer-salmaan.py`.
   3. Run `video/tools/clean-voice.sh cut.wav voice.wav [speed]`.
   4. Re-time the scenes and subtitles to the word times.
5. **Audio:**
   1. Run `music-bed.py music.wav <dur>`.
   2. Run `sfx.py sfx.wav <dur> "<hits>" "<whooshes>"`, with hits about 0.05s before the spoken number and
      whooshes on the cuts.
   3. Mix: voice at 0 dB; music at −19 dB with sidechain ducking; SFX at −9 dB; meme audio at −11 dB, faded by 2s.
      The full command is in DOCUMENTATION §7.
6. **Render and mux:**
   1. `node video/render.cjs video/<name> silent.mp4 30`
   2. `ffmpeg -i silent.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart <name>-vN.mp4`
   3. For a 1.1× speed-up, use `setpts=PTS/1.1` on the video and `atempo=1.1` on the audio, re-encoding with x264 (§7).
7. **Verify:** check the length with ffprobe and pull 2–3 frames from the final MP4.
8. **Deliver:**
   - the MP4
   - what changed, in a few bullets
   - an SEO **title** (at most 70 characters, ending in `#Shorts`)
   - a **description** (hook and keywords first, a comment ask, info@tollyanalysis.com, source credits, 3 hashtags)
   - 8–12 **hashtags**
   - a thumbnail, only when asked
   - Then commit and push the code.

## Subtitle style (fixed)

- Anton, uppercase, 40px, white with a 2px black stroke and a hard shadow, at `top: 770px`.
- Names and numbers go in `<b>`, which shows them in gold `#f5c04a`.
- 2–5 words per line, popping in at scale 0.82→1 over 0.12s, timed from the word timestamps.
- Spell names the way the owner wants them (e.g. "POORI CHARMI 😄").
- Hide subtitles on the outro card.

## Owner's taste (from feedback)

- **Opening:** hook memes at the start (Brahmanandam) with the title over them.
- **Speed:** a faster voice (1.1×, outros up to 1.25×).
- **Outros:** short, with all the final bars appearing together.
- **Endings:** ask a comment question at the end ("Inka evaru ee list lo undali? Comment 👇", "Next hero evaru?").
- **Sign-off lines:** "Subscribe maatram mingandi", "Ika selavu".
