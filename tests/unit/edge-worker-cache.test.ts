import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAssetPath,
  extractRoutePathFromCacheKey,
  generateStaticCacheManifest,
  isDirectExecution,
  resolveBuildId,
} from "@/scripts/build-static-cache-manifest.mjs";
import {
  buildEdgeCacheKey,
  createEdgeFetchHandler,
  normalizeEdgePathname,
  shouldBypassEdgeFastPath,
  type AssetsBinding,
  type EdgeCacheLike,
  type EdgeEnv,
  type EdgeExecutionContext,
  type OpenNextLikeWorker,
} from "@/worker";

const tempDirs: string[] = [];

function createTempOpenNextDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "tolly-edge-manifest-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("build-static-cache-manifest.mjs", () => {
  it("does not treat Vitest import as direct CLI execution", () => {
    expect(isDirectExecution()).toBe(false);
  });

  it("extracts normalized public route paths from OpenNext routeCache keys and skips internal error routes", () => {
    const hash = "0a918ac4324425973e0805850d87b0021894c2cb60005bfce00fc8b9b139266e";
    expect(extractRoutePathFromCacheKey(`/route-cache/APP_PAGE/${hash}/$/index`)).toBe("/");
    expect(extractRoutePathFromCacheKey(`/route-cache/APP_PAGE/${hash}/$/terms`)).toBe("/terms");
    expect(
      extractRoutePathFromCacheKey(`/route-cache/APP_PAGE/${hash}/$/director/s-s-rajamouli`)
    ).toBe("/director/s-s-rajamouli");
    expect(
      extractRoutePathFromCacheKey(`/route-cache/APP_PAGE/${hash}/$/annexure/heroes/prabhas`)
    ).toBe("/annexure/heroes/prabhas");

    expect(extractRoutePathFromCacheKey(`/route-cache/APP_PAGE/${hash}/$/_not-found`)).toBeNull();
    expect(extractRoutePathFromCacheKey(`/route-cache/APP_PAGE/${hash}/$/_global-error`)).toBeNull();
    expect(extractRoutePathFromCacheKey(`/route-cache/APP_PAGE/${hash}/$/../secret`)).toBeNull();
    expect(extractRoutePathFromCacheKey(`/route-cache/PAGES/${hash}/$/index`)).toBeNull();
    expect(extractRoutePathFromCacheKey(null)).toBeNull();
  });

  it("encodes each asset path segment identically to static-assets-incremental-cache", () => {
    const assetPath = buildAssetPath(
      "build-123",
      "/route-cache/APP_PAGE/abc123/$/director/s-s-rajamouli"
    );
    expect(assetPath).toBe(
      "/cdn-cgi/_next_cache/build-123/route-cache/APP_PAGE/abc123/%24/director/s-s-rajamouli.cache"
    );
    expect(buildAssetPath("build-123", "/route-cache/APP_PAGE/../$/index")).toBeNull();
    expect(buildAssetPath("", "/route-cache/APP_PAGE/abc/$/index")).toBeNull();
  });

  it("resolves BUILD_ID from assets/BUILD_ID and falls back to first non-__fetch cache directory", () => {
    const dirWithBuildId = createTempOpenNextDir();
    mkdirSync(join(dirWithBuildId, "assets"), { recursive: true });
    writeFileSync(join(dirWithBuildId, "assets", "BUILD_ID"), "  my-build-id \n", "utf8");
    expect(resolveBuildId(dirWithBuildId)).toBe("my-build-id");

    const dirFallback = createTempOpenNextDir();
    mkdirSync(join(dirFallback, "cache", "__fetch", "abc"), { recursive: true });
    mkdirSync(join(dirFallback, "cache", "fallback-build-id"), { recursive: true });
    expect(resolveBuildId(dirFallback)).toBe("fallback-build-id");

    const emptyDir = createTempOpenNextDir();
    expect(() => resolveBuildId(emptyDir)).toThrow(/Unable to resolve OpenNext BUILD_ID/);
  });

  it("walks APP_PAGE .cache files, filters invalid/internal entries, and writes __edge_static_map.json", () => {
    const dir = createTempOpenNextDir();
    const buildId = "test-build-xyz";
    const appPageDir = join(dir, "cache", buildId, "route-cache", "APP_PAGE");

    const writeCache = (relPath: string, payload: unknown) => {
      const fullPath = join(appPageDir, relPath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, JSON.stringify(payload), "utf8");
    };

    writeCache("h1/$/index.cache", {
      type: "app",
      meta: { routeCache: { key: "/route-cache/APP_PAGE/h1/$/index" } },
      html: "<html>home</html>",
    });
    writeCache("h2/$/hero/prabhas.cache", {
      type: "app",
      meta: { routeCache: { key: "/route-cache/APP_PAGE/h2/$/hero/prabhas" } },
      html: "<html>prabhas</html>",
    });
    writeCache("h3/$/_not-found.cache", {
      type: "app",
      meta: { routeCache: { key: "/route-cache/APP_PAGE/h3/$/_not-found" }, status: 404 },
      html: "<html>404</html>",
    });
    writeCache("h4/$/_global-error.cache", {
      type: "app",
      meta: { routeCache: { key: "/route-cache/APP_PAGE/h4/$/_global-error" }, status: 500 },
      html: "<html>500</html>",
    });
    writeCache("h5/$/non-app.cache", {
      type: "route",
      meta: { routeCache: { key: "/route-cache/APP_PAGE/h5/$/api-like" } },
    });
    mkdirSync(join(appPageDir, "h6", "$"), { recursive: true });
    writeFileSync(join(appPageDir, "h6", "$", "corrupt.cache"), "{bad json", "utf8");

    const result = generateStaticCacheManifest({ openNextDir: dir });
    expect(result.buildId).toBe(buildId);
    expect(result.routeCount).toBe(2);
    expect(result.routes).toEqual({
      "/": `/cdn-cgi/_next_cache/${buildId}/route-cache/APP_PAGE/h1/%24/index.cache`,
      "/hero/prabhas": `/cdn-cgi/_next_cache/${buildId}/route-cache/APP_PAGE/h2/%24/hero/prabhas.cache`,
    });

    const written = JSON.parse(readFileSync(result.outputPath, "utf8")) as {
      buildId: string;
      routes: Record<string, string>;
    };
    expect(written).toEqual({ buildId, routes: result.routes });
  });
});

describe("worker.ts edge fast-path", () => {
  function createMockCache(): {
    cache: EdgeCacheLike;
    store: Map<string, Response>;
    matchMock: ReturnType<typeof vi.fn>;
    putMock: ReturnType<typeof vi.fn>;
  } {
    const store = new Map<string, Response>();
    const matchMock = vi.fn(async (key: Request | string) => {
      const k = typeof key === "string" ? key : key.url;
      const hit = store.get(k);
      return hit ? hit.clone() : undefined;
    });
    const putMock = vi.fn(async (key: Request | string, response: Response) => {
      const k = typeof key === "string" ? key : key.url;
      store.set(k, response.clone());
    });
    return {
      cache: { match: matchMock, put: putMock },
      store,
      matchMock,
      putMock,
    };
  }

  function createHarness(options?: {
    routes?: Record<string, string>;
    assets?: Record<string, { status?: number; body: unknown }>;
    manifestStatus?: number;
    useCache?: boolean;
  }) {
    const routes = options?.routes ?? {
      "/": "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h1/%24/index.cache",
      "/hero/prabhas": "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h2/%24/hero/prabhas.cache",
      "/annexure/methodology":
        "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h3/%24/annexure/methodology.cache",
    };
    const assetsMap = options?.assets ?? {
      "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h1/%24/index.cache": {
        body: {
          type: "app",
          meta: {
            headers: {
              "x-nextjs-prerender": "1",
              "x-middleware-set-cookie": "secret=1; HttpOnly",
              "content-length": "9999",
              "x-next-cache-tags": "_N_T_/page",
            },
          },
          html: "<!doctype html><html><body>Home Page</body></html>",
          rsc: '0:["$","div",null,{"children":"Home RSC"}]\n',
          segmentData: {
            "/_tree": '0:["$","tree",null,{}]\n',
            "/_index": '0:["$","index",null,{}]\n',
          },
        },
      },
      "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h2/%24/hero/prabhas.cache": {
        body: {
          type: "app",
          meta: { headers: { "x-nextjs-prerender": "1" } },
          html: "<!doctype html><html><body>Prabhas</body></html>",
          rsc: '0:["$","div",null,{"children":"Prabhas RSC"}]\n',
        },
      },
      "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h3/%24/annexure/methodology.cache": {
        body: {
          type: "app",
          meta: {
            status: 307,
            headers: {
              location: "/methodology",
              "x-nextjs-prerender": "1",
            },
          },
          html: "<html>redirecting</html>",
          rsc: "0:redirect\n",
        },
      },
    };

    const assetsFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      if (url.pathname === "/__edge_static_map.json") {
        if (options?.manifestStatus && options.manifestStatus >= 400) {
          return new Response("Not Found", { status: options.manifestStatus });
        }
        return new Response(JSON.stringify({ buildId: "b1", routes }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const assetEntry = assetsMap[url.pathname];
      if (!assetEntry) {
        return new Response("Not Found", { status: 404 });
      }
      const bodyStr =
        typeof assetEntry.body === "string" ? assetEntry.body : JSON.stringify(assetEntry.body);
      return new Response(bodyStr, {
        status: assetEntry.status ?? 200,
        headers: { "content-type": "application/json" },
      });
    });

    const openNextFetch = vi.fn(
      async (req: Request) =>
        new Response(`open-next:${req.method}:${new URL(req.url).pathname}`, {
          status: 200,
          headers: { "x-served-by": "open-next-fallback" },
        })
    );
    const loadOpenNext = vi.fn<() => Promise<OpenNextLikeWorker>>(async () => ({
      fetch: openNextFetch,
    }));

    const mockCache = createMockCache();
    const waitUntilPromises: Array<Promise<unknown>> = [];
    const ctx: EdgeExecutionContext = {
      waitUntil: vi.fn((promise: Promise<unknown>) => {
        waitUntilPromises.push(promise);
      }),
    };

    const env: EdgeEnv = {
      ASSETS: { fetch: assetsFetch as unknown as AssetsBinding["fetch"] },
    };

    const handler = createEdgeFetchHandler({
      loadOpenNext,
      getCache: () => (options?.useCache === false ? null : mockCache.cache),
    });

    return {
      handler,
      env,
      ctx,
      assetsFetch,
      openNextFetch,
      loadOpenNext,
      mockCache,
      flushWaitUntil: () => Promise.all(waitUntilPromises),
    };
  }

  it("keeps worker.ts free of top-level static imports of .open-next runtime modules", () => {
    const workerSrc = readFileSync(resolve(process.cwd(), "worker.ts"), "utf8");
    expect(workerSrc).not.toMatch(/^\s*import\s+[^;]*\.open-next/m);
    expect(workerSrc).toContain('import("./.open-next/worker.js")');
  });

  it("normalizes pathnames, bypasses protected routes, and builds distinct cache keys", () => {
    expect(normalizeEdgePathname("/")).toBe("/");
    expect(normalizeEdgePathname("///")).toBe("/");
    expect(normalizeEdgePathname("/hero/prabhas/")).toBe("/hero/prabhas");

    expect(
      shouldBypassEdgeFastPath("/api/health", new Request("https://tollyanalysis.com/api/health"))
    ).toBe(true);
    expect(
      shouldBypassEdgeFastPath("/admin/login", new Request("https://tollyanalysis.com/admin/login"))
    ).toBe(true);
    expect(
      shouldBypassEdgeFastPath(
        "/_next/image",
        new Request("https://tollyanalysis.com/_next/image?url=%2Fx.jpg")
      )
    ).toBe(true);
    expect(
      shouldBypassEdgeFastPath(
        "/cdn-cgi/image",
        new Request("https://tollyanalysis.com/cdn-cgi/image")
      )
    ).toBe(true);
    expect(
      shouldBypassEdgeFastPath(
        "/hero/prabhas",
        new Request("https://tollyanalysis.com/hero/prabhas", { method: "POST" })
      )
    ).toBe(true);
    expect(
      shouldBypassEdgeFastPath(
        "/hero/prabhas",
        new Request("https://tollyanalysis.com/hero/prabhas", {
          headers: { cookie: "__prerender_bypass=1" },
        })
      )
    ).toBe(true);
    expect(
      shouldBypassEdgeFastPath(
        "/hero/prabhas",
        new Request("https://tollyanalysis.com/hero/prabhas", {
          headers: { "next-action": "abc" },
        })
      )
    ).toBe(true);
    expect(
      shouldBypassEdgeFastPath(
        "/hero/prabhas",
        new Request("https://tollyanalysis.com/hero/prabhas", { method: "GET" })
      )
    ).toBe(false);

    const url = new URL("https://tollyanalysis.com/hero/prabhas");
    expect(buildEdgeCacheKey(url, "/hero/prabhas", false, null).url).toBe(
      "https://tollyanalysis.com/hero/prabhas?__edge_kind=html"
    );
    expect(buildEdgeCacheKey(url, "/hero/prabhas", true, null).url).toBe(
      "https://tollyanalysis.com/hero/prabhas?__edge_kind=rsc"
    );
    expect(buildEdgeCacheKey(url, "/hero/prabhas", true, "/_tree").url).toBe(
      "https://tollyanalysis.com/hero/prabhas?__edge_kind=seg:%2F_tree"
    );
  });

  it("serves static HTML from ASSETS on cold miss, populates caches.default, strips unsafe headers, and never loads OpenNext", async () => {
    const h = createHarness();

    const res = await h.handler(new Request("https://tollyanalysis.com/"), h.env, h.ctx);
    await h.flushWaitUntil();

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<!doctype html><html><body>Home Page</body></html>");
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("x-opennext-cache")).toBe("HIT");
    expect(res.headers.get("cache-control")).toBe("s-maxage=31536000, stale-while-revalidate=2592000");
    expect(res.headers.get("vary")).toBe(
      "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url"
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("permissions-policy")).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
    expect(res.headers.get("x-middleware-set-cookie")).toBeNull();
    expect(res.headers.get("content-length")).toBeNull();
    expect(res.headers.get("x-next-cache-tags")).toBe("_N_T_/page");

    expect(h.loadOpenNext).not.toHaveBeenCalled();
    expect(h.mockCache.putMock).toHaveBeenCalledTimes(1);

    // Second request hits caches.default without calling ASSETS.fetch again
    const res2 = await h.handler(new Request("https://tollyanalysis.com/"), h.env, h.ctx);
    expect(res2.status).toBe(200);
    expect(await res2.text()).toBe("<!doctype html><html><body>Home Page</body></html>");
    expect(h.assetsFetch).toHaveBeenCalledTimes(2); // 1 manifest + 1 .cache on first request
    expect(h.loadOpenNext).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent __edge_static_map.json fetches in isolate scope", async () => {
    const h = createHarness();

    const [r1, r2, r3] = await Promise.all([
      h.handler(new Request("https://tollyanalysis.com/"), h.env, h.ctx),
      h.handler(new Request("https://tollyanalysis.com/hero/prabhas"), h.env, h.ctx),
      h.handler(new Request("https://tollyanalysis.com/hero/prabhas/"), h.env, h.ctx),
    ]);
    await h.flushWaitUntil();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(h.loadOpenNext).not.toHaveBeenCalled();

    const manifestCalls = h.assetsFetch.mock.calls.filter(([input]) =>
      String(input).endsWith("/__edge_static_map.json")
    );
    expect(manifestCalls).toHaveLength(1);
  });

  it("serves RSC payloads and segment prefetches with isolated cache keys and required Next headers", async () => {
    const h = createHarness();

    const rscRes = await h.handler(
      new Request("https://tollyanalysis.com/", {
        headers: { rsc: "1" },
      }),
      h.env,
      h.ctx
    );
    expect(rscRes.status).toBe(200);
    expect(rscRes.headers.get("content-type")).toBe("text/x-component; charset=utf-8");
    expect(await rscRes.text()).toBe('0:["$","div",null,{"children":"Home RSC"}]\n');

    const segRes = await h.handler(
      new Request("https://tollyanalysis.com/", {
        headers: {
          rsc: "1",
          "next-router-segment-prefetch": "/_tree",
        },
      }),
      h.env,
      h.ctx
    );
    expect(segRes.status).toBe(200);
    expect(segRes.headers.get("content-type")).toBe("text/x-component; charset=utf-8");
    expect(segRes.headers.get("x-nextjs-prerender")).toBe("1");
    expect(segRes.headers.get("x-nextjs-postponed")).toBe("2");
    expect(await segRes.text()).toBe('0:["$","tree",null,{}]\n');

    await h.flushWaitUntil();
    expect(h.mockCache.store.size).toBe(2);
    expect(h.loadOpenNext).not.toHaveBeenCalled();
  });

  it("handles HEAD requests by warming cache with full body while returning empty body", async () => {
    const h = createHarness();

    const headRes = await h.handler(
      new Request("https://tollyanalysis.com/hero/prabhas", { method: "HEAD" }),
      h.env,
      h.ctx
    );
    await h.flushWaitUntil();

    expect(headRes.status).toBe(200);
    expect(await headRes.text()).toBe("");
    expect(headRes.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(headRes.headers.get("x-opennext-cache")).toBe("HIT");

    // Subsequent GET should get full cached body from caches.default
    const getRes = await h.handler(
      new Request("https://tollyanalysis.com/hero/prabhas", { method: "GET" }),
      h.env,
      h.ctx
    );
    expect(await getRes.text()).toBe("<!doctype html><html><body>Prabhas</body></html>");

    // Subsequent HEAD on cache hit should also strip body
    const headHit = await h.handler(
      new Request("https://tollyanalysis.com/hero/prabhas", { method: "HEAD" }),
      h.env,
      h.ctx
    );
    expect(await headHit.text()).toBe("");
    expect(headHit.headers.get("x-opennext-cache")).toBe("HIT");
    expect(h.loadOpenNext).not.toHaveBeenCalled();
  });

  it("preserves cached 307 redirect status and location header", async () => {
    const h = createHarness();
    const res = await h.handler(
      new Request("https://tollyanalysis.com/annexure/methodology"),
      h.env,
      h.ctx
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/methodology");
    expect(res.headers.get("x-opennext-cache")).toBe("HIT");
    expect(h.loadOpenNext).not.toHaveBeenCalled();
  });

  it("falls back to lazy OpenNext worker for dynamic routes, non-GET/HEAD, missing segment/body, and prototype keys", async () => {
    const h = createHarness({
      routes: {
        "/": "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h1/%24/index.cache",
        "/missing-fields": "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h4/%24/missing.cache",
      },
      assets: {
        "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h1/%24/index.cache": {
          body: {
            type: "app",
            html: "<html>home</html>",
            rsc: "0:rsc\n",
            segmentData: { "/_tree": "0:tree\n" },
          },
        },
        "/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/h4/%24/missing.cache": {
          body: {
            type: "app",
          },
        },
      },
    });

    const fallbackCases = [
      new Request("https://tollyanalysis.com/api/health"),
      new Request("https://tollyanalysis.com/admin"),
      new Request("https://tollyanalysis.com/_next/image?url=%2Fa.png"),
      new Request("https://tollyanalysis.com/annexure/changelog"),
      new Request("https://tollyanalysis.com/annexure/corrections"),
      new Request("https://tollyanalysis.com/unknown-route-404"),
      new Request("https://tollyanalysis.com/constructor"),
      new Request("https://tollyanalysis.com/", { method: "POST" }),
      new Request("https://tollyanalysis.com/", {
        headers: { rsc: "1", "next-router-segment-prefetch": "/nonexistent-segment" },
      }),
      new Request("https://tollyanalysis.com/missing-fields"),
      new Request("https://tollyanalysis.com/missing-fields", { headers: { rsc: "1" } }),
    ];

    for (const req of fallbackCases) {
      const res = await h.handler(req, h.env, h.ctx);
      expect(res.headers.get("x-served-by")).toBe("open-next-fallback");
    }

    expect(h.loadOpenNext).toHaveBeenCalledTimes(1); // lazy-loaded once and cached
    expect(h.openNextFetch).toHaveBeenCalledTimes(fallbackCases.length);
  });

  it("falls back gracefully when manifest fetch fails and retries on later requests", async () => {
    const h = createHarness({ manifestStatus: 404 });

    const r1 = await h.handler(new Request("https://tollyanalysis.com/"), h.env, h.ctx);
    expect(r1.headers.get("x-served-by")).toBe("open-next-fallback");

    const r2 = await h.handler(new Request("https://tollyanalysis.com/"), h.env, h.ctx);
    expect(r2.headers.get("x-served-by")).toBe("open-next-fallback");
    expect(h.assetsFetch).toHaveBeenCalledTimes(2);
  });
});
