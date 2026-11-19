/**
 * Exports the numbers a comparison short needs (two heroes) to video/<name>/data.json.
 * Usage: npx tsx scripts/video-export.mts <folder> <hero-slug> <hero-slug>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [dir, ...slugs] = process.argv.slice(2);
const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const tolly = JSON.parse(readFileSync("lib/data/tolly/heroes.json", "utf8"));
const tfilms = new Map(JSON.parse(readFileSync("lib/data/tolly/films.json", "utf8")).films.map((f: { key: string }) => [f.key, f]));
const films = new Map(snap.films.map((f: { key: string }) => [f.key, f]));
const ranked = tolly.heroes.filter((h: { index: number | null }) => h.index !== null).sort((a: { index: number }, b: { index: number }) => b.index - a.index);
const clean = (t: string) => t.replace(/^unlinked:/, "").replace(/\|\d{4}$/, "").replace(/ \((\d{4} )?(Indian |Telugu |Tamil |Malayalam )?film\)$/, "");

const out = slugs.map((slug) => {
  const h = tolly.heroes.find((x: { slug: string }) => x.slug === slug);
  const person = snap.heroes.find((x: { slug: string }) => x.slug === slug);
  const list = snap.credits
    .filter((c: { hero: string; include: boolean }) => c.hero === slug && c.include)
    .map((c: { film: string }) => {
      const f = films.get(c.film) as { title: string; year: number; releaseDate: string | null; languages: string[]; gross: { text: string; high: number } | null; verdict: { verdict: string; source: string } | null; teluguRelease?: string };
      const t = tfilms.get(c.film) as { title: string; index: number | null } | undefined;
      const kind = f.teluguRelease === "dubbed" ? "dubbed" : f.languages.some((l) => /telugu/i.test(l)) ? "telugu" : f.languages.some((l) => /hindi/i.test(l)) ? "hindi" : "other";
      return { key: c.film, title: clean(t?.title ?? f.title), year: f.year, date: f.releaseDate, kind, result: f.verdict?.verdict ?? null, checked: f.verdict?.source === "editor-check", gross: f.gross?.high ?? null, grossText: f.gross?.text ?? null, score: t?.index ?? null };
    })
    .sort((a: { date: string | null; year: number }, b: { date: string | null; year: number }) => (a.date ?? `${a.year}-07-01`).localeCompare(b.date ?? `${b.year}-07-01`));
  const next = snap.credits.find((c: { hero: string; excludeReason: string }) => c.hero === slug && /not yet released/.test(c.excludeReason ?? ""));
  return { slug, name: person.name, index: h.index, rank: ranked.findIndex((x: { slug: string }) => x.slug === slug) + 1, of: ranked.length, career: h.career, factors: h.factors, followers: h.followers, best: h.best, films: list, next: next ? clean((films.get(next.film) as { title: string })?.title ?? next.film) : null };
});
const json = JSON.stringify({ asOf: tolly.meta.asOf ?? null, heroes: out }, null, 1);
writeFileSync(`${dir}/data.json`, json);
// The same data as a script, so the video page also opens straight from disk (file://).
writeFileSync(`${dir}/data.js`, `window.DATA = ${json};\n`);
console.log(out.map((h) => `${h.name}: ${h.index} (#${h.rank}/${h.of}), ${h.films.length} films, next ${h.next}`).join("\n"));
