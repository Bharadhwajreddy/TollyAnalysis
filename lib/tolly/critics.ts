/**
 * Critics' scores quoted in a Wikipedia film article's reception section ("rated it 3.5 out of 5",
 * "gave 3/5"), normalised to 0–10. Used as a cross-check on the audience Rating pillar, not as an
 * input: fewer than one in five films from before 2008 have a quoted score, so using it would score
 * old and new films differently.
 */

/** The critics part of the article: "Critical reception/response" or "Reviews", else "Reception" without box office. */
export function receptionSection(wikitext: string): string {
  const headings = [...wikitext.matchAll(/^(={2,4})\s*([^=\n]+?)\s*\1\s*$/gm)].map((m) => ({ level: m[1].length, name: m[2], start: m.index!, end: m.index! + m[0].length }));
  const section = (i: number) => {
    const h = headings[i];
    const next = headings.slice(i + 1).find((x) => x.level <= h.level);
    return wikitext.slice(h.end, next ? next.start : undefined);
  };
  const critics = headings.findIndex((h) => /critic|review/i.test(h.name));
  if (critics >= 0) return section(critics);
  const reception = headings.findIndex((h) => /^reception$/i.test(h.name));
  if (reception < 0) return "";
  return section(reception).split(/^={2,4}\s*box office/im)[0];
}

/** Scores out of 10, one per quoted rating. */
export function criticScores(wikitext: string): number[] {
  const text = receptionSection(wikitext).replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, "");
  const out: number[] = [];
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*(5|10)\b(?!\s*(?:crore|lakh|million|%))/gi)) {
    const score = Number(m[1]);
    const scale = Number(m[2]);
    if (score > scale) continue;
    out.push((score / scale) * 10);
  }
  return out;
}

/** Pearson correlation of paired values. */
export function correlation(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}
