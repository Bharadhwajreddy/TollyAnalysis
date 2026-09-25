import "server-only";

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
    public status?: number,
  ) {
    super(`[${provider}] ${message}`);
  }
}

export class ProviderDisabledError extends ProviderError {
  constructor(provider: string, reason: string) {
    super(provider, `disabled: ${reason}`);
  }
}

export interface FetchJsonOptions {
  provider: string;
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET JSON with timeout, exponential backoff and provider rate-limit handling.
 * Retries on network errors, 429 (honouring Retry-After) and 5xx. Never retries other 4xx.
 */
export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  const { provider, retries = 3, timeoutMs = 10_000, fetchImpl = fetch, sleep = defaultSleep } = opts;
  let attempt = 0;
  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers: { accept: "application/json", ...opts.headers }, signal: controller.signal, cache: "no-store" });
      if (res.ok) return (await res.json()) as T;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries) throw new ProviderError(provider, `HTTP ${res.status}`, res.status);
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 2 ** attempt * 1000);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (attempt >= retries) throw new ProviderError(provider, `network error: ${(err as Error).message}`);
      await sleep(2 ** attempt * 1000);
    } finally {
      clearTimeout(timer);
    }
    attempt++;
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
