import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { writeChangeLog } from "@/db/repository";
import { changeLog, correctionSubmissions } from "@/db/schema";
import type { ChangeLogEntry } from "@/lib/domain/types";
import type { CorrectionParsed } from "@/lib/validation/corrections";
import type { CorrectionRecord, CorrectionStatus, CorrectionStore } from "./corrections";

type Row = typeof correctionSubmissions.$inferSelect;

function toRecord(r: Row): CorrectionRecord {
  return {
    id: r.id,
    correctionType: r.submissionType as CorrectionRecord["correctionType"],
    heroName: r.heroNameText ?? "",
    filmName: r.filmNameText ?? "",
    currentValue: r.currentValue ?? "",
    proposedCorrection: r.submittedClaim,
    sourceUrl: r.evidenceUrl,
    explanation: r.explanation ?? "",
    email: r.email ?? "",
    status: r.status,
    submittedAt: r.submittedAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNote: r.reviewNote,
    dataAction: r.dataAction,
  };
}

export class PgCorrectionStore implements CorrectionStore {
  async create(input: CorrectionParsed) {
    const db = await getDb();
    const [row] = await db
      .insert(correctionSubmissions)
      .values({
        submissionType: input.correctionType,
        heroNameText: input.heroName || null,
        filmNameText: input.filmName || null,
        currentValue: input.currentValue || null,
        submittedClaim: input.proposedCorrection,
        proposedValue: input.proposedCorrection,
        evidenceUrl: input.sourceUrl,
        explanation: input.explanation || null,
        email: input.email || null,
      })
      .returning({ id: correctionSubmissions.id });
    return { id: row.id };
  }

  async list(filter: { status?: CorrectionStatus; type?: string } = {}) {
    const db = await getDb();
    const where = and(
      filter.status ? eq(correctionSubmissions.status, filter.status) : undefined,
      filter.type ? eq(correctionSubmissions.submissionType, filter.type) : undefined,
    );
    const rows = await db.select().from(correctionSubmissions).where(where).orderBy(desc(correctionSubmissions.submittedAt)).limit(500);
    return rows.map(toRecord);
  }

  async get(id: string) {
    const db = await getDb();
    const [row] = await db.select().from(correctionSubmissions).where(eq(correctionSubmissions.id, id));
    return row ? toRecord(row) : null;
  }

  async review(id: string, review: Parameters<CorrectionStore["review"]>[1], actor: string) {
    const db = await getDb();
    const before = await this.get(id);
    if (!before) return null;
    const [row] = await db
      .update(correctionSubmissions)
      .set({
        status: review.status,
        reviewNote: review.reviewNote,
        dataAction: review.dataAction ?? null,
        reviewedBy: actor,
        reviewedAt: new Date(),
      })
      .where(eq(correctionSubmissions.id, id))
      .returning();
    await writeChangeLog(db, {
      entityType: "correction_submission",
      entityId: id,
      action: `review:${review.status}${review.dataAction ? `:${review.dataAction}` : ""}`,
      reason: review.reviewNote,
      actorId: actor,
      before: { status: before.status },
      after: { status: review.status, dataAction: review.dataAction ?? null },
    });
    return toRecord(row);
  }

  async changeLog(): Promise<ChangeLogEntry[]> {
    // Live change log is already part of the dataset; nothing extra to merge.
    void changeLog;
    return [];
  }
}
