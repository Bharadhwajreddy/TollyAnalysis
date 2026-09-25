// Usage: node scripts/screenshot.mjs <url> <out.png> [width] [fullPage] [clickSelector]
import { chromium } from "@playwright/test";

const [url = "http://localhost:3000/", out = "shot.png", width = "1360", full = "true"] = process.argv.slice(2);
const executablePath = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: Number(width) < 500 ? 2 : 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: full === "true" });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
