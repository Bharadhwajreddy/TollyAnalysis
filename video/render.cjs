/* eslint-disable @typescript-eslint/no-require-imports -- a plain Node script run with node, outside the app */
/**
 * Renders a video page (video/<name>/index.html, which exposes render(t) and DURATION) to MP4:
 * one screenshot per frame at 1080×1920, then ffmpeg with a silent audio track (YouTube Shorts friendly).
 * Usage: node video/render.cjs video/<name> [out.mp4] [fps] [--query key=value] [--still t1,t2,...]
 */
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const { mkdirSync, rmSync } = require("node:fs");
const path = require("node:path");

(async () => {
  const dir = path.resolve(process.argv[2]);
  const outFile = path.resolve(process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : path.join(dir, "out.mp4"));
  const fps = Number(process.argv[4]) || 30;
  const stillArg = process.argv.indexOf("--still");
  const queryArg = process.argv.indexOf("--query");
  const query = queryArg > 0 ? "&" + process.argv[queryArg + 1] : "";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await page.goto("file://" + path.join(dir, "index.html") + "?render=1" + query);
  await page.waitForFunction(() => window.ready === true);
  await page.evaluate(() => document.fonts.ready);
  if (stillArg > 0) {
    for (const t of process.argv[stillArg + 1].split(",").map(Number)) {
      await page.evaluate((x) => window.render(x), t);
      await page.screenshot({ path: path.join(path.dirname(outFile), `still-${path.basename(outFile, ".mp4")}-${t}.png`) });
    }
    await browser.close();
    return;
  }
  const duration = await page.evaluate(() => window.DURATION);
  const frames = path.join(path.dirname(outFile), `frames-${path.basename(outFile, ".mp4")}`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const n = Math.round(duration * fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => window.render(x), i / fps);
    await page.screenshot({ path: path.join(frames, `${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  await browser.close();
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(frames, "%05d.jpg"), "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outFile]);
  rmSync(frames, { recursive: true, force: true });
  console.log(`wrote ${outFile} (${n} frames, ${duration}s)`);
})();
