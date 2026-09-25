import type { Credit, Film } from "@/lib/domain/types";

export const SCOPE_START_DATE = "2000-01-01";

export const LEAD_ROLE_SCOPES = new Set<Credit["roleScope"]>([
  "principal_male_lead",
  "co_principal_male_lead",
]);

export type IneligibleReason =
  | "credit_not_approved"
  | "not_a_lead_role"
  | "not_a_feature"
  | "not_released"
  | "no_telugu_release"
  | "re_release"
  | "before_scope_start"
  | "undated";

/** Film-level scope rule: released feature with an original or dubbed Telugu release from 2000 onward. */
export function filmIneligibility(film: Film): IneligibleReason | null {
  if (film.featureType !== "feature") return "not_a_feature";
  if (film.status !== "released") return "not_released";
  if (!film.teluguRelease.isEligibleTeluguRelease) return "no_telugu_release";
  if (film.teluguRelease.isReRelease) return "re_release";
  if (!film.teluguRelease.releaseDate) return "undated";
  if (film.teluguRelease.releaseDate < SCOPE_START_DATE) return "before_scope_start";
  return null;
}

/**
 * A credit counts only for verified principal or co-principal male leads.
 * Cast order is never used; role scope must be explicitly approved.
 */
export function creditIneligibility(credit: Credit, film: Film): IneligibleReason | null {
  if (credit.eligibilityStatus !== "approved") return "credit_not_approved";
  if (!LEAD_ROLE_SCOPES.has(credit.roleScope)) return "not_a_lead_role";
  return filmIneligibility(film);
}

export function isEligibleLeadCredit(credit: Credit, film: Film): boolean {
  return creditIneligibility(credit, film) === null;
}
