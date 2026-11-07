/**
 * Every outside source this site's numbers come from, with its licence and what we owe for it.
 * One list feeds the source ledger, the terms and the footer, so they cannot drift apart.
 * Keep it in step with docs/legal/README.md.
 */
export interface DataSource {
  name: string;
  /** What we take from it and where it shows up. */
  use: string;
  licence: string;
  /** What the licence asks of us (attribution, limits). */
  obligations: string;
  url?: string;
}

export const IMDB_ATTRIBUTION = "Information courtesy of IMDb (https://www.imdb.com). Used with permission.";
export const TMDB_NOTICE = "This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.";

export const DATA_SOURCES: DataSource[] = [
  {
    name: "English and Telugu Wikipedia",
    use: "Heroes' filmographies, film facts (release dates, budgets, grosses), box-office verdicts and the sentences they come from; critics' scores quoted in articles (cross-check only).",
    licence: "CC BY-SA 4.0 (text)",
    obligations: "Credit Wikipedia and link to the article; quoted text stays under CC BY-SA. Facts themselves are not copyrighted.",
    url: "https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content",
  },
  {
    name: "Wikidata",
    use: "Film and hero identifiers, release dates, original language, language editions, profile facts (birth, family, awards), X follower counts with dates.",
    licence: "CC0 (public domain)",
    obligations: "None required; credited as good practice.",
    url: "https://www.wikidata.org/wiki/Wikidata:Licensing",
  },
  {
    name: "Wikimedia page views",
    use: "How many people read each film's English and Telugu article in the last 60 days (the Tolly Index's Stay pillar).",
    licence: "CC0",
    obligations: "None required; credited as good practice.",
    url: "https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews",
  },
  {
    name: "Wikimedia Commons",
    use: "Hero photos.",
    licence: "Each photo's own free licence (CC BY, CC BY-SA or public domain)",
    obligations: "Credit author and licence for every photo (see Photo credits).",
    url: "https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia",
  },
  {
    name: "IMDb non-commercial datasets",
    use: "Audience ratings and vote counts, used only to compute the Tolly Index; the raw numbers are never shown or published.",
    licence: "Personal and non-commercial use only (IMDb Non-Commercial Licensing)",
    obligations: `Show "${IMDB_ATTRIBUTION}" No commercial use, no republishing the data, no scraping the IMDb website. Commercial use needs an IMDb licence.`,
    url: "https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX",
  },
  {
    name: "TMDB API",
    use: "A second audience rating, used only as a cross-check of IMDb; not shown on the site.",
    licence: "TMDB API Terms of Use: free for non-commercial use",
    obligations: `Show the TMDB logo and "${TMDB_NOTICE}" Keep cached data no longer than 6 months. Commercial use needs a TMDB agreement.`,
    url: "https://www.themoviedb.org/api-terms-of-use",
  },
  {
    name: "MovieLens 32M (GroupLens Research)",
    use: "Research ratings, used only as a cross-check of IMDb; not shown on the site.",
    licence: "GroupLens research licence: non-commercial, no redistribution",
    obligations: "Cite F. Maxwell Harper and Joseph A. Konstan, “The MovieLens Datasets: History and Context”, ACM TiiS 5(4), 2015, wherever results are published.",
    url: "https://files.grouplens.org/datasets/movielens/ml-32m-README.html",
  },
  {
    name: "Official social-media profiles",
    use: "Heroes' public follower counts on Instagram, X, YouTube and Facebook, read from their verified profiles on a stated date (fame part of the Tolly Index).",
    licence: "Public facts; each platform's terms apply to how they are collected",
    obligations: "Only counts shown publicly on verified official profiles, dated; no posts, photos or personal data stored.",
  },
  {
    name: "Press articles",
    use: "One dated article's reported Instagram follower counts, used until an official count is checked.",
    licence: "Facts reported by the publisher",
    obligations: "Name and link the article and its date.",
    url: "https://andhravilas.net/tollywood-instagram-kings-allu-arjun-leads/",
  },
];
