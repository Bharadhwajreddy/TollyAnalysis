import "server-only";
import type { ChangeLogEntry } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import type { CorrectionParsed, DATA_ACTIONS, REVIEW_STATUSES } from "@/lib/validation/corrections";

export type CorrectionStatus = "pending" | (typeof REVIEW_STATUSES)[number];

export interface CorrectionRecord extends Omit<CorrectionParsed, "website"> {
  id: string;
  status: CorrectionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  dataAction: (typeof DATA_ACTIONS)[number] | null;
}

export interface CorrectionStore {
  create(input: CorrectionParsed): Promise<{ id: string }>;
  list(filter?: { status?: CorrectionStatus; type?: string }): Promise<CorrectionRecord[]>;
  get(id: string): Promise<CorrectionRecord | null>;
  review(
    id: string,
    review: { status: (typeof REVIEW_STATUSES)[number]; reviewNote: string; dataAction?: (typeof DATA_ACTIONS)[number] },
    actor: string,
  ): Promise<CorrectionRecord | null>;
  changeLog(): Promise<ChangeLogEntry[]>;
}

/**
 * In-memory store used when no DATABASE_URL is configured (demo mode).
 * Submissions are private: they are never exposed by public routes.
 */
class MemoryStore implements CorrectionStore {
  private items: CorrectionRecord[] = [];
  private log: ChangeLogEntry[] = [];

  async create(input: CorrectionParsed) {
    const { website: _honeypot, ...rest } = input;
    void _honeypot;
    const id = crypto.randomUUID();
    this.items.unshift({ ...rest, id, status: "pending", submittedAt: new Date().toISOString(), reviewedAt: null, reviewNote: null, dataAction: null });
    return { id };
  }
  async list(filter: { status?: CorrectionStatus; type?: string } = {}) {
    return this.items.filter((i) => (!filter.status || i.status === filter.status) && (!filter.type || i.correctionType === filter.type));
  }
  async get(id: string) {
    return this.items.find((i) => i.id === id) ?? null;
  }
  async review(id: string, review: Parameters<CorrectionStore["review"]>[1], actor: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return null;
    const before = { status: item.status };
    Object.assign(item, { status: review.status, reviewNote: review.reviewNote, dataAction: review.dataAction ?? null, reviewedAt: new Date().toISOString() });
    this.log.unshift({
      id: crypto.randomUUID(),
      entityType: "correction_submission",
      entityId: id,
      action: `review:${review.status}${review.dataAction ? `:${review.dataAction}` : ""}`,
      reason: `${review.reviewNote} (was ${before.status})`,
      createdAt: new Date().toISOString(),
      actor,
    });
    return item;
  }
  async changeLog() {
    return [...this.log];
  }
}

const g = globalThis as unknown as { __taCorrections?: CorrectionStore };

export async function getCorrectionStore(): Promise<CorrectionStore> {
  if (g.__taCorrections) return g.__taCorrections;
  let store: CorrectionStore;
  if (serverEnv().DATABASE_URL) {
    const { PgCorrectionStore } = await import("./corrections-pg");
    store = new PgCorrectionStore();
  } else {
    store = new MemoryStore();
  }
  g.__taCorrections = store;
  return store;
}

export async function listChangeLog(): Promise<ChangeLogEntry[]> {
  return (await getCorrectionStore()).changeLog();
}
