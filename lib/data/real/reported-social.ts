/**
 * Instagram follower counts as reported in the press. Instagram itself is never scraped;
 * counts come from one dated article so every hero is compared at the same moment.
 * Heroes the article does not name have no Instagram value (shown as "—", never zero).
 * Replace with the Meta Graph API (FEATURE_INSTAGRAM) when credentials are available.
 */
export const REPORTED_INSTAGRAM = {
  source: "Andhravilas — “Tollywood's Instagram Kings: Allu Arjun Leads”",
  url: "https://andhravilas.net/tollywood-instagram-kings-allu-arjun-leads/",
  date: "2026-10-03",
  followers: {
    "allu-arjun": 27_900_000,
    "ram-charan": 23_900_000,
    "vijay-deverakonda": 23_100_000,
    "mahesh-babu": 15_400_000,
    prabhas: 13_900_000,
    "jr-ntr": 8_100_000,
  } as Record<string, number>,
};
