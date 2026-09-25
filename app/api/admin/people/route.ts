import { upsertPerson } from "@/db/admin";
import { adminJsonRoute } from "@/lib/admin/route";
import { personInput } from "@/lib/validation/admin";

export const POST = adminJsonRoute(personInput, upsertPerson);
