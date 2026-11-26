declare module "*/.open-next/worker.js" {
  interface OpenNextAssetsBinding {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  }

  interface OpenNextEnv {
    ASSETS: OpenNextAssetsBinding;
    [key: string]: unknown;
  }

  interface OpenNextExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException?(): void;
  }

  const openNextWorker: {
    fetch(
      request: Request,
      env: OpenNextEnv,
      ctx: OpenNextExecutionContext
    ): Promise<Response>;
  };

  export default openNextWorker;
}
