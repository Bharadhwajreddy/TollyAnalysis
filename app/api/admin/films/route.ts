import { upsertFilm } from "@/db/admin";
import { adminJsonRoute } from "@/lib/admin/route";
import { filmInput } from "@/lib/validation/admin";

export const POST = adminJsonRoute(filmInput, upsertFilm);
