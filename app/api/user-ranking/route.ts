import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { userRankingEnabled } from "@/lib/features";
import { getHeroSnapshots } from "@/lib/repositories";
import { getUserRankingStore, type Picks } from "@/lib/repositories/user-rankings";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

const DEVICE_COOKIE = "ta_device";
const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const body = z.object({ picks: z.tuple([slug, slug, slug]) }).refine((b) => new Set(b.picks).size === 3, {
  message: "Pick three different heroes",
});

function disabled() {
  return NextResponse.json({ error: "Fan ranking is switched off" }, { status: 404 });
}

/** Aggregated fan ranking plus this device's own ballot. */
export async function GET() {
  if (!userRankingEnabled()) return disabled();
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  const store = getUserRankingStore();
  const [results, mine] = await Promise.all([store.results(), deviceId ? store.mine(deviceId) : null]);
  return NextResponse.json({ ...results, mine }, { headers: { "cache-control": "no-store" } });
}

/** One ballot per device (identified by an httpOnly cookie); re-voting replaces it. */
export async function POST(req: Request) {
  if (!userRankingEnabled()) return disabled();
  const limit = rateLimit(`fan:${clientIp(req.headers)}`, 20, 60 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many votes from this network. Try later." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid ballot" }, { status: 400 });
  const known = new Set((await getHeroSnapshots("all_time", true)).map((s) => s.slug));
  if (!parsed.data.picks.every((p) => known.has(p))) return NextResponse.json({ error: "Unknown hero" }, { status: 400 });

  const jar = await cookies();
  let deviceId = jar.get(DEVICE_COOKIE)?.value;
  const isNew = !deviceId || !/^[0-9a-f-]{36}$/.test(deviceId);
  if (isNew) deviceId = crypto.randomUUID();
  const store = getUserRankingStore();
  await store.submit(deviceId!, parsed.data.picks as Picks);
  const res = NextResponse.json({ ok: true, ...(await store.results()), mine: parsed.data.picks });
  if (isNew)
    res.cookies.set(DEVICE_COOKIE, deviceId!, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  return res;
}
