import { upsertCredit } from "@/db/admin";
import { adminJsonRoute } from "@/lib/admin/route";
import { creditInput } from "@/lib/validation/admin";

export const POST = adminJsonRoute(creditInput, upsertCredit);
