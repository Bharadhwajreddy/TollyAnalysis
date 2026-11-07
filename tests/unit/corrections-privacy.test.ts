import { describe, expect, it } from "vitest";
import { getCorrectionStore } from "@/lib/repositories/corrections";
import { CORRECTION_TYPES, correctionInputSchema } from "@/lib/validation/corrections";

describe("correction privacy", () => {
  it("keeps the contact email while open and deletes it once the correction is closed", async () => {
    const store = await getCorrectionStore();
    const input = correctionInputSchema.parse({
      correctionType: CORRECTION_TYPES[0],
      proposedCorrection: "The release year should be 2006",
      sourceUrl: "https://en.wikipedia.org/wiki/Kithakithalu",
      email: "fan@example.com",
    });
    const { id } = await store.create(input);
    await store.review(id, { status: "needs_more_evidence", reviewNote: "Which source?" }, "test");
    expect((await store.get(id))?.email).toBe("fan@example.com");
    await store.review(id, { status: "rejected", reviewNote: "Source disagrees" }, "test");
    expect((await store.get(id))?.email).toBe("");
  });
});
