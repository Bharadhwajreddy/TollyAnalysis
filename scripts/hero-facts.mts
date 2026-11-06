/**
 * Hero profile facts from Wikidata (CC0): birth date and place, death date, education, awards,
 * family (father, mother, spouse, siblings, children, relatives), political party, offices held,
 * height and official website. Shown on the hero page; not part of any score.
 *
 * Output: lib/data/real/hero-facts.json  { slug: { birthDate, birthPlace, deathDate, ... } }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/hero-facts.mts
 */
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "lib/data/real/hero-facts.json";
const PROPS: Record<string, string> = {
  P569: "birthDate",
  P19: "birthPlace",
  P570: "deathDate",
  P2048: "heightCm",
  P69: "education",
  P166: "awards",
  P22: "father",
  P25: "mother",
  P26: "spouse",
  P3373: "siblings",
  P40: "children",
  P1038: "relatives",
  P102: "party",
  P39: "offices",
  P856: "website",
};
const LISTS = new Set(["education", "awards", "spouse", "siblings", "children", "relatives", "party", "offices"]);

const heroes: { slug: string; qid: string | null }[] = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8")).heroes;
const bySlug = new Map(heroes.filter((h) => h.qid).map((h) => [h.qid as string, h.slug]));
const query = `SELECT ?h ?p ?v ?vLabel WHERE {
  VALUES ?h { ${[...bySlug.keys()].map((q) => `wd:${q}`).join(" ")} }
  VALUES ?p { ${Object.keys(PROPS).map((p) => `wdt:${p}`).join(" ")} }
  ?h ?p ?v .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
const res = await fetch(`https://query.wikidata.org/sparql?${new URLSearchParams({ query })}`, {
  headers: { accept: "application/sparql-results+json", "user-agent": "tollywood-analysis/0.6 (research project)" },
});
if (!res.ok) throw new Error(`Wikidata ${res.status}`);
const rows = ((await res.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;

type Facts = Record<string, string | number | string[]>;
const out: Record<string, Facts> = {};
for (const r of rows) {
  const slug = bySlug.get(r.h.value.split("/").pop() as string);
  const key = PROPS[r.p.value.split("/").pop() as string];
  if (!slug || !key) continue;
  const label = r.vLabel?.value ?? r.v.value;
  // Unlabelled items come back as bare Q-ids; they say nothing to a reader.
  if (/^Q\d+$/.test(label)) continue;
  const value = key === "birthDate" || key === "deathDate" ? r.v.value.slice(0, 10) : key === "heightCm" ? Math.round(Number(r.v.value) * (Number(r.v.value) < 3 ? 100 : 1)) : label;
  const f = (out[slug] ??= {});
  if (LISTS.has(key)) {
    const list = (f[key] as string[] | undefined) ?? [];
    if (!list.includes(value as string)) list.push(value as string);
    f[key] = list;
  } else if (!(key in f) || (key === "birthDate" && String(value) < String(f[key]))) {
    f[key] = value;
  }
}
for (const f of Object.values(out)) for (const k of LISTS) if (Array.isArray(f[k])) (f[k] as string[]).sort();
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
writeFileSync(OUT, JSON.stringify({ source: "Wikidata (CC0)", fetched: new Date().toISOString().slice(0, 10), heroes: sorted }, null, 1) + "\n");
console.log(`wrote ${OUT}: ${Object.keys(out).length} heroes`);
