import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, createSessionValue, safeEqual, SESSION_TTL_MS } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

/** Sign in with ADMIN_TOKEN → httpOnly session cookie. DELETE signs out. */
export async function POST(req: Request) {
  const limit = rateLimit(`login:${clientIp(req.headers)}`, 10, 15 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  const token = serverEnv().ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: "ADMIN_TOKEN is not configured" }, { status: 503 });
  const parsed = z.object({ token: z.string().min(1).max(500) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !safeEqual(parsed.data.token, token)) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionValue(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
