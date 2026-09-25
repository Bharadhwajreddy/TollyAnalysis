import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionValue } from "@/lib/auth/session";

/** Protects admin pages; admin API routes check auth themselves (cookie or bearer token). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySessionValue(request.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_TOKEN);
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
