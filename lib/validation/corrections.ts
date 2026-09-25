import { z } from "zod";

export const CORRECTION_TYPES = [
  "hero_eligibility",
  "film_credit_role",
  "release_date_or_language",
  "audience_rating",
  "commercial_or_platform_evidence",
  "social_profile",
  "missing_film",
  "other",
] as const;

export const CORRECTION_TYPE_LABEL: Record<(typeof CORRECTION_TYPES)[number], string> = {
  hero_eligibility: "Hero eligibility",
  film_credit_role: "Film credit / lead role",
  release_date_or_language: "Release date or language",
  audience_rating: "Audience rating evidence",
  commercial_or_platform_evidence: "Commercial or OTT platform evidence",
  social_profile: "Official social profile",
  missing_film: "Missing film",
  other: "Other",
};

/** Accepts only http(s) URLs without credentials; strips whitespace. */
export const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .url("Enter a full URL starting with https://")
  .refine((v) => {
    try {
      const u = new URL(v);
      return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Only http(s) links without embedded credentials are accepted");

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    // strip control characters except newlines/tabs
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""));

export const correctionInputSchema = z.object({
  correctionType: z.enum(CORRECTION_TYPES),
  heroName: text(120).optional().default(""),
  filmName: text(200).optional().default(""),
  currentValue: text(1000).optional().default(""),
  proposedCorrection: text(2000).pipe(z.string().min(3, "Describe the proposed correction")),
  sourceUrl: safeUrl,
  explanation: text(4000).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email or leave blank").max(200)]).optional().default(""),
  /** Honeypot: must stay empty. */
  website: z.string().max(0).optional().default(""),
});

export type CorrectionInput = z.input<typeof correctionInputSchema>;
export type CorrectionParsed = z.output<typeof correctionInputSchema>;

export const REVIEW_STATUSES = ["under_review", "approved", "rejected", "needs_more_evidence"] as const;
export const DATA_ACTIONS = ["update_record", "create_record", "create_source_claim", "no_data_change"] as const;

export const correctionReviewSchema = z
  .object({
    status: z.enum(REVIEW_STATUSES),
    reviewNote: text(2000).pipe(z.string().min(3, "Add a review note")),
    dataAction: z.enum(DATA_ACTIONS).optional(),
  })
  .refine((v) => v.status !== "approved" || !!v.dataAction, {
    message: "Approval requires an explicit data action",
    path: ["dataAction"],
  });
