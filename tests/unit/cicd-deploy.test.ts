import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  chunkUrls,
  decodeXmlEntities,
  DEFAULT_BASE_HOST,
  DEFAULT_KEY,
  DEFAULT_TIMEOUT_MS,
  fetchSitemapWithRetry,
  MAX_INDEXNOW_BATCH_SIZE,
  parseSitemapUrls,
  runCli,
  submitIndexNow,
} from "@/scripts/indexnow-ping.mjs";

type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue };

interface YamlLine {
  indent: number;
  text: string;
}

function stripInlineComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle && line[i - 1] !== "\\") {
      inDouble = !inDouble;
    } else if (ch === "#" && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

function tokenizeYaml(raw: string): YamlLine[] {
  const result: YamlLine[] = [];
  for (const rawLine of raw.replace(/\r\n/g, "\n").split("\n")) {
    const cleaned = stripInlineComment(rawLine);
    const trimmed = cleaned.trim();
    if (!trimmed) continue;
    const indent = cleaned.length - cleaned.trimStart().length;
    result.push({ indent, text: trimmed });
  }
  return result;
}

function splitTopLevelCommas(inner: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && inner[i - 1] !== "\\") inDouble = !inDouble;
    if (ch === "," && !inSingle && !inDouble) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) parts.push(current.trim());
  return parts;
}

function parseYamlScalar(raw: string): YamlValue {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevelCommas(inner).map((item) => parseYamlScalar(item));
  }
  return trimmed;
}

function findKeyColonIndex(text: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && text[i - 1] !== "\\") inDouble = !inDouble;
    else if (ch === ":" && !inSingle && !inDouble) {
      const next = text[i + 1];
      if (next === undefined || /\s/.test(next)) {
        return i;
      }
    }
  }
  return -1;
}

function parseYamlBlock(
  lines: YamlLine[],
  startIndex: number,
  expectedIndent: number
): { value: YamlValue; nextIndex: number } {
  if (startIndex >= lines.length) {
    return { value: null, nextIndex: startIndex };
  }

  const first = lines[startIndex];
  if (first.text === "-" || first.text.startsWith("- ")) {
    const items: YamlValue[] = [];
    let i = startIndex;

    while (
      i < lines.length &&
      lines[i].indent === expectedIndent &&
      (lines[i].text === "-" || lines[i].text.startsWith("- "))
    ) {
      const rest = lines[i].text === "-" ? "" : lines[i].text.slice(2).trim();
      if (!rest) {
        if (i + 1 < lines.length && lines[i + 1].indent > expectedIndent) {
          const nested = parseYamlBlock(lines, i + 1, lines[i + 1].indent);
          items.push(nested.value);
          i = nested.nextIndex;
        } else {
          items.push(null);
          i += 1;
        }
        continue;
      }

      const colonIdx = findKeyColonIndex(rest);
      if (colonIdx !== -1) {
        const obj: Record<string, YamlValue> = {};
        const key = rest.slice(0, colonIdx).trim();
        const valRaw = rest.slice(colonIdx + 1).trim();
        const itemMapIndent = expectedIndent + 2;
        i += 1;

        if (!valRaw) {
          if (i < lines.length && lines[i].indent > itemMapIndent) {
            const nested = parseYamlBlock(lines, i, lines[i].indent);
            obj[key] = nested.value;
            i = nested.nextIndex;
          } else {
            obj[key] = null;
          }
        } else {
          obj[key] = parseYamlScalar(valRaw);
        }

        if (i < lines.length && lines[i].indent === itemMapIndent && !lines[i].text.startsWith("- ")) {
          const restMap = parseYamlMapping(lines, i, itemMapIndent);
          Object.assign(obj, restMap.value);
          i = restMap.nextIndex;
        }

        items.push(obj);
      } else {
        items.push(parseYamlScalar(rest));
        i += 1;
      }
    }

    return { value: items, nextIndex: i };
  }

  return parseYamlMapping(lines, startIndex, expectedIndent);
}

function parseYamlMapping(
  lines: YamlLine[],
  startIndex: number,
  expectedIndent: number
): { value: Record<string, YamlValue>; nextIndex: number } {
  const obj: Record<string, YamlValue> = {};
  let i = startIndex;

  while (
    i < lines.length &&
    lines[i].indent === expectedIndent &&
    lines[i].text !== "-" &&
    !lines[i].text.startsWith("- ")
  ) {
    const colonIdx = findKeyColonIndex(lines[i].text);
    if (colonIdx === -1) {
      throw new Error(`Invalid YAML mapping line: ${lines[i].text}`);
    }

    const key = lines[i].text.slice(0, colonIdx).trim();
    const valRaw = lines[i].text.slice(colonIdx + 1).trim();
    i += 1;

    if (!valRaw) {
      if (i < lines.length && lines[i].indent > expectedIndent) {
        const nested = parseYamlBlock(lines, i, lines[i].indent);
        obj[key] = nested.value;
        i = nested.nextIndex;
      } else {
        obj[key] = null;
      }
    } else {
      obj[key] = parseYamlScalar(valRaw);
    }
  }

  return { value: obj, nextIndex: i };
}

function parseYaml(raw: string): Record<string, YamlValue> {
  const lines = tokenizeYaml(raw);
  if (lines.length === 0) return {};
  const parsed = parseYamlBlock(lines, 0, lines[0].indent);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    throw new Error("Expected top-level YAML mapping.");
  }
  return parsed.value as Record<string, YamlValue>;
}

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  "continue-on-error"?: boolean;
  with?: Record<string, YamlValue>;
  env?: Record<string, YamlValue>;
}

interface WorkflowJob {
  name?: string;
  "runs-on"?: string;
  needs?: string | string[];
  steps?: WorkflowStep[];
}

function asRecord(value: YamlValue | undefined): Record<string, YamlValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected YAML object.");
  }
  return value as Record<string, YamlValue>;
}

describe("GitHub Actions Production Deploy Workflow (.github/workflows/deploy.yml) — FR-011", () => {
  const deployPath = resolve(process.cwd(), ".github/workflows/deploy.yml");
  const ciPath = resolve(process.cwd(), ".github/workflows/ci.yml");
  const wranglerPath = resolve(process.cwd(), "wrangler.jsonc");
  const deployRaw = readFileSync(deployPath, "utf8");
  const ciRaw = readFileSync(ciPath, "utf8");
  const deploy = parseYaml(deployRaw);
  const ci = parseYaml(ciRaw);

  it("triggers on push to main and manual workflow_dispatch", () => {
    const onBlock = asRecord(deploy.on);
    const pushBlock = asRecord(onBlock.push);
    expect(pushBlock.branches).toEqual(["main"]);
    expect("workflow_dispatch" in onBlock).toBe(true);
  });

  it("enforces least-privilege contents: read permissions and serialized production concurrency", () => {
    expect(deploy.permissions).toEqual({ contents: "read" });
    expect(deploy.concurrency).toEqual({
      group: "deploy-production",
      "cancel-in-progress": false,
    });
  });

  it("matches Node.js 22 from .github/workflows/ci.yml across all jobs", () => {
    const ciJobs = asRecord(ci.jobs);
    const ciChecks = asRecord(ciJobs.checks) as unknown as WorkflowJob;
    const ciNodeStep = ciChecks.steps?.find((s) => s.uses?.startsWith("actions/setup-node@"));
    expect(ciNodeStep?.with?.["node-version"]).toBe(22);

    const deployJobs = asRecord(deploy.jobs);
    for (const jobValue of Object.values(deployJobs)) {
      const job = asRecord(jobValue) as unknown as WorkflowJob;
      const nodeStep = job.steps?.find((s) => s.uses?.startsWith("actions/setup-node@"));
      expect(nodeStep).toBeDefined();
      expect(nodeStep?.uses).toBe("actions/setup-node@v4");
      expect(nodeStep?.with?.["node-version"]).toBe(22);
      expect(nodeStep?.with?.cache).toBe("npm");
    }
  });

  it("gates deployment behind full verification (npm ci, lint, typecheck, test, demo parity build)", () => {
    const jobs = asRecord(deploy.jobs);
    const verifyJob = asRecord(jobs.verify) as unknown as WorkflowJob;
    const deployJob = asRecord(jobs.deploy) as unknown as WorkflowJob;

    expect(deployJob.needs).toBe("verify");

    const verifyRuns = (verifyJob.steps ?? []).map((s) => s.run).filter(Boolean);
    expect(verifyRuns).toEqual(
      expect.arrayContaining([
        "npm ci",
        "npm run lint",
        "npm run typecheck",
        "npm run test",
        "npm run build",
      ])
    );

    const demoBuildStep = (verifyJob.steps ?? []).find((s) => s.run === "npm run build");
    expect(demoBuildStep?.env).toMatchObject({
      NEXT_PUBLIC_DATA_MODE: "demo",
      NEXT_TELEMETRY_DISABLED: "1",
    });

    const deployRuns = (deployJob.steps ?? []).map((s) => s.run).filter(Boolean);
    expect(deployRuns).toContain("npm ci");
  });

  it("builds OpenNext Cloudflare bundle with explicit real-data env vars and no cross-mode .next/cache sharing", () => {
    const jobs = asRecord(deploy.jobs);
    const deployJob = asRecord(jobs.deploy) as unknown as WorkflowJob;
    const steps = deployJob.steps ?? [];

    const buildIdx = steps.findIndex((s) => s.run === "npm run cf:build");
    expect(buildIdx).toBeGreaterThan(-1);

    const buildStep = steps[buildIdx];
    expect(buildStep.env).toEqual({
      NEXT_PUBLIC_DATA_MODE: "real",
      NEXT_PUBLIC_FEATURE_USER_RANKING: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    });

    // Ensure no unkeyed actions/cache for .next/cache exists across demo and real builds
    const cacheSteps = [...steps].filter((s) => s.uses?.startsWith("actions/cache@"));
    for (const cacheStep of cacheSteps) {
      const pathVal = String(cacheStep.with?.path ?? "");
      if (pathVal.includes(".next/cache")) {
        expect(String(cacheStep.with?.key ?? "")).toContain("NEXT_PUBLIC_DATA_MODE");
      }
    }

    // Verify build-time env vars match wrangler.jsonc production vars
    const wrangler = JSON.parse(readFileSync(wranglerPath, "utf8")) as {
      vars?: Record<string, string>;
    };
    expect(wrangler.vars?.NEXT_PUBLIC_DATA_MODE).toBe("real");
    expect(wrangler.vars?.NEXT_PUBLIC_FEATURE_USER_RANKING).toBe("false");
  });

  it("deploys via cloudflare/wrangler-action@v4 with pinned wranglerVersion, command: deploy, and required Cloudflare secrets", () => {
    const jobs = asRecord(deploy.jobs);
    const deployJob = asRecord(jobs.deploy) as unknown as WorkflowJob;
    const steps = deployJob.steps ?? [];

    const buildIdx = steps.findIndex((s) => s.run === "npm run cf:build");
    const wranglerIdx = steps.findIndex((s) => s.uses === "cloudflare/wrangler-action@v4");

    expect(wranglerIdx).toBeGreaterThan(buildIdx);
    expect(deployRaw).not.toContain("cloudflare/wrangler-action@v3");

    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      devDependencies?: Record<string, string>;
    };
    const expectedWrangler = pkg.devDependencies?.wrangler?.replace(/^[\^~]/, "");
    expect(expectedWrangler).toBe("4.164.0");

    const wranglerStep = steps[wranglerIdx];
    expect(wranglerStep.with).toEqual({
      apiToken: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
      accountId: "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}",
      wranglerVersion: "4.164.0",
      command: "deploy",
    });
    expect(String(wranglerStep.with?.command ?? "")).not.toContain("npx");
    expect(String(wranglerStep.with?.command ?? "")).not.toContain("opennextjs-cloudflare");
  });

  it("runs post-deploy IndexNow ping non-fatally after Cloudflare deploy", () => {
    const jobs = asRecord(deploy.jobs);
    const deployJob = asRecord(jobs.deploy) as unknown as WorkflowJob;
    const steps = deployJob.steps ?? [];

    const wranglerIdx = steps.findIndex((s) => s.uses === "cloudflare/wrangler-action@v4");
    const indexNowIdx = steps.findIndex((s) => s.run === "node scripts/indexnow-ping.mjs");

    expect(indexNowIdx).toBeGreaterThan(wranglerIdx);
    expect(steps[indexNowIdx]["continue-on-error"]).toBe(true);
  });
});

describe("IndexNow Submission Script (scripts/indexnow-ping.mjs) — FR-011", () => {
  it("matches the verified public IndexNow key file and causes zero network calls on import", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.resetModules();
    await import("@/scripts/indexnow-ping.mjs");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    const keyFile = readFileSync(
      resolve(process.cwd(), "public", `${DEFAULT_KEY}.txt`),
      "utf8"
    ).trim();
    expect(DEFAULT_KEY).toBe("966a3d36f9fb496db085a6e167d01f86");
    expect(keyFile).toBe(DEFAULT_KEY);
    expect(DEFAULT_BASE_HOST).toBe("https://tollyanalysis.com");
    expect(MAX_INDEXNOW_BATCH_SIZE).toBe(10000);
  });

  it("decodeXmlEntities decodes XML entities in a single pass without double-unescaping", () => {
    expect(
      decodeXmlEntities("https://tollyanalysis.com/compare?a=prabhas&amp;b=mahesh&apos;1&apos;&quot;&lt;&gt;")
    ).toBe("https://tollyanalysis.com/compare?a=prabhas&b=mahesh'1'\"<>");
    expect(decodeXmlEntities("https://tollyanalysis.com/?q=&amp;lt;tag&amp;gt;")).toBe(
      "https://tollyanalysis.com/?q=&lt;tag&gt;"
    );
  });

  it("parseSitemapUrls extracts <loc>, decodes entities, filters foreign/spoofed hosts, and deduplicates", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>  https://tollyanalysis.com  </loc></url>
        <url><loc>https://tollyanalysis.com/hero/prabhas</loc></url>
        <url><loc>https://tollyanalysis.com/hero/prabhas</loc></url>
        <url><loc>https://tollyanalysis.com/compare?left=allu-arjun&amp;right=ram-charan</loc></url>
        <url><loc><![CDATA[https://tollyanalysis.com/tolly-index]]></loc></url>
        <url><loc>https://evil.example.com/phish</loc></url>
        <url><loc>https://tollyanalysis.com.evil.com/spoof</loc></url>
        <url><loc>http://tollyanalysis.com/insecure-http</loc></url>
        <url><loc>   </loc></url>
        <url><loc>not-a-valid-url</loc></url>
      </urlset>`;

    expect(parseSitemapUrls(xml, "https://tollyanalysis.com")).toEqual([
      "https://tollyanalysis.com",
      "https://tollyanalysis.com/hero/prabhas",
      "https://tollyanalysis.com/compare?left=allu-arjun&right=ram-charan",
      "https://tollyanalysis.com/tolly-index",
    ]);

    expect(parseSitemapUrls("", "https://tollyanalysis.com")).toEqual([]);
  });

  it("chunkUrls caps every batch at 10,000 URLs and validates batchSize bounds", () => {
    const urls = Array.from({ length: 10005 }, (_, i) => `https://tollyanalysis.com/u/${i}`);
    const batches = chunkUrls(urls);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(10000);
    expect(batches[1]).toHaveLength(5);

    expect(() => chunkUrls(urls, 0)).toThrow(RangeError);
    expect(() => chunkUrls(urls, 10001)).toThrow(RangeError);
  });

  it("submitIndexNow accepts both HTTP 200 and HTTP 202 and sends expected JSON payload", async () => {
    const fetch200 = vi.fn<typeof fetch>(async () => new Response("OK", { status: 200 }));
    const res200 = await submitIndexNow({
      urls: ["https://tollyanalysis.com", "https://tollyanalysis.com/tolly-index"],
      key: DEFAULT_KEY,
      host: "tollyanalysis.com",
      endpoint: "https://api.indexnow.org/indexnow",
      fetchFn: fetch200,
    });

    expect(res200).toEqual({
      ok: true,
      submitted: 2,
      batches: 1,
      statuses: [200],
    });
    expect(fetch200).toHaveBeenCalledTimes(1);
    const [endpointCalled, initCalled] = fetch200.mock.calls[0];
    expect(endpointCalled).toBe("https://api.indexnow.org/indexnow");
    expect(initCalled?.method).toBe("POST");
    expect(JSON.parse(String(initCalled?.body))).toEqual({
      host: "tollyanalysis.com",
      key: DEFAULT_KEY,
      keyLocation: `https://tollyanalysis.com/${DEFAULT_KEY}.txt`,
      urlList: ["https://tollyanalysis.com", "https://tollyanalysis.com/tolly-index"],
    });

    const fetch202 = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
    const res202 = await submitIndexNow({
      urls: ["https://tollyanalysis.com/star-score"],
      fetchFn: fetch202,
    });
    expect(res202).toEqual({
      ok: true,
      submitted: 1,
      batches: 1,
      statuses: [202],
    });
  });

  it("submitIndexNow validates inputs and surfaces HTTP 422 and 403 errors cleanly", async () => {
    const noopFetch = vi.fn<typeof fetch>();
    await expect(submitIndexNow({ urls: [], fetchFn: noopFetch })).rejects.toThrow(
      /at least one non-empty URL/i
    );
    await expect(submitIndexNow({ urls: ["   "], fetchFn: noopFetch })).rejects.toThrow(
      /at least one non-empty URL/i
    );
    await expect(
      submitIndexNow({ urls: ["https://tollyanalysis.com"], key: "", fetchFn: noopFetch })
    ).rejects.toThrow(/key is required/i);
    expect(noopFetch).not.toHaveBeenCalled();

    const fetch422 = vi.fn<typeof fetch>(
      async () => new Response("Invalid urlList host", { status: 422 })
    );
    await expect(
      submitIndexNow({
        urls: ["https://tollyanalysis.com/hero/prabhas"],
        fetchFn: fetch422,
      })
    ).rejects.toThrow(/HTTP 422.*Invalid urlList host/);

    const fetch403 = vi.fn<typeof fetch>(
      async () => new Response(`Key ${DEFAULT_KEY} verification failed`, { status: 403 })
    );
    await expect(
      submitIndexNow({
        urls: ["https://tollyanalysis.com/hero/prabhas"],
        fetchFn: fetch403,
      })
    ).rejects.toThrow(/HTTP 403.*\[REDACTED\]/);
  });

  it("submitIndexNow splits > 10,000 URLs into multiple batches cleanly", async () => {
    const urls = Array.from(
      { length: 20500 },
      (_, i) => `https://tollyanalysis.com/hero/hero-${i}`
    );
    const batchSizes: number[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      const parsed = JSON.parse(String(init?.body)) as { urlList: string[] };
      batchSizes.push(parsed.urlList.length);
      return new Response(null, { status: 202 });
    });

    const result = await submitIndexNow({ urls, fetchFn: fetchMock });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(batchSizes).toEqual([10000, 10000, 500]);
    expect(result).toEqual({
      ok: true,
      submitted: 20500,
      batches: 3,
      statuses: [202, 202, 202],
    });
  });

  it("fetchSitemapWithRetry retries transient 503 responses, passes AbortSignal, and succeeds on recovery", async () => {
    let calls = 0;
    const seenSignals: Array<AbortSignal | null | undefined> = [];
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      seenSignals.push(init?.signal);
      calls += 1;
      if (calls < 3) {
        return new Response("Edge warming", { status: 503 });
      }
      return new Response("<urlset><url><loc>https://tollyanalysis.com</loc></url></urlset>", {
        status: 200,
      });
    });

    const xml = await fetchSitemapWithRetry({
      sitemapUrl: "https://tollyanalysis.com/sitemap.xml",
      fetchFn: fetchMock,
      retries: 3,
      delayMs: 10,
      timeoutMs: 5000,
      sleepFn: async () => {},
    });

    expect(calls).toBe(3);
    expect(seenSignals).toHaveLength(3);
    for (const sig of seenSignals) {
      expect(sig).toBeInstanceOf(AbortSignal);
      expect(sig?.aborted).toBe(false);
    }
    expect(parseSitemapUrls(xml)).toEqual(["https://tollyanalysis.com"]);
  });

  it("submitIndexNow and fetchSitemapWithRetry attach AbortSignal.timeout and validate timeoutMs bounds", async () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(15000);

    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
    await submitIndexNow({
      urls: ["https://tollyanalysis.com/heroes"],
      fetchFn: fetchMock,
      timeoutMs: 8000,
    });

    const [, initCalled] = fetchMock.mock.calls[0];
    expect(initCalled?.signal).toBeInstanceOf(AbortSignal);
    expect(initCalled?.signal?.aborted).toBe(false);

    await expect(
      submitIndexNow({
        urls: ["https://tollyanalysis.com/heroes"],
        fetchFn: fetchMock,
        timeoutMs: 0,
      })
    ).rejects.toThrow(RangeError);

    await expect(
      fetchSitemapWithRetry({
        fetchFn: fetchMock,
        timeoutMs: -1,
      })
    ).rejects.toThrow(RangeError);
  });

  it("runCli() executes end-to-end happy path: fetches sitemap, parses URLs, submits IndexNow batch with AbortSignal, and logs summary", async () => {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://tollyanalysis.com</loc></url>
        <url><loc>https://tollyanalysis.com/heroes</loc></url>
        <url><loc>https://tollyanalysis.com/directors</loc></url>
        <url><loc>https://evil.example.com/ignored</loc></url>
      </urlset>`;

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      if (url === "https://tollyanalysis.com/sitemap.xml") {
        return new Response(sitemapXml, { status: 200 });
      }
      if (url === "https://api.indexnow.org/indexnow") {
        return new Response(null, { status: 202 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const logMock = vi.fn<(...args: unknown[]) => void>();
    const warnMock = vi.fn<(...args: unknown[]) => void>();

    const result = await runCli(
      {
        INDEXNOW_SITEMAP_URL: "https://tollyanalysis.com/sitemap.xml",
        INDEXNOW_BASE_URL: "https://tollyanalysis.com",
        INDEXNOW_HOST: "tollyanalysis.com",
        INDEXNOW_KEY: DEFAULT_KEY,
        INDEXNOW_ENDPOINT: "https://api.indexnow.org/indexnow",
      },
      {
        fetchFn: fetchMock,
        log: logMock,
        warn: warnMock,
        timeoutMs: 4000,
        delayMs: 0,
      }
    );

    expect(result).toEqual({
      ok: true,
      submitted: 3,
      batches: 1,
      statuses: [202],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, postInit] = fetchMock.mock.calls[1];
    expect(postInit?.method).toBe("POST");
    expect(JSON.parse(String(postInit?.body))).toEqual({
      host: "tollyanalysis.com",
      key: DEFAULT_KEY,
      keyLocation: `https://tollyanalysis.com/${DEFAULT_KEY}.txt`,
      urlList: [
        "https://tollyanalysis.com",
        "https://tollyanalysis.com/heroes",
        "https://tollyanalysis.com/directors",
      ],
    });
    expect(logMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(
      "IndexNow submitted 3 URLs in 1 batch(es) (HTTP 202)."
    );
    expect(warnMock).not.toHaveBeenCalled();
  });

  it("runCli() handles transient sitemap 503 retry recovery, missing/empty sitemap errors, and persistent HTTP failures", async () => {
    // 1. Transient 503 on sitemap followed by recovery -> warns and completes
    let attempt = 0;
    const retryFetch = vi.fn<typeof fetch>(async (input, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const url = String(input);
      if (url.endsWith("/sitemap.xml")) {
        attempt += 1;
        if (attempt === 1) {
          return new Response("Warming up", { status: 503 });
        }
        return new Response(
          "<urlset><url><loc>https://tollyanalysis.com/releases</loc></url></urlset>",
          { status: 200 }
        );
      }
      return new Response("OK", { status: 200 });
    });
    const logMock = vi.fn<(...args: unknown[]) => void>();
    const warnMock = vi.fn<(...args: unknown[]) => void>();

    const recovered = await runCli(
      {},
      {
        fetchFn: retryFetch,
        log: logMock,
        warn: warnMock,
        retries: 2,
        delayMs: 1,
        sleepFn: async () => {},
      }
    );
    expect(recovered).toEqual({ ok: true, submitted: 1, batches: 1, statuses: [200] });
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock.mock.calls[0][0]).toContain("HTTP 503");
    expect(logMock).toHaveBeenCalledWith(
      "IndexNow submitted 1 URLs in 1 batch(es) (HTTP 200)."
    );

    // 2. Empty or foreign-only sitemap -> warns and throws without calling IndexNow
    const emptySitemapFetch = vi.fn<typeof fetch>(
      async () => new Response("<urlset></urlset>", { status: 200 })
    );
    const emptyLog = vi.fn<(...args: unknown[]) => void>();
    const emptyWarn = vi.fn<(...args: unknown[]) => void>();
    await expect(
      runCli(
        {},
        {
          fetchFn: emptySitemapFetch,
          log: emptyLog,
          warn: emptyWarn,
          retries: 1,
          delayMs: 0,
        }
      )
    ).rejects.toThrow(/No valid URLs found in sitemap/);
    expect(emptySitemapFetch).toHaveBeenCalledTimes(1);
    expect(emptyWarn).toHaveBeenCalledTimes(1);
    expect(emptyLog).not.toHaveBeenCalled();

    // 3. Exhausted sitemap HTTP 404 -> throws cleanly without calling IndexNow
    const notFoundFetch = vi.fn<typeof fetch>(
      async () => new Response("Not Found", { status: 404 })
    );
    await expect(
      runCli({
        fetchFn: notFoundFetch,
        log: vi.fn<(...args: unknown[]) => void>(),
        warn: vi.fn<(...args: unknown[]) => void>(),
        retries: 2,
        delayMs: 1,
        sleepFn: async () => {},
      })
    ).rejects.toThrow(/HTTP 404/);
    expect(notFoundFetch).toHaveBeenCalledTimes(2);
  });
});
