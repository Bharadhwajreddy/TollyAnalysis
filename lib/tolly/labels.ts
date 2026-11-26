/** What a film is missing, in words for visitors (the site does not name its rating sources). */
export function missingLabel(m: string): string {
  if (/^IMDb title$/i.test(m)) return "a confirmed film match";
  if (/^IMDb rating/i.test(m)) return "enough audience ratings";
  if (/release year/i.test(m)) return "a confirmed release year";
  if (/page views/i.test(m)) return "audience-interest data";
  return m.replace(/IMDb|TMDB|Letterboxd/gi, "audience");
}
