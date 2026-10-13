/**
 * Tolly Index — attention data. Daily Wikipedia page views for the last 60 days (English and
 * Telugu) for every counted film, via the MediaWiki action API (prop=pageviews, 50 titles per
 * request). The REST per-article endpoint is rate-limited from shared IPs; this is the polite path.
 * Resumable: re-running skips titles already saved.
 *
 * Output: .cache/tolly/pageviews-60d.json  { "en:<title>" | "te:<title>": { days, views, from, to } }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/fetch-pageviews.mts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const UA = "TollywoodAnalysis/0.3 (https://github.com/Bharadhwajreddy/TollyAnalysis; contact saibharadhwajreddy@gmail.com)";
const OUT = ".cache/tolly/pageviews-60d.json";
mkdirSync(".cache/tolly", { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Views {
  days: number;
  views: number;
  from: string;
  to: string;
}

const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const teTitles: Record<string, string> = existsSync(".cache/import/tewiki-titles.json") ? JSON.parse(readFileSync(".cache/import/tewiki-titles.json", "utf8")) : {};
const counted = new Set(snap.credits.filter((c: { include: boolean }) => c.include).map((c: { film: string }) => c.film));
const titles: Record<"en" | "te", Set<string>> = { en: new Set(), te: new Set() };
for (const f of snap.films) {
  if (!counted.has(f.key)) continue;
  if (f.article) titles.en.add(f.article);
  if (f.qid && teTitles[f.qid]) titles.te.add(teTitles[f.qid]);
}

interface PageviewsResponse {
  continue?: Record<string, string>;
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; pageviews?: Record<string, number | null> }[];
  };
}

async function api(lang: string, params: Record<string, string>): Promise<PageviewsResponse> {
  const url = `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...params })}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.ok) return res.json();
    // Retry-After is sometimes 1s while the limit lasts a minute; never retry faster than 30s.
    const wait = Math.max(30, Number(res.headers.get("retry-after")) || 0);
    console.log(`  ${res.status}, waiting ${wait}s`);
    await sleep(wait * 1000);
  }
  throw new Error(`gave up on ${url}`);
}

// Resumable: results are saved after every batch and skipped on the next run.
const out: Record<string, Views | null> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
for (const lang of ["en", "te"] as const) {
  const list = [...titles[lang]].filter((t) => !(`${lang}:${t}` in out));
  console.log(`${lang}: ${list.length} titles`);
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    // Map the title we asked for → the title the API answers with (normalised, then redirected).
    const alias = new Map<string, string>(batch.map((t) => [t, t]));
    let cont: Record<string, string> = {};
    const pages = new Map<string, Record<string, number | null>>();
    do {
      const json = await api(lang, { prop: "pageviews", pvipdays: "60", titles: batch.join("|"), redirects: "1", ...cont });
      for (const n of json.query?.normalized ?? []) for (const [k, v] of alias) if (v === n.from) alias.set(k, n.to);
      for (const r of json.query?.redirects ?? []) for (const [k, v] of alias) if (v === r.from) alias.set(k, r.to);
      for (const p of json.query?.pages ?? []) if (p.pageviews) pages.set(p.title, { ...(pages.get(p.title) ?? {}), ...p.pageviews });
      cont = json.continue ?? {};
    } while (Object.keys(cont).length);
    for (const t of batch) {
      const pv = pages.get(alias.get(t)!);
      if (!pv) {
        out[`${lang}:${t}`] = null;
        continue;
      }
      const dates = Object.keys(pv).sort();
      const vals = dates.map((d) => pv[d]).filter((v): v is number => typeof v === "number");
      out[`${lang}:${t}`] = { days: vals.length, views: vals.reduce((a, b) => a + b, 0), from: dates[0], to: dates[dates.length - 1] };
    }
    writeFileSync(OUT, JSON.stringify(out));
    console.log(`  ${Math.min(i + 50, list.length)}/${list.length}`);
    await sleep(300);
  }
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`done: ${Object.values(out).filter(Boolean).length}/${Object.keys(out).length} with views`);
