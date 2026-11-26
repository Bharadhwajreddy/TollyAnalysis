import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_KEY = "966a3d36f9fb496db085a6e167d01f86";
export const DEFAULT_BASE_HOST = "https://tollyanalysis.com";
export const DEFAULT_HOST = "tollyanalysis.com";
export const DEFAULT_SITEMAP_URL = "https://tollyanalysis.com/sitemap.xml";
export const DEFAULT_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const MAX_INDEXNOW_BATCH_SIZE = 10000;

/** @type {Record<string, string>} */
const XML_ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Decode standard XML character entities and numeric character references in a single pass
 * to prevent double-unescaping (e.g. `&amp;lt;` decodes to `&lt;`, not `<`).
 *
 * @param {string} value
 * @returns {string}
 */
export function decodeXmlEntities(value) {
  return value.replace(
    /&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g,
    (entity, code) => {
      if (code in XML_ENTITY_MAP) {
        return XML_ENTITY_MAP[code];
      }
      if (code.startsWith("#x")) {
        const cp = Number.parseInt(code.slice(2), 16);
        return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff
          ? String.fromCodePoint(cp)
          : entity;
      }
      if (code.startsWith("#")) {
        const cp = Number.parseInt(code.slice(1), 10);
        return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff
          ? String.fromCodePoint(cp)
          : entity;
      }
      return entity;
    }
  );
}

/**
 * Split an array of URLs into batches of at most `batchSize` items (IndexNow max: 10,000).
 *
 * @param {readonly string[]} urls
 * @param {number} [batchSize=MAX_INDEXNOW_BATCH_SIZE]
 * @returns {string[][]}
 */
export function chunkUrls(urls, batchSize = MAX_INDEXNOW_BATCH_SIZE) {
  if (!Number.isInteger(batchSize) || batchSize <= 0 || batchSize > MAX_INDEXNOW_BATCH_SIZE) {
    throw new RangeError(
      `batchSize must be an integer between 1 and ${MAX_INDEXNOW_BATCH_SIZE}.`
    );
  }
  /** @type {string[][]} */
  const batches = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Extract, decode, validate, and deduplicate `<loc>` URLs from an XML sitemap.
 * Enforces both prefix (`url.startsWith(baseHost)`) and exact origin matching so
 * foreign or spoofed hosts (e.g. `https://tollyanalysis.com.evil.com`) are rejected.
 *
 * @param {string} xml
 * @param {string} [baseHost=DEFAULT_BASE_HOST]
 * @returns {string[]}
 */
export function parseSitemapUrls(xml, baseHost = DEFAULT_BASE_HOST) {
  if (typeof xml !== "string" || xml.trim().length === 0) {
    return [];
  }

  const normalizedBase = baseHost.trim().replace(/\/+$/, "");
  /** @type {string} */
  let expectedOrigin;
  try {
    expectedOrigin = new URL(normalizedBase).origin;
  } catch {
    throw new Error(`Invalid baseHost URL: ${baseHost}`);
  }

  const locRegex = /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;
  /** @type {Set<string>} */
  const uniqueUrls = new Set();

  let match = locRegex.exec(xml);
  while (match !== null) {
    let raw = match[1].trim();
    if (raw.startsWith("<![CDATA[") && raw.endsWith("]]>")) {
      raw = raw.slice(9, -3).trim();
    }
    const decoded = decodeXmlEntities(raw).trim();
    if (decoded.length > 0 && decoded.startsWith(normalizedBase)) {
      try {
        const parsed = new URL(decoded);
        if (parsed.origin === expectedOrigin) {
          uniqueUrls.add(decoded);
        }
      } catch {
        // Ignore malformed URLs in sitemap entries.
      }
    }
    match = locRegex.exec(xml);
  }

  return [...uniqueUrls];
}

/**
 * Read response text safely for error diagnostics without throwing or leaking keys.
 *
 * @param {Response} response
 * @param {string} keyToRedact
 * @returns {Promise<string>}
 */
async function safeErrorSnippet(response, keyToRedact) {
  try {
    const text = await response.text();
    const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 300);
    return keyToRedact ? cleaned.split(keyToRedact).join("[REDACTED]") : cleaned;
  } catch {
    return "";
  }
}

/**
 * Submit a list of URLs to the IndexNow API in batches of at most 10,000 URLs.
 * Treats both HTTP 200 and 202 as success and surfaces non-2xx errors (e.g. 403, 422).
 *
 * @param {object} options
 * @param {readonly string[]} options.urls
 * @param {string} [options.key=DEFAULT_KEY]
 * @param {string} [options.host=DEFAULT_HOST]
 * @param {string} [options.keyLocation]
 * @param {string} [options.endpoint=DEFAULT_INDEXNOW_ENDPOINT]
 * @param {typeof fetch} [options.fetchFn=globalThis.fetch]
 * @returns {Promise<{ ok: true; submitted: number; batches: number; statuses: number[] }>}
 */
export async function submitIndexNow({
  urls,
  key = DEFAULT_KEY,
  host = DEFAULT_HOST,
  keyLocation,
  endpoint = DEFAULT_INDEXNOW_ENDPOINT,
  fetchFn = globalThis.fetch,
} = {}) {
  if (!Array.isArray(urls)) {
    throw new TypeError("submitIndexNow requires `urls` to be an array of strings.");
  }

  const normalizedKey = typeof key === "string" ? key.trim() : "";
  if (!normalizedKey) {
    throw new Error("IndexNow key is required.");
  }

  const normalizedHost = typeof host === "string"
    ? host.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "")
    : "";
  if (!normalizedHost) {
    throw new Error("IndexNow host is required.");
  }

  if (typeof fetchFn !== "function") {
    throw new TypeError("submitIndexNow requires a valid fetchFn function.");
  }

  /** @type {string[]} */
  const cleanUrls = [];
  /** @type {Set<string>} */
  const seen = new Set();
  for (const item of urls) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    cleanUrls.push(trimmed);
  }

  if (cleanUrls.length === 0) {
    throw new Error("IndexNow submission requires at least one non-empty URL.");
  }

  const resolvedKeyLocation =
    keyLocation?.trim() || `https://${normalizedHost}/${normalizedKey}.txt`;
  const batches = chunkUrls(cleanUrls, MAX_INDEXNOW_BATCH_SIZE);
  /** @type {number[]} */
  const statuses = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const payload = {
      host: normalizedHost,
      key: normalizedKey,
      keyLocation: resolvedKeyLocation,
      urlList: batch,
    };

    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (response.status !== 200 && response.status !== 202) {
      const detail = await safeErrorSnippet(response, normalizedKey);
      const suffix = detail ? `: ${detail}` : "";
      throw new Error(
        `IndexNow submission failed for batch ${index + 1}/${batches.length} with HTTP ${response.status}${suffix}`
      );
    }

    statuses.push(response.status);
  }

  return {
    ok: true,
    submitted: cleanUrls.length,
    batches: batches.length,
    statuses,
  };
}

/**
 * Fetch the live XML sitemap with brief exponential backoff to tolerate post-deploy
 * edge propagation delays.
 *
 * @param {object} [options]
 * @param {string} [options.sitemapUrl=DEFAULT_SITEMAP_URL]
 * @param {typeof fetch} [options.fetchFn=globalThis.fetch]
 * @param {number} [options.retries=3]
 * @param {number} [options.delayMs=2000]
 * @param {(ms: number) => Promise<void>} [options.sleepFn]
 * @returns {Promise<string>}
 */
export async function fetchSitemapWithRetry({
  sitemapUrl = DEFAULT_SITEMAP_URL,
  fetchFn = globalThis.fetch,
  retries = 3,
  delayMs = 2000,
  sleepFn = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms)),
} = {}) {
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchSitemapWithRetry requires a valid fetchFn function.");
  }

  const attempts = Math.max(1, retries);
  /** @type {unknown} */
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchFn(sitemapUrl, {
        headers: {
          accept: "application/xml, text/xml;q=0.9, */*;q=0.8",
        },
      });
      if (response.ok) {
        return await response.text();
      }
      lastError = new Error(
        `Sitemap fetch failed (${sitemapUrl}) with HTTP ${response.status}`
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts && delayMs > 0) {
      await sleepFn(delayMs * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Sitemap fetch failed (${sitemapUrl})`);
}

/**
 * CLI entrypoint: fetch live sitemap, extract verified URLs, and submit to IndexNow.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {Promise<{ ok: true; submitted: number; batches: number; statuses: number[] }>}
 */
export async function runCli(env = process.env) {
  const sitemapUrl = env.INDEXNOW_SITEMAP_URL || DEFAULT_SITEMAP_URL;
  const baseHost = env.INDEXNOW_BASE_URL || DEFAULT_BASE_HOST;
  const host = env.INDEXNOW_HOST || DEFAULT_HOST;
  const key = env.INDEXNOW_KEY || DEFAULT_KEY;
  const endpoint = env.INDEXNOW_ENDPOINT || DEFAULT_INDEXNOW_ENDPOINT;

  const xml = await fetchSitemapWithRetry({ sitemapUrl });
  const urls = parseSitemapUrls(xml, baseHost);

  if (urls.length === 0) {
    throw new Error(`No valid URLs found in sitemap (${sitemapUrl}) for ${baseHost}.`);
  }

  const result = await submitIndexNow({ urls, key, host, endpoint });
  console.log(
    `IndexNow submitted ${result.submitted} URLs in ${result.batches} batch(es) (HTTP ${result.statuses.join(", ")}).`
  );
  return result;
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`IndexNow ping failed: ${message}`);
    process.exitCode = 1;
  });
}
