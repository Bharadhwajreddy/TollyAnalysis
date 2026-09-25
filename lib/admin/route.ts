import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { NotFoundError } from "@/db/admin";
import { getDb, type Db } from "@/db/client";
import { ADMIN_ACTOR, guardAdmin, requireDatabase } from "@/lib/auth/admin";
import { ProviderDisabledError, ProviderError } from "@/lib/providers/http";
import { invalidateCache } from "@/lib/repositories";

/**
 * Wraps an admin JSON route: auth, database presence, Zod validation, error mapping
 * and cache invalidation after writes. Every write is audited in change_log by the handler.
 */
export function adminJsonRoute<S extends ZodType>(schema: S, handler: (db: Db, input: ReturnType<S["parse"]>, actor: string) => Promise<unknown>) {
  return async (req: Request) => {
    const denied = (await guardAdmin(req)) ?? requireDatabase();
    if (denied) return denied;
    try {
      const body = await req.json().catch(() => {
        throw new ZodError([{ code: "custom", path: [], message: "Body must be JSON", input: undefined }]);
      });
      const input = schema.parse(body) as ReturnType<S["parse"]>;
      const result = await handler(await getDb(), input, ADMIN_ACTOR);
      invalidateCache();
      return NextResponse.json({ ok: true, result }, { status: 201 });
    } catch (err) {
      return adminError(err);
    }
  };
}

export function adminError(err: unknown) {
  if (err instanceof ZodError)
    return NextResponse.json({ error: "Invalid request", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
  if (err instanceof ProviderDisabledError) return NextResponse.json({ error: err.message }, { status: 409 });
  if (err instanceof ProviderError) return NextResponse.json({ error: err.message }, { status: 502 });
  console.error(err);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
