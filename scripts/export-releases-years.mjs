import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = resolve(root, "lib/data/releases/releases.json");
const outDir = resolve(root, "public/data/releases");

const raw = JSON.parse(readFileSync(srcPath, "utf8"));
const asOf = raw.asOf;
const thisYear = Number(asOf.slice(0, 4));
const films = raw.films;

/** Released by the data date: dated films up to that day; undated films count in past years only. */
const isReleased = (r) => (r.date ? r.date <= asOf : r.year < thisYear);
const order = (a, b) =>
  (b.date ?? `${b.year}-00`).localeCompare(a.date ?? `${a.year}-00`) || a.title.localeCompare(b.title);

mkdirSync(outDir, { recursive: true });

let totalFiles = 0;
for (let y = 2000; y <= thisYear; y++) {
  const list = films.filter((r) => r.year === y);
  const payload = {
    released: list.filter(isReleased).sort(order),
    upcoming: list.filter((r) => !isReleased(r)).sort((a, b) => -order(a, b)),
  };
  writeFileSync(resolve(outDir, `${y}.json`), JSON.stringify(payload), "utf8");
  totalFiles++;
}

console.log(`Exported ${totalFiles} release year JSON files (2000-${thisYear}) to public/data/releases/`);
