import "server-only";
import { serverEnv } from "@/lib/env";

export type Picks = [string, string, string];

export interface FanResult {
  slug: string;
  points: number;
  first: number;
  second: number;
  third: number;
}

export interface UserRankingStore {
  submit(deviceId: string, picks: Picks): Promise<void>;
  mine(deviceId: string): Promise<Picks | null>;
  results(): Promise<{ voters: number; results: FanResult[] }>;
}

/** 1st place = 3 points, 2nd = 2, 3rd = 1. */
export function tally(ballots: Picks[]): { voters: number; results: FanResult[] } {
  const map = new Map<string, FanResult>();
  const row = (slug: string) => {
    let r = map.get(slug);
    if (!r) map.set(slug, (r = { slug, points: 0, first: 0, second: 0, third: 0 }));
    return r;
  };
  for (const [a, b, c] of ballots) {
    const ra = row(a);
    ra.points += 3;
    ra.first++;
    const rb = row(b);
    rb.points += 2;
    rb.second++;
    const rc = row(c);
    rc.points += 1;
    rc.third++;
  }
  return {
    voters: ballots.length,
    results: [...map.values()].sort((x, y) => y.points - x.points || y.first - x.first || x.slug.localeCompare(y.slug)),
  };
}

class MemoryStore implements UserRankingStore {
  private ballots = new Map<string, Picks>();
  async submit(deviceId: string, picks: Picks) {
    this.ballots.set(deviceId, picks);
  }
  async mine(deviceId: string) {
    return this.ballots.get(deviceId) ?? null;
  }
  async results() {
    return tally([...this.ballots.values()]);
  }
}

class PgStore implements UserRankingStore {
  private async db() {
    const { getDb } = await import("@/db/client");
    return getDb();
  }
  async submit(deviceId: string, picks: Picks) {
    const { userRankings } = await import("@/db/schema");
    const db = await this.db();
    const values = { deviceId, firstSlug: picks[0], secondSlug: picks[1], thirdSlug: picks[2], updatedAt: new Date() };
    await db.insert(userRankings).values(values).onConflictDoUpdate({ target: userRankings.deviceId, set: values });
  }
  async mine(deviceId: string) {
    const { userRankings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [r] = await (await this.db()).select().from(userRankings).where(eq(userRankings.deviceId, deviceId));
    return r ? ([r.firstSlug, r.secondSlug, r.thirdSlug] as Picks) : null;
  }
  async results() {
    const { userRankings } = await import("@/db/schema");
    const rows = await (await this.db())
      .select({ a: userRankings.firstSlug, b: userRankings.secondSlug, c: userRankings.thirdSlug })
      .from(userRankings)
      .limit(100_000);
    return tally(rows.map((r) => [r.a, r.b, r.c] as Picks));
  }
}

const g = globalThis as unknown as { __taFanStore?: UserRankingStore };

export function getUserRankingStore(): UserRankingStore {
  if (!g.__taFanStore) g.__taFanStore = serverEnv().DATABASE_URL ? new PgStore() : new MemoryStore();
  return g.__taFanStore;
}
