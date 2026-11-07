#!/usr/bin/env bash
# Tolly Index — one command to bring everything up to date after new data arrives.
#
#   1. import the filled files from the Claude desktop app (or by hand) and check every row
#   2. re-link films (picks up IMDb ids an editor found)
#   3. recompute every film and hero (Letterboxd fills films IMDb cannot rate; fame joins when complete)
#   4. rebuild the Excel workbook and check it matches the app exactly
#   5. print what moved
# The site reads lib/data/tolly/, so committing and deploying publishes the new scores.
#
# Needs: the downloaded inputs in .cache/ (npm run tolly:all, or npm run tolly:restore -- <archive>).
# Usage: npm run tolly:update -- <folder with hero-social.csv and/or films-to-look-up.csv> [asOf=today]
set -euo pipefail
DIR="${1:?usage: npm run tolly:update -- <folder with the filled CSV files> [asOf]}"
AS_OF="${2:-$(date -u +%Y-%m-%d)}"
HERE="$(cd "$(dirname "$0")" && pwd)"
BEFORE="$(mktemp)"
cp lib/data/tolly/heroes.json "$BEFORE"

echo "== 1/4 import and check the filled files"
npx tsx "$HERE/import-manual.mts" "$DIR"
echo "== 2/4 link films"
npx tsx "$HERE/link-films.mts" >/dev/null
echo "== 3/4 compute scores (as of $AS_OF)"
npx tsx "$HERE/compute.mts" "$AS_OF" >/dev/null
echo "== 4/4 rebuild the workbook"
bash "$HERE/workbook/build.sh" | tail -2

npx tsx -e '
import { readFileSync } from "node:fs";
const before = JSON.parse(readFileSync(process.argv[1], "utf8"));
const after = JSON.parse(readFileSync("lib/data/tolly/heroes.json", "utf8"));
const ranks = (d: { heroes: { slug: string; name: string; index: number | null }[] }) => {
  const r = d.heroes.filter((h) => h.index !== null);
  return new Map(r.map((h) => [h.slug, { name: h.name, index: h.index as number, rank: 1 + r.filter((o) => (o.index as number) > (h.index as number)).length }]));
};
const a = ranks(before), b = ranks(after);
const f = after.meta.fame;
console.log(`\nranked heroes: ${a.size} → ${b.size}; fame ${f.applied ? "ON (" + f.weight * 100 + "%)" : "off: " + f.missing + " ranked heroes still need a follower count"}`);
for (const [slug, h] of b) {
  const o = a.get(slug);
  if (!o) console.log(`  new: ${h.name} #${h.rank} (${h.index})`);
  else if (o.rank !== h.rank || o.index !== h.index) console.log(`  ${h.name}: #${o.rank} ${o.index} → #${h.rank} ${h.index}`);
}
' "$BEFORE"
rm -f "$BEFORE"
echo -e "\nDone. Review the changes, then commit lib/data/tolly, lib/data/real and docs, and deploy."
