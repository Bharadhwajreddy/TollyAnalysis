/**
 * Stateless admin session: `<expiresAtMs>.<hex HMAC-SHA256(ADMIN_TOKEN, "ta-admin:" + expiresAtMs)>`.
 * Uses Web Crypto so it works in route handlers, server components and proxy.ts.
 */
export const ADMIN_COOKIE = "ta_admin";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function createSessionValue(secret: string, now = Date.now()): Promise<string> {
  const exp = now + SESSION_TTL_MS;
  return `${exp}.${await hmac(secret, `ta-admin:${exp}`)}`;
}

export async function verifySessionValue(value: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value || !secret) return false;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now || !sig) return false;
  return safeEqual(sig, await hmac(secret, `ta-admin:${exp}`));
}
