/**
 * Downloads free-licensed hero portraits from Wikimedia Commons (via the lead image
 * of each actor's English Wikipedia article) into public/heroes/<slug>.jpg and records
 * author + licence for attribution in lib/data/hero-photos.json.
 *
 * Only files hosted on Wikimedia Commons are used (non-free "fair use" images hosted
 * on en.wikipedia are skipped). Usage: npm run photos:fetch [-- --force]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { INITIAL_ROSTER } from "@/lib/constants/roster";

/** Commons files found by manual search for heroes without a Wikipedia/Wikidata portrait. */
const EXTRA_FILES: Record<string, string> = {
  "kalyaan-dhev": "Kalyaan_dhev.jpg",
};

function wikidataImage(slug: string): string | null {
  if (!existsSync("lib/data/real/snapshot.json")) return null;
  const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8")) as { heroes: { slug: string; image: string | null }[] };
  const url = snap.heroes.find((h) => h.slug === slug)?.image;
  return url ? decodeURIComponent(url.split("Special:FilePath/")[1] ?? "").replace(/ /g, "_") || null : null;
}

const UA = "TollywoodAnalysis/0.1 (https://github.com/Bharadhwajreddy/TollyAnalysis)";
const OUT = "lib/data/hero-photos.json";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Credit {
  file: string;
  page: string;
  author: string;
  license: string;
  wikiTitle: string;
  description: string;
}

// Wikimedia rate-limits aggressively; back off generously on 429.
async function get(url: string, tries = 6): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.status !== 429 || i >= tries) return res;
    await sleep(5000 * (i + 1));
  }
}

function stripWiki(s: string): string {
  return s
    .replace(/\{\{\s*Institution:([^}|]+)[^}]*\}\}/gi, "$1")
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\|([^{}|]+)\}\}/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/'''?/g, "")
    .trim();
}

function parseLicense(raw: string): string {
  const t = raw.toLowerCase();
  const m = /\{\{\s*(?:self\s*\|\s*)?(cc-by-sa-[\d.]+|cc-by-[\d.]+|cc-zero|cc0|pd-[a-z-]+|gfdl)/i.exec(t);
  if (m) return m[1].toUpperCase().replace("CC-ZERO", "CC0");
  if (t.includes("flickrreview") && t.includes("cc-by")) return "CC-BY";
  if (t.includes("youtube") && t.includes("cc-by")) return "CC-BY-3.0";
  return "See file page";
}

async function main() {
  const force = process.argv.includes("--force");
  const credits: Record<string, Credit> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  for (const hero of INITIAL_ROSTER) {
    if (!force && credits[hero.slug] && existsSync(`public/heroes/${hero.slug}.jpg`)) continue;
    let done = false;
    for (const title of hero.wiki) {
      const res = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
      await sleep(1200);
      if (!res.ok) continue;
      const s = (await res.json()) as { type: string; description?: string; thumbnail?: { source: string }; originalimage?: { source: string } };
      if (s.type === "disambiguation" || !s.thumbnail) continue;
      const src = s.thumbnail.source;
      if (!src.includes("/wikipedia/commons/")) {
        console.log(`- ${hero.slug}: lead image is not on Commons (non-free), skipped`);
        break;
      }
      const fileName = decodeURIComponent((s.originalimage?.source ?? src).split("?")[0].split("/commons/")[1].split("/").slice(2, 3)[0] ?? "");
      // Use the thumbnail size Wikimedia already serves (arbitrary sizes are rejected).
      const img = await get(src);
      if (!img.ok) continue;
      writeFileSync(`public/heroes/${hero.slug}.jpg`, Buffer.from(await img.arrayBuffer()));
      const raw = await (await get(`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}?action=raw`)).text();
      const author = /\|\s*[Aa]uthor\s*=\s*(.+)/.exec(raw)?.[1] ?? "Unknown";
      credits[hero.slug] = {
        file: `/heroes/${hero.slug}.jpg`,
        page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
        author: stripWiki(author).slice(0, 120) || "Unknown",
        license: parseLicense(raw),
        wikiTitle: title,
        description: s.description ?? "",
      };
      console.log(`✓ ${hero.slug} ← ${fileName} (${credits[hero.slug].license}) — ${s.description ?? ""}`);
      done = true;
      await sleep(1200);
      break;
    }
    // Fallbacks: the Wikidata image (P18), then a manually found Commons file.
    const file = !done && !credits[hero.slug] ? (wikidataImage(hero.slug) ?? EXTRA_FILES[hero.slug] ?? null) : null;
    if (file) {
      const img = await get(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=330`);
      if (img.ok) {
        writeFileSync(`public/heroes/${hero.slug}.jpg`, Buffer.from(await img.arrayBuffer()));
        const raw = await (await get(`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}?action=raw`)).text();
        const author = /\|\s*[Aa]uthor\s*=\s*(.+)/.exec(raw)?.[1] ?? "Unknown";
        credits[hero.slug] = {
          file: `/heroes/${hero.slug}.jpg`,
          page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
          author: stripWiki(author).slice(0, 120) || "Unknown",
          license: parseLicense(raw),
          wikiTitle: "Wikidata image (P18)",
          description: "",
        };
        console.log(`✓ ${hero.slug} ← ${file} (fallback, ${credits[hero.slug].license})`);
        done = true;
        await sleep(1200);
      }
    }
    if (!done && !credits[hero.slug]) console.log(`· ${hero.slug}: no free portrait found (initials avatar will be used)`);
  }
  // Drop photos of heroes no longer in the roster.
  const slugs = new Set(INITIAL_ROSTER.map((h) => h.slug));
  for (const k of Object.keys(credits)) if (!slugs.has(k)) delete credits[k];
  writeFileSync(OUT, JSON.stringify(credits, null, 2) + "\n");
  console.log(`Saved ${Object.keys(credits).length} credits to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
