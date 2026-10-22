/**
 * Tolly Index — public Bluesky posts about each scored film (no key needed: Bluesky's public AppView
 * search). Three searches per film ("Title", "Title" telugu, "Title" <hero>), merged, then a post is
 * kept only when it clearly means the film: it names the film AND (for short or common titles) also
 * names a hero, the director, "telugu"/"tollywood" or the release year. Raw posts stay in the
 * gitignored cache; only per-film counts and scores are ever published.
 *
 * Output: .cache/tolly/bluesky.json  { filmKey: { hitsTotal, posts: [{ uri, createdAt, text, likes, reposts, replies, langs }] } }
 * Usage: NODE_USE_ENV_PROXY=1 npx tsx scripts/tolly/bluesky.mts [maxFilms]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { titleKey } from "@/lib/tolly/match";

const OUT = ".cache/tolly/bluesky.json";
const API = "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts";
const UA = "tollywood-analysis/0.6 (contact saibharadhwajreddy@gmail.com)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Post = { uri: string; createdAt: string; text: string; likes: number; reposts: number; replies: number; langs: string[] };
type Raw = { uri: string; likeCount?: number; repostCount?: number; replyCount?: number; record: { text?: string; createdAt?: string; langs?: string[] } };

async function search(q: string): Promise<{ hitsTotal: number; posts: Raw[] }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API}?${new URLSearchParams({ q, limit: "100", sort: "latest" })}`, { headers: { "user-agent": UA } }).catch(() => null);
    if (res?.ok) {
      const d = (await res.json()) as { hitsTotal?: number; posts?: Raw[] };
      return { hitsTotal: d.hitsTotal ?? 0, posts: d.posts ?? [] };
    }
    await sleep(Math.max(2, Number(res?.headers.get("retry-after")) || 2 ** attempt) * 1000);
  }
  throw new Error(`Bluesky search failed for ${q}`);
}

const snap = JSON.parse(readFileSync("lib/data/real/snapshot.json", "utf8"));
const heroName: Record<string, string> = Object.fromEntries((snap.heroes as { slug: string; name: string }[]).map((h) => [h.slug, h.name]));
const director: Record<string, string> = Object.fromEntries((snap.films as { key: string; director?: string | null }[]).map((f) => [f.key, f.director ?? ""]));
const films: { key: string; title: string; year: number; status: string; heroes: string[]; aliases?: string[] }[] = JSON.parse(readFileSync("lib/data/tolly/films.json", "utf8")).films;
const out: Record<string, { hitsTotal: number; posts: Post[] }> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const todo = films.filter((f) => (f.status === "complete" || f.status === "provisional") && !(f.key in out)).slice(0, Number(process.argv[2] ?? Infinity));
console.log(`Bluesky: ${todo.length} films to search`);

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
let n = 0;
for (const f of todo) {
  const heroWords = f.heroes.flatMap((s) => words(heroName[s] ?? s)).filter((w) => w.length >= 4);
  const dirWords = words(director[f.key] ?? "").filter((w) => w.length >= 4);
  const surname = words(heroName[f.heroes[0]] ?? "").filter((w) => w.length >= 3).pop();
  const queries = [`"${f.title}"`, `"${f.title}" telugu`, ...(surname ? [`"${f.title}" ${surname}`] : [])];
  const seen = new Map<string, Raw>();
  let hitsTotal = 0;
  for (const q of queries) {
    const r = await search(q);
    if (q === queries[0]) hitsTotal = r.hitsTotal;
    for (const p of r.posts) seen.set(p.uri, p);
    await sleep(350);
  }
  // A long, unusual title is enough on its own; a short or common one needs a second clue.
  const tk = titleKey(f.title);
  const titleWords = words(f.title);
  const distinctive = tk.length >= 10 || words(f.title).length >= 3;
  const clues = new Set(["telugu", "tollywood", String(f.year), ...heroWords, ...dirWords]);
  const filmWords = ["film", "movie", "cinema", "review", "trailer", "watched", "watching", "letterboxd"];
  const kept: Post[] = [];
  for (const p of seen.values()) {
    const text = p.record.text ?? "";
    const tw = words(text);
    // The title's words must appear together as a phrase (so "Indra" does not match "Indraganti").
    const at = tw.findIndex((_, i) => titleWords.every((w, j) => tw[i + j] === w));
    if (!titleWords.length || at < 0) continue;
    const hasClue = tw.some((w) => clues.has(w));
    const hasFilmWord = tw.some((w) => filmWords.includes(w)) || text.includes("★");
    if (!(hasClue || (distinctive && hasFilmWord))) continue;
    kept.push({
      uri: p.uri,
      createdAt: p.record.createdAt ?? "",
      text: text.slice(0, 600),
      likes: p.likeCount ?? 0,
      reposts: p.repostCount ?? 0,
      replies: p.replyCount ?? 0,
      langs: p.record.langs ?? [],
    });
  }
  out[f.key] = { hitsTotal, posts: kept };
  if (++n % 25 === 0) {
    writeFileSync(OUT, JSON.stringify(out));
    console.log(`  ${n}/${todo.length}`);
  }
}
writeFileSync(OUT, JSON.stringify(out));
const vals = Object.values(out);
console.log(`done: ${vals.filter((v) => v.posts.length).length} of ${vals.length} films have Bluesky posts; ${vals.filter((v) => v.posts.length >= 10).length} have 10 or more`);
