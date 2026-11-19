/**
 * Exports the numbers a comparison short needs (two heroes) to video/<name>/data.json.
 * Usage: npx tsx scripts/video-export.mts <folder> <hero-slug> <hero-slug>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { HERO_FACTORS } from "../lib/tolly/index";

const [dir, ...slugs] = process.argv.slice(2);
const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const tolly = JSON.parse(readFileSync("lib/data/tolly/heroes.json", "utf8"));
const tfilms = new Map(JSON.parse(readFileSync("lib/data/tolly/films.json", "utf8")).films.map((f: { key: string }) => [f.key, f]));
const social = JSON.parse(readFileSync("lib/data/real/hero-followers.json", "utf8")).heroes ?? {};
const films = new Map(snap.films.map((f: { key: string }) => [f.key, f]));
const ranked = tolly.heroes.filter((h: { index: number | null }) => h.index !== null).sort((a: { index: number }, b: { index: number }) => b.index - a.index);
const clean = (t: string) => t.replace(/^unlinked:/, "").replace(/\|\d{4}$/, "").replace(/ \((\d{4} )?(Indian |Telugu |Tamil |Malayalam )?film\)$/, "");

const out = slugs.map((slug) => {
  const h = tolly.heroes.find((x: { slug: string }) => x.slug === slug);
  const person = snap.heroes.find((x: { slug: string }) => x.slug === slug);
  const list = snap.credits
    .filter((c: { hero: string; include: boolean }) => c.hero === slug && c.include)
    .map((c: { film: string }) => {
      const f = films.get(c.film) as { title: string; year: number; releaseDate: string | null; languages: string[]; gross: { text: string; low: number; high: number } | null; verdict: { verdict: string; source: string } | null; teluguRelease?: string };
      const t = tfilms.get(c.film) as { title: string; index: number | null } | undefined;
      const kind = f.teluguRelease === "dubbed" ? "dubbed" : f.languages.some((l) => /telugu/i.test(l)) ? "telugu" : f.languages.some((l) => /hindi/i.test(l)) ? "hindi" : "other";
      return { key: c.film, title: clean(t?.title ?? f.title), year: f.year, date: f.releaseDate, kind, result: f.verdict?.verdict ?? null, checked: f.verdict?.source === "editor-check", gross: f.gross?.low ?? null, grossText: f.gross?.text ?? null, score: t?.index ?? null };
    })
    .sort((a: { date: string | null; year: number }, b: { date: string | null; year: number }) => (a.date ?? `${a.year}-07-01`).localeCompare(b.date ?? `${b.year}-07-01`));
  const next = snap.credits.find((c: { hero: string; excludeReason: string }) => c.hero === slug && /not yet released/.test(c.excludeReason ?? ""));
  // The five factor groups the site shows: each one's 0–100 value and share of the final index.
  const groups = ["audience", "boxoffice", "recent", "fame", "career"].map((g) => {
    let sum = 0, w = 0, share = 0;
    for (const f of HERO_FACTORS) {
      if (f.group !== g) continue;
      const part = h.factors?.[f.key];
      if (!part || part.value === null) continue;
      sum += part.value * f.weight; w += f.weight; share += part.share;
    }
    return { key: g, value: w ? Math.round((sum / w) * 10) / 10 : null, share: Math.round(share * 10) / 10 };
  });
  const factors = HERO_FACTORS.map((f) => ({ key: f.key, group: f.group, label: f.label, value: h.factors?.[f.key]?.value ?? null, share: h.factors?.[f.key]?.share ?? 0 }));
  const counts = (social[slug]?.counts ?? []) as { platform: string; followers: number; date: string }[];
  const latest = (p: string) => counts.filter((c) => c.platform === p).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  return { slug, name: person.name, groups, instagram: latest("instagram"), x: latest("x"), factorList: factors, debutYear: h.profile?.debutYear ?? null, index: h.index, rank: ranked.findIndex((x: { slug: string }) => x.slug === slug) + 1, of: ranked.length, career: h.career, factors: h.factors, followers: h.followers, best: h.best, films: list, next: next ? clean((films.get(next.film) as { title: string })?.title ?? next.film) : null };
});
const faces = readdirSync("public/heroes").filter((f) => f.endsWith(".jpg")).map((f) => f.replace(/\.jpg$/, ""));
const json = JSON.stringify({ asOf: tolly.meta.asOf ?? null, faces, heroes: out }, null, 1);
writeFileSync(`${dir}/data.json`, json);
// The same data as a script, so the video page also opens straight from disk (file://).
writeFileSync(`${dir}/data.js`, `window.DATA = ${json};\n`);
console.log(out.map((h) => `${h.name}: ${h.index} (#${h.rank}/${h.of}), ${h.films.length} films, next ${h.next}`).join("\n"));
