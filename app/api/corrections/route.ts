import { NextResponse } from "next/server";
import { getCorrectionStore } from "@/lib/repositories/corrections";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { correctionInputSchema } from "@/lib/validation/corrections";

export async function POST(request: Request) {
  const limit = rateLimit(`corr:${clientIp(request.headers)}`, 5, 10 * 60_000);
  if (!limit.ok)
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );

  const body = await request.json().catch(() => null);
  const parsed = correctionInputSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid submission", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  // Honeypot filled: pretend success without storing.
  if (parsed.data.website) return NextResponse.json({ id: crypto.randomUUID() }, { status: 201 });

  const store = await getCorrectionStore();
  const { id } = await store.create(parsed.data);
  return NextResponse.json({ id, status: "pending" }, { status: 201 });
}
