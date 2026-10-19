/**
 * Tolly Index — trailer attention and comments from the YouTube Data API v3 (needs YOUTUBE_API_KEY
 * from a Google Cloud project with the API enabled). For each complete or provisional film, finds the
 * most relevant official trailer ("<title> <year> Telugu trailer"), then reads its views, likes and
 * comment count, and up to 100 top-level comments for the Voice pillar.
 *
 * Quota: a search costs 100 units and the free quota is 10,000 a day, so about 95 films a day. The
 * script stops before the quota runs out and resumes where it left off the next day (~2 weeks for
 * every film). Newest films first, since they matter most for Voice.
 *
 * Output: .cache/tolly/youtube.json  { filmKey: { videoId, title, channel, views, likes, comments, sample: string[] } | null }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/youtube.mts [maxSearches=95]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) {
  console.log("YouTube skipped: set YOUTUBE_API_KEY (Google Cloud console → enable YouTube Data API v3 → Credentials → API key).");
  process.exit(0);
}
const OUT = ".cache/tolly/youtube.json";
const MAX_SEARCHES = Number(process.argv[2] ?? 95);
const API = "https://www.googleapis.com/youtube/v3";
type Hit = { videoId: string; title: string; channel: string; views: number; likes: number; comments: number; sample: string[] } | null;
const out: Record<string, Hit> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const films: { key: string; title: string; year: number; status: string }[] = JSON.parse(readFileSync("lib/data/tolly/films.json", "utf8")).films;
const todo = films.filter((f) => (f.status === "complete" || f.status === "provisional") && !(f.key in out)).sort((a, b) => b.year - a.year);
console.log(`YouTube: ${todo.length} films left; searching up to ${MAX_SEARCHES} today`);

async function get<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const res = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key: KEY as string })}`);
  if (res.status === 403) {
    const body = await res.text();
    if (/quota/i.test(body)) {
      console.log("Daily quota reached; run again tomorrow.");
      return null;
    }
    if (/commentsDisabled/i.test(body)) return { items: [] } as T;
    throw new Error(`YouTube 403: ${body.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`YouTube ${res.status} on ${path}`);
  return (await res.json()) as T;
}

let searches = 0;
for (const f of todo) {
  if (searches >= MAX_SEARCHES) break;
  searches++;
  const s = await get<{ items: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] }>("search", {
    part: "snippet",
    type: "video",
    maxResults: "5",
    q: `${f.title} ${f.year} Telugu trailer`,
  });
  if (!s) break;
  // Keep a result only when its title names the film and says "trailer" or "teaser".
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = s.items.find((i) => norm(i.snippet.title).includes(norm(f.title)) && /trailer|teaser/i.test(i.snippet.title));
  if (!hit) {
    out[f.key] = null;
    continue;
  }
  const v = await get<{ items: { statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }[] }>("videos", { part: "statistics", id: hit.id.videoId });
  const c = await get<{ items: { snippet: { topLevelComment: { snippet: { textOriginal: string } } } }[] }>("commentThreads", {
    part: "snippet",
    videoId: hit.id.videoId,
    maxResults: "100",
    order: "relevance",
    textFormat: "plainText",
  });
  const st = v?.items[0]?.statistics ?? {};
  out[f.key] = {
    videoId: hit.id.videoId,
    title: hit.snippet.title,
    channel: hit.snippet.channelTitle,
    views: Number(st.viewCount ?? 0),
    likes: Number(st.likeCount ?? 0),
    comments: Number(st.commentCount ?? 0),
    sample: (c?.items ?? []).map((i) => i.snippet.topLevelComment.snippet.textOriginal),
  };
  writeFileSync(OUT, JSON.stringify(out));
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`done today: ${searches} searches; ${Object.values(out).filter(Boolean).length} trailers found so far, ${todo.length - searches} films left`);
