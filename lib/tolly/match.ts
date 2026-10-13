/**
 * Title matching for Telugu films across sources that spell transliterations differently
 * ("Kithakithalu" / "Kitakitalu", "Chatrapathi" / "Chhatrapati"). Only ever used inside a small
 * candidate set — the same hero's films within a year of each other — never across all films.
 */

/** Exact key: lower case, no "(2006 film)" qualifiers, letters and digits only. */
export function titleKey(t: string): string {
  return t
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

/** Sound key: folds the usual Telugu romanisation variants (aspirates, long vowels, doubled letters). */
export function soundKey(t: string): string {
  return titleKey(t)
    .replace(/^the/, "")
    .replace(/([bcdgjkpt])h/g, "$1")
    .replace(/sh/g, "s")
    .replace(/aa/g, "a")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u")
    .replace(/w/g, "v")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

/** Same film title? Exact key, same sound key, or one small slip in a long title. */
export function titlesMatch(a: string, b: string): boolean {
  const ka = titleKey(a);
  const kb = titleKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const sa = soundKey(a);
  const sb = soundKey(b);
  if (sa === sb) return true;
  return Math.min(sa.length, sb.length) >= 7 && editDistance(sa, sb) <= 1;
}

/**
 * Looser test for the last step of linking, when the candidates are already the same hero's films
 * within a year: also accepts a subtitle ("Bhairava" / "Bhairava IPS", "Epic" / "Epic - First
 * Semester") and two slips in a long title ("Amaravathi" / "Amavarathi").
 */
export function titlesLooselyMatch(a: string, b: string): boolean {
  if (titlesMatch(a, b)) return true;
  const [s, l] = [soundKey(a), soundKey(b)].sort((x, y) => x.length - y.length);
  if (s.length >= 4 && l.startsWith(s)) {
    const longer = soundKey(a).length >= soundKey(b).length ? a : b;
    const shorter = longer === a ? b : a;
    // The extra words must start after a word boundary in the longer title.
    const rest = longer.toLowerCase().replace(/\(.*?\)/g, "").trim().slice(shorter.replace(/\(.*?\)/g, "").trim().length);
    if (/^[\s:\-–—]/.test(rest)) return true;
  }
  return s.length >= 8 && editDistance(s, l) <= 2;
}
