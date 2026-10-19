/**
 * Tolly Index — discussion threads from Reddit's Data API (needs REDDIT_CLIENT_ID and
 * REDDIT_CLIENT_SECRET from a "script" app at reddit.com/prefs/apps; read Reddit's Data API terms
 * for our use first). For each complete or provisional film, searches r/tollywood, r/telugu and
 * r/kollywood for threads naming the film and its year, and keeps each thread's score, comment
 * count and up to 50 top comments for the Voice pillar. About 60 requests a minute.
 *
 * Output: .cache/tolly/reddit.json  { filmKey: { threads: [{ id, title, sub, score, comments, created, sample }] } }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/reddit.mts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ID = process.env.REDDIT_CLIENT_ID;
const SECRET = process.env.REDDIT_CLIENT_SECRET;
if (!ID || !SECRET) {
  console.log("Reddit skipped: set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (reddit.com/prefs/apps → create a 'script' app).");
  process.exit(0);
}
const UA = "web:tollywood-analysis:0.5 (contact saibharadhwajreddy@gmail.com)";
const OUT = ".cache/tolly/reddit.json";
const SUBS = "tollywood+telugu+kollywood";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
  method: "POST",
  headers: { authorization: `Basic ${Buffer.from(`${ID}:${SECRET}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded", "user-agent": UA },
  body: "grant_type=client_credentials",
});
if (!tokenRes.ok) {
  console.error(`Reddit refused the app credentials (${tokenRes.status}).`);
  process.exit(1);
}
const { access_token } = (await tokenRes.json()) as { access_token: string };
const api = async <T>(path: string): Promise<T> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://oauth.reddit.com${path}`, { headers: { authorization: `Bearer ${access_token}`, "user-agent": UA } });
    if (res.ok) return (await res.json()) as T;
    await sleep(Math.max(2, Number(res.headers.get("retry-after")) || 2 ** attempt) * 1000);
  }
  throw new Error(`Reddit failed on ${path}`);
};

type Thread = { id: string; title: string; sub: string; score: number; comments: number; created: string; sample: string[] };
const out: Record<string, { threads: Thread[] }> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const films: { key: string; title: string; year: number; status: string }[] = JSON.parse(readFileSync("lib/data/tolly/films.json", "utf8")).films;
const todo = films.filter((f) => (f.status === "complete" || f.status === "provisional") && !(f.key in out));
console.log(`Reddit: ${todo.length} films to search`);

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
let n = 0;
for (const f of todo) {
  const q = encodeURIComponent(`"${f.title}"`);
  const res = await api<{ data: { children: { data: { id: string; title: string; subreddit: string; score: number; num_comments: number; created_utc: number; selftext: string } }[] } }>(
    `/r/${SUBS}/search?q=${q}&restrict_sr=1&sort=relevance&limit=25&type=link`,
  );
  // A thread counts only when it names the film, plus the year, the word movie/film or a review.
  const threads = res.data.children
    .map((c) => c.data)
    .filter((d) => norm(d.title + " " + d.selftext).includes(norm(f.title)) && new RegExp(`${f.year}|movie|film|review|trailer`, "i").test(d.title + " " + d.selftext));
  const kept: Thread[] = [];
  for (const d of threads.slice(0, 5)) {
    const comments = await api<[unknown, { data: { children: { kind: string; data: { body?: string } }[] } }]>(`/comments/${d.id}?limit=50&depth=1&sort=top`);
    kept.push({
      id: d.id,
      title: d.title,
      sub: d.subreddit,
      score: d.score,
      comments: d.num_comments,
      created: new Date(d.created_utc * 1000).toISOString().slice(0, 10),
      sample: comments[1].data.children.filter((c) => c.kind === "t1" && c.data.body).map((c) => c.data.body as string),
    });
    await sleep(1000);
  }
  out[f.key] = { threads: kept };
  if (++n % 25 === 0) {
    writeFileSync(OUT, JSON.stringify(out));
    console.log(`  ${n}/${todo.length}`);
  }
  await sleep(1000);
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`done: ${Object.values(out).filter((v) => v.threads.length).length} films with Reddit threads`);
