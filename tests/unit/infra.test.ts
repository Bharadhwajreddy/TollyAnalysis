import { describe, expect, it, vi } from "vitest";
import { parseCsv } from "@/lib/csv";
import { createSessionValue, safeEqual, SESSION_TTL_MS, verifySessionValue } from "@/lib/auth/session";
import { fetchJson, ProviderError } from "@/lib/providers/http";
import { mapCandidateFilms } from "@/lib/providers/tmdb";
import { rateLimit } from "@/lib/security/rate-limit";
import { correctionInputSchema, correctionReviewSchema } from "@/lib/validation/corrections";
import { sourceClaimInput } from "@/lib/validation/admin";

const res = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

describe("fetchJson retries and backoff", () => {
  it("retries 429 honouring Retry-After, then succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(res(429, {}, { "retry-after": "2" }))
      .mockResolvedValueOnce(res(503))
      .mockResolvedValueOnce(res(200, { ok: 1 }));
    await expect(fetchJson("https://x", { provider: "t", fetchImpl, sleep })).resolves.toEqual({ ok: 1 });
    expect(sleep).toHaveBeenNthCalledWith(1, 2000);
    expect(sleep).toHaveBeenNthCalledWith(2, 2000); // 2^1 s backoff
  });
  it("does not retry other 4xx", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(res(404));
    await expect(fetchJson("https://x", { provider: "t", fetchImpl, sleep: async () => {} })).rejects.toBeInstanceOf(ProviderError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("gives up after the retry budget", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("ECONNRESET"));
    await expect(fetchJson("https://x", { provider: "t", fetchImpl, retries: 2, sleep: async () => {} })).rejects.toThrow(/network error/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("TMDb mapping", () => {
  it("keeps 2000+ films, dedupes, marks non-Telugu as dub candidates and never infers lead status", () => {
    const out = mapCandidateFilms([
      { id: 1, title: "A", original_title: "A", original_language: "te", release_date: "2010-01-01", order: 0, vote_average: 7, vote_count: 100 },
      { id: 1, title: "A", original_title: "A", original_language: "te", release_date: "2010-01-01", order: 0 },
      { id: 2, title: "B", original_title: "B", original_language: "ta", release_date: "2015-01-01", order: 3, vote_count: 0 },
      { id: 3, title: "Old", original_title: "Old", original_language: "te", release_date: "1995-01-01" },
    ]);
    expect(out.map((f) => f.tmdbMovieId)).toEqual([1, 2]);
    expect(out[1].releaseType).toBe("dubbed");
    expect(out[1].tmdbRating).toBeNull();
    expect(Object.keys(out[0])).not.toContain("roleScope");
  });
});

describe("CSV parser", () => {
  it("handles quotes, commas and CRLF", () => {
    const rows = parseCsv('a,b,c\r\n1,"x, y","say ""hi"""\r\n\r\n2,,z\n');
    expect(rows).toEqual([
      { a: "1", b: "x, y", c: 'say "hi"' },
      { a: "2", b: "", c: "z" },
    ]);
  });
});

describe("admin session", () => {
  it("verifies a fresh session and rejects tampering, wrong secret and expiry", async () => {
    const v = await createSessionValue("secret-secret-secret", 1_000);
    expect(await verifySessionValue(v, "secret-secret-secret", 2_000)).toBe(true);
    expect(await verifySessionValue(v.replace(/.$/, (c) => (c === "a" ? "b" : "a")), "secret-secret-secret", 2_000)).toBe(false);
    expect(await verifySessionValue(v, "other-secret-secret", 2_000)).toBe(false);
    expect(await verifySessionValue(v, "secret-secret-secret", 1_000 + SESSION_TTL_MS + 1)).toBe(false);
    expect(await verifySessionValue(undefined, "x")).toBe(false);
  });
  it("safeEqual", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("rate limit", () => {
  it("blocks after the limit within the window", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
  });
});

describe("validation", () => {
  const base = { correctionType: "other", proposedCorrection: "Fix it", sourceUrl: "https://example.org/a" };
  it("requires a safe http(s) source URL", () => {
    expect(correctionInputSchema.safeParse(base).success).toBe(true);
    expect(correctionInputSchema.safeParse({ ...base, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(correctionInputSchema.safeParse({ ...base, sourceUrl: "https://user:pw@example.org" }).success).toBe(false);
    expect(correctionInputSchema.safeParse({ ...base, sourceUrl: "" }).success).toBe(false);
  });
  it("strips control characters and rejects a filled honeypot", () => {
    const r = correctionInputSchema.parse({ ...base, explanation: "a\u0000b" });
    expect(r.explanation).toBe("ab");
    expect(correctionInputSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
  });
  it("approval requires an explicit data action", () => {
    expect(correctionReviewSchema.safeParse({ status: "approved", reviewNote: "ok ok" }).success).toBe(false);
    expect(correctionReviewSchema.safeParse({ status: "approved", reviewNote: "ok ok", dataAction: "no_data_change" }).success).toBe(true);
    expect(correctionReviewSchema.safeParse({ status: "rejected", reviewNote: "no source" }).success).toBe(true);
  });
  it("commercial claims need money in major units and a source URL", () => {
    const claim = {
      kind: "commercial",
      filmSlug: "x",
      sourceKey: "editorial",
      metricType: "telugu_gross",
      versionScope: "telugu_dub",
      territory: "AP/TS",
      amountLow: "12.5",
      confidence: "low",
      sourceUrl: "https://example.org",
    };
    expect(sourceClaimInput.safeParse(claim).success).toBe(true);
    expect(sourceClaimInput.safeParse({ ...claim, amountLow: "12.345" }).success).toBe(false);
    expect(sourceClaimInput.safeParse({ ...claim, sourceUrl: "ftp://x" }).success).toBe(false);
  });
});
