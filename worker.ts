export interface AssetsBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface EdgeEnv {
  ASSETS: AssetsBinding;
  [key: string]: unknown;
}

export interface EdgeExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

export interface OpenNextLikeWorker {
  fetch(request: Request, env: EdgeEnv, ctx: EdgeExecutionContext): Promise<Response>;
}

export interface EdgeCacheLike {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}

export interface EdgeHandlerDependencies {
  loadOpenNext?: () => Promise<OpenNextLikeWorker>;
  getCache?: () => EdgeCacheLike | null | undefined;
}

interface StaticCacheEntry {
  type?: string;
  meta?: {
    status?: number;
    headers?: Record<string, string | string[] | undefined>;
  };
  html?: string;
  rsc?: string;
  segmentData?: Record<string, string>;
}

interface StaticRouteManifest {
  buildId?: string;
  routes?: Record<string, string>;
}

const STATIC_MAP_ASSET_URL = "http://assets.local/__edge_static_map.json";
const CACHE_CONTROL_VALUE = "s-maxage=31536000, stale-while-revalidate=2592000";
const VARY_VALUE =
  "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url";
const BYPASS_PREFIXES = ["/api", "/admin", "/_next", "/cdn-cgi"] as const;

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
];

function defaultGetCache(): EdgeCacheLike | null {
  const cfCaches = (globalThis as unknown as { caches?: { default?: EdgeCacheLike } }).caches;
  return cfCaches?.default ?? null;
}

async function defaultLoadOpenNext(): Promise<OpenNextLikeWorker> {
  const mod = await import("./.open-next/worker.js");
  return mod.default as OpenNextLikeWorker;
}

export function normalizeEdgePathname(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "/";
  }
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function shouldBypassEdgeFastPath(pathname: string, request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return true;
  }

  for (const prefix of BYPASS_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  if (request.headers.get("next-action") || request.headers.get("x-prerender-revalidate")) {
    return true;
  }

  const cookie = request.headers.get("cookie");
  if (cookie && (cookie.includes("__prerender_bypass") || cookie.includes("__next_preview_data"))) {
    return true;
  }

  return false;
}

export function buildEdgeCacheKey(
  url: URL,
  normalizedPath: string,
  isRsc: boolean,
  segmentHeader: string | null
): Request {
  const kind = segmentHeader
    ? `seg:${encodeURIComponent(segmentHeader)}`
    : isRsc
      ? "rsc"
      : "html";
  const keyUrl = `https://${url.host}${normalizedPath}?__edge_kind=${kind}`;
  return new Request(keyUrl, { method: "GET" });
}

function resolveCachedPayload(
  entry: StaticCacheEntry,
  isRsc: boolean,
  segmentHeader: string | null
): {
  body: string;
  contentType: string;
  extraHeaders?: Record<string, string>;
} | null {
  if (entry.type !== "app") {
    return null;
  }

  if (isRsc && segmentHeader) {
    if (entry.segmentData && Object.hasOwn(entry.segmentData, segmentHeader)) {
      const segmentBody = entry.segmentData[segmentHeader];
      if (typeof segmentBody === "string") {
        return {
          body: segmentBody,
          contentType: "text/x-component; charset=utf-8",
          extraHeaders: {
            "x-nextjs-prerender": "1",
            "x-nextjs-postponed": "2",
          },
        };
      }
    }
    return null;
  }

  if (isRsc) {
    if (entry.rsc !== undefined && entry.rsc !== null) {
      return {
        body: String(entry.rsc),
        contentType: "text/x-component; charset=utf-8",
      };
    }
    return null;
  }

  if (entry.html !== undefined && entry.html !== null) {
    return {
      body: String(entry.html),
      contentType: "text/html; charset=utf-8",
    };
  }

  return null;
}

function buildEdgeResponseHeaders(
  metaHeaders: Record<string, string | string[] | undefined> | undefined,
  contentType: string,
  extraHeaders?: Record<string, string>
): Headers {
  const headers = new Headers();

  if (metaHeaders) {
    for (const [key, value] of Object.entries(metaHeaders)) {
      if (value === undefined) {
        continue;
      }
      const lower = key.toLowerCase();
      if (lower === "x-middleware-set-cookie" || lower === "content-length") {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(key, String(item));
        }
      } else {
        headers.set(key, String(value));
      }
    }
  }

  headers.set("content-type", contentType);
  headers.set("cache-control", CACHE_CONTROL_VALUE);
  headers.set("vary", VARY_VALUE);
  headers.set("x-opennext-cache", "HIT");

  for (const [name, value] of SECURITY_HEADERS) {
    headers.set(name, value);
  }

  if (extraHeaders) {
    for (const [name, value] of Object.entries(extraHeaders)) {
      headers.set(name, value);
    }
  }

  return headers;
}

export function createEdgeFetchHandler(deps: EdgeHandlerDependencies = {}) {
  const loadOpenNext = deps.loadOpenNext ?? defaultLoadOpenNext;
  const getCache = deps.getCache ?? defaultGetCache;

  let staticMapPromise: Promise<Record<string, string> | null> | null = null;
  let openNextPromise: Promise<OpenNextLikeWorker> | null = null;

  async function fallbackToOpenNext(
    request: Request,
    env: EdgeEnv,
    ctx: EdgeExecutionContext
  ): Promise<Response> {
    if (!openNextPromise) {
      openNextPromise = loadOpenNext();
    }
    let worker: OpenNextLikeWorker;
    try {
      worker = await openNextPromise;
    } catch (err) {
      openNextPromise = null;
      throw err;
    }
    return worker.fetch(request, env, ctx);
  }

  async function loadRouteMap(assets: AssetsBinding): Promise<Record<string, string> | null> {
    if (!staticMapPromise) {
      staticMapPromise = (async () => {
        try {
          const res = await assets.fetch(STATIC_MAP_ASSET_URL, { redirect: "manual" });
          if (!res.ok) {
            await res.body?.cancel();
            return null;
          }
          const parsed = (await res.json()) as StaticRouteManifest | null;
          if (!parsed || typeof parsed !== "object" || !parsed.routes || typeof parsed.routes !== "object") {
            return null;
          }
          return parsed.routes;
        } catch {
          return null;
        }
      })();
    }

    const routes = await staticMapPromise;
    if (!routes) {
      staticMapPromise = null;
    }
    return routes;
  }

  return async function fetch(
    request: Request,
    env: EdgeEnv,
    ctx: EdgeExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    if (shouldBypassEdgeFastPath(url.pathname, request) || !env?.ASSETS?.fetch) {
      return fallbackToOpenNext(request, env, ctx);
    }

    const normalizedPath = normalizeEdgePathname(url.pathname);
    const routeMap = await loadRouteMap(env.ASSETS);
    if (!routeMap || !Object.hasOwn(routeMap, normalizedPath)) {
      return fallbackToOpenNext(request, env, ctx);
    }

    const assetPath = routeMap[normalizedPath];
    if (!assetPath) {
      return fallbackToOpenNext(request, env, ctx);
    }

    const method = request.method.toUpperCase();
    const segmentHeader = request.headers.get("next-router-segment-prefetch");
    const isRsc = request.headers.get("rsc") === "1";
    const cacheKey = buildEdgeCacheKey(url, normalizedPath, isRsc, segmentHeader);

    const cache = getCache();
    if (cache) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) {
          if (method === "HEAD") {
            return new Response(null, {
              status: cached.status,
              statusText: cached.statusText,
              headers: cached.headers,
            });
          }
          return cached;
        }
      } catch {
        // Ignore Cache API read failures and fall through to ASSETS lookup
      }
    }

    let entry: StaticCacheEntry | null = null;
    try {
      const assetRes = await env.ASSETS.fetch(`http://assets.local${assetPath}`, {
        redirect: "manual",
      });
      if (!assetRes.ok) {
        await assetRes.body?.cancel();
        return fallbackToOpenNext(request, env, ctx);
      }
      entry = (await assetRes.json()) as StaticCacheEntry | null;
    } catch {
      return fallbackToOpenNext(request, env, ctx);
    }

    if (!entry || typeof entry !== "object") {
      return fallbackToOpenNext(request, env, ctx);
    }

    const resolved = resolveCachedPayload(entry, isRsc, segmentHeader);
    if (!resolved) {
      return fallbackToOpenNext(request, env, ctx);
    }

    const status = typeof entry.meta?.status === "number" ? entry.meta.status : 200;
    const headers = buildEdgeResponseHeaders(
      entry.meta?.headers,
      resolved.contentType,
      resolved.extraHeaders
    );

    if (cache) {
      const respToCache = new Response(resolved.body, { status, headers });
      ctx.waitUntil(
        Promise.resolve(cache.put(cacheKey, respToCache)).catch(() => {
          // Non-fatal if Edge Cache API rejects write
        })
      );
    }

    return new Response(method === "HEAD" ? null : resolved.body, { status, headers });
  };
}

const edgeWorker = {
  fetch: createEdgeFetchHandler(),
};

export default edgeWorker;
