import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { ADMIN_COOKIE, safeEqual, verifySessionValue } from "./session";

export const ADMIN_ACTOR = "admin";

/** Accepts `Authorization: Bearer <ADMIN_TOKEN>` (scripts) or a valid session cookie (browser). */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const token = serverEnv().ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && safeEqual(auth.slice(7), token)) return true;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionValue(cookie, token);
}

/** Returns a 401/503 response when the caller is not an admin, otherwise null. */
export async function guardAdmin(req: Request): Promise<NextResponse | null> {
  if (!serverEnv().ADMIN_TOKEN)
    return NextResponse.json({ error: "Admin access is not configured (set ADMIN_TOKEN)." }, { status: 503 });
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Basic CSRF defence for cookie-authenticated browser requests.
  const origin = req.headers.get("origin");
  if (origin && !req.headers.get("authorization")) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host && new URL(origin).host !== host) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }
  return null;
}

/** For admin server components: redirect to the login page unless signed in. */
export async function requireAdminPage() {
  const token = serverEnv().ADMIN_TOKEN;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionValue(cookie, token))) redirect("/admin/login");
}

export function requireDatabase(): NextResponse | null {
  return serverEnv().DATABASE_URL
    ? null
    : NextResponse.json({ error: "This action needs a database. Set DATABASE_URL (see README)." }, { status: 503 });
}
