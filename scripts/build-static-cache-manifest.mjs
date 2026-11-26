import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const CACHE_DIR = "cdn-cgi/_next_cache";
export const MANIFEST_FILENAME = "__edge_static_map.json";
export const SKIPPED_ROUTES = new Set(["/_not-found", "/_global-error"]);

/**
 * Resolves the active OpenNext build ID from `.open-next/assets/BUILD_ID`,
 * falling back to the first non-`__fetch` directory under `.open-next/cache/`.
 *
 * @param {string} openNextDir
 * @returns {string}
 */
export function resolveBuildId(openNextDir) {
  const buildIdFile = path.join(openNextDir, "assets", "BUILD_ID");
  if (fs.existsSync(buildIdFile)) {
    const raw = fs.readFileSync(buildIdFile, "utf8").trim();
    if (raw.length > 0) {
      return raw;
    }
  }

  const cacheDir = path.join(openNextDir, "cache");
  if (fs.existsSync(cacheDir)) {
    const dirs = fs
      .readdirSync(cacheDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "__fetch")
      .map((entry) => entry.name)
      .sort();

    if (dirs.length > 0) {
      return dirs[0];
    }
  }

  throw new Error(
    `Unable to resolve OpenNext BUILD_ID from "${buildIdFile}" or "${cacheDir}". Run opennextjs-cloudflare build first.`
  );
}

/**
 * Recursively collects all `.cache` file paths inside `dir` in deterministic sorted order.
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function walkCacheFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkCacheFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".cache")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extracts a normalized public route pathname from an OpenNext `meta.routeCache.key`.
 *
 * Examples:
 * - `"/route-cache/APP_PAGE/<sha256>/$/index"` -> `"/"`
 * - `"/route-cache/APP_PAGE/<sha256>/$/terms"` -> `"/terms"`
 * - `"/route-cache/APP_PAGE/<sha256>/$/director/s-s-rajamouli"` -> `"/director/s-s-rajamouli"`
 * - `"/route-cache/APP_PAGE/<sha256>/$/_not-found"` -> `null` (skipped)
 *
 * @param {unknown} routeCacheKey
 * @returns {string | null}
 */
export function extractRoutePathFromCacheKey(routeCacheKey) {
  if (typeof routeCacheKey !== "string") {
    return null;
  }

  const prefix = "/route-cache/APP_PAGE/";
  if (!routeCacheKey.startsWith(prefix)) {
    return null;
  }

  const markerIdx = routeCacheKey.indexOf("/$/", prefix.length);
  if (markerIdx === -1) {
    return null;
  }

  const suffix = routeCacheKey.slice(markerIdx + 3).replace(/^\/+|\/+$/g, "");
  if (!suffix) {
    return null;
  }

  const suffixSegments = suffix.split("/");
  if (suffixSegments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return null;
  }

  const routePath = suffix === "index" ? "/" : `/${suffix}`;
  if (SKIPPED_ROUTES.has(routePath)) {
    return null;
  }

  return routePath;
}

/**
 * Computes the canonical static-asset URL pathname matching
 * `@opennextjs/cloudflare`'s `StaticAssetsIncrementalCache.getAssetUrl()`.
 *
 * @param {string} buildId
 * @param {string} routeCacheKey
 * @returns {string | null}
 */
export function buildAssetPath(buildId, routeCacheKey) {
  if (typeof buildId !== "string" || !buildId.trim() || typeof routeCacheKey !== "string" || !routeCacheKey) {
    return null;
  }

  const normalized = `${CACHE_DIR}/${buildId}/${routeCacheKey}.cache`.replace(/\/+/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  return `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

/**
 * Scans `.open-next/cache/<BUILD_ID>/route-cache/APP_PAGE/` and generates
 * `.open-next/assets/__edge_static_map.json`.
 *
 * @param {{ openNextDir?: string; write?: boolean }} [options]
 * @returns {{ buildId: string; routes: Record<string, string>; routeCount: number; outputPath: string }}
 */
export function generateStaticCacheManifest(options = {}) {
  const openNextDir = path.resolve(options.openNextDir ?? path.join(process.cwd(), ".open-next"));
  const write = options.write ?? true;

  const buildId = resolveBuildId(openNextDir);
  const appPageDir = path.join(openNextDir, "cache", buildId, "route-cache", "APP_PAGE");
  const cacheFiles = walkCacheFiles(appPageDir);

  const routeEntries = [];
  const seenRoutes = new Set();

  for (const filePath of cacheFiles) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== "object" || parsed.type !== "app") {
      continue;
    }

    const routeCacheKey = parsed.meta?.routeCache?.key;
    const routePath = extractRoutePathFromCacheKey(routeCacheKey);
    if (!routePath || seenRoutes.has(routePath)) {
      continue;
    }

    const assetPath = buildAssetPath(buildId, routeCacheKey);
    if (!assetPath) {
      continue;
    }

    seenRoutes.add(routePath);
    routeEntries.push([routePath, assetPath]);
  }

  routeEntries.sort(([a], [b]) => a.localeCompare(b));
  const routes = Object.fromEntries(routeEntries);
  const outputPath = path.join(openNextDir, "assets", MANIFEST_FILENAME);

  if (write) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ buildId, routes }), "utf8");
  }

  return {
    buildId,
    routes,
    routeCount: routeEntries.length,
    outputPath,
  };
}

/**
 * Returns true only when this script is invoked directly as the Node entrypoint,
 * ensuring importing its helpers in unit tests triggers zero filesystem side effects.
 *
 * @returns {boolean}
 */
export function isDirectExecution() {
  const entry = process.argv?.[1];
  if (!entry) {
    return false;
  }

  try {
    const resolved = fs.realpathSync(entry);
    return import.meta.url === pathToFileURL(resolved).href;
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  }
}

if (isDirectExecution()) {
  const result = generateStaticCacheManifest();
  console.log(
    `[edge-manifest] Wrote ${result.routeCount} static routes for buildId=${result.buildId} to ${result.outputPath}`
  );
}
