import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdmin } from "../admin";
import { createAuth } from "../auth";
import { createHeadless } from "../headless";
import {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  CircleTimeoutError,
} from "./errors";
import { createSmartFetch } from "./http";
import type { UsageControlsConfig } from "./usageControls";

afterEach(() => vi.useRealTimers());

const flush = async () => {
  for (let i = 0; i < 100; i++) await Promise.resolve();
};
const zeroRetry = { retries: 0 };
const stream = () => new Response(new ReadableStream<Uint8Array>());
const policy = { maxConcurrent: 1, maxQueueSize: 2 };
const circuitBreaker = { failureThreshold: 1, cooldownMs: 100 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("opt-in usage controls through public clients", () => {
  it("bounds active bodies and rejects overflow without fetching", async () => {
    const fetcher = vi.fn(async () => new Response(new ReadableStream()));
    const client = createHeadless({
      accessToken: "synthetic-member",
      fetcher,
      usage: { maxConcurrent: 1, maxQueueSize: 0 },
    });
    const first = await client.raw.GET("/api/headless/v1/bookmarks", { parseAs: "stream" });
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: { code: "CIRCLE_QUEUE_FULL" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await first.data?.cancel();
  });

  it("leaves concurrency and caching disabled by default", async () => {
    const fetcher = vi.fn(async () => stream());
    const client = createHeadless({ accessToken: "synthetic", fetcher });
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        client.raw.GET("/api/headless/v1/bookmarks", { parseAs: "stream" }),
      ),
    );
    expect(fetcher).toHaveBeenCalledTimes(8);
    await Promise.all(responses.map((response) => response.data?.cancel()));
  });

  it("bounds a multi-waiter FIFO queue and reclaims every slot", async () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    const core = createSmartFetch({
      baseUrl: "https://app.circle.so",
      usage: policy,
      fetcher: async (input) => {
        seen.push(new URL((input as Request).url).pathname);
        return stream();
      },
    });
    const held = await core("/one");
    const two = core("/two");
    const three = core("/three");
    await expect(core("/overflow")).rejects.toMatchObject({ cause: { code: "CIRCLE_QUEUE_FULL" } });
    await held.body?.cancel();
    const next = await two;
    expect(seen).toEqual(["/one", "/two"]);
    await next.body?.cancel();
    await (await three).body?.cancel();
    expect(seen).toEqual(["/one", "/two", "/three"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("removes canceled FIFO waiters and reuses queue capacity", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => stream());
    const client = createHeadless({ accessToken: "synthetic", fetcher, usage: policy });
    const held = await client.raw.GET("/api/headless/v1/bookmarks", { parseAs: "stream" });
    const abort = new AbortController();
    const reason = { synthetic: "cancel" };
    const canceled = client.bookmarks.list({ signal: abort.signal });
    const canceledCheck = expect(canceled).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: reason,
    });
    await flush();
    abort.abort(reason);
    await canceledCheck;
    const next = client.raw.GET("/api/headless/v1/bookmarks", { parseAs: "stream" });
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await held.data?.cancel();
    const response = await next;
    expect(fetcher).toHaveBeenCalledTimes(2);
    await response.data?.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the per-attempt deadline running while queued", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => stream());
    const client = createHeadless({ accessToken: "synthetic", fetcher, usage: policy });
    const held = await client.raw.GET("/api/headless/v1/bookmarks", { parseAs: "stream" });
    // Core per-call deadline proves queue + transport share one attempt budget.
    const core = createSmartFetch({
      baseUrl: "https://app.circle.so",
      usage: { rate: { maxRequests: 1, intervalMs: 1000 } },
      fetcher: async () => new Response(null, { status: 204 }),
    });
    await core("/one");
    const pending = core("/two", { timeoutMs: 20 });
    const check = expect(pending).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(20);
    await check;
    await held.data?.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("enforces a queue deadline even when the attempt deadline is disabled", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => stream());
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      timeoutMs: 0,
      usage: { ...policy, maxQueueWaitMs: 15 },
    });
    const held = await client.raw.GET("/api/headless/v1/bookmarks", { parseAs: "stream" });
    const check = expect(client.bookmarks.list()).rejects.toMatchObject({
      name: "CircleTimeoutError",
      timeoutMs: 15,
      cause: { name: "TimeoutError" },
    });
    await vi.advanceTimersByTimeAsync(15);
    await check;
    expect(fetcher).toHaveBeenCalledTimes(1);
    await held.data?.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves pre-aborted caller reasons without starting an attempt", async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    const client = createHeadless({ accessToken: "synthetic", fetcher, usage: policy });
    const reason = new Error("synthetic cancellation");
    const error = await client.bookmarks
      .list({ signal: AbortSignal.abort(reason) })
      .catch((error) => error);
    expect(error).toBeInstanceOf(CircleNetworkError);
    expect(error.cause).toBe(reason);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("charges retries to the rolling budget without shortening Retry-After", async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const fetcher = vi.fn(async () => {
      starts.push(Date.now());
      return starts.length === 1
        ? new Response(null, { status: 429, headers: { "Retry-After": "1" } })
        : Response.json({ records: [] });
    });
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      usage: { rate: { maxRequests: 1, intervalMs: 1500 } },
    });
    const pending = client.bookmarks.list();
    await vi.advanceTimersByTimeAsync(1499);
    expect(starts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ records: [] });
    expect(starts.at(1)).toBe(Number(starts.at(0)) + 1500);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases concurrency during retry waits and queues retries behind existing waiters", async () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    const core = createSmartFetch({
      baseUrl: "https://app.circle.so",
      usage: policy,
      retries: { baseDelayMs: 100, jitterRatio: 0 },
      fetcher: async (input) => {
        const path = new URL((input as Request).url).pathname;
        seen.push(path);
        return new Response(null, { status: seen.length === 1 ? 503 : 204 });
      },
    });
    const first = core("/first");
    await flush();
    await core("/second");
    expect(seen).toEqual(["/first", "/second"]);
    await vi.advanceTimersByTimeAsync(100);
    await first;
    expect(seen).toEqual(["/first", "/second", "/first"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels rate waits and clears admission timers", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const core = createSmartFetch({
      baseUrl: "https://app.circle.so",
      fetcher,
      usage: { rate: { maxRequests: 1, intervalMs: 100 } },
    });
    await core("/one");
    const abort = new AbortController();
    const check = expect(core("/two", { signal: abort.signal })).rejects.toMatchObject({
      cause: "synthetic",
    });
    await flush();
    abort.abort("synthetic");
    await check;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("admits only one half-open probe and closes after its healthy headers", async () => {
    vi.useFakeTimers();
    const probe = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockImplementationOnce(() => probe.promise)
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      retries: zeroRetry,
      usage: { ...policy, circuitBreaker },
    });
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    await vi.advanceTimersByTimeAsync(100);
    const pending = client.bookmarks.list();
    await flush();
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    probe.resolve(new Response(null, { status: 204 }));
    await pending;
    await client.bookmarks.list();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reopens after a failed probe and rejects queued work when opening", async () => {
    vi.useFakeTimers();
    const first = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(new Response(null, { status: 503 }));
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      retries: zeroRetry,
      usage: { ...policy, circuitBreaker },
    });
    const failed = expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await flush();
    const queued = expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    await flush();
    first.resolve(new Response(null, { status: 503 }));
    await Promise.all([failed, queued]);
    await vi.advanceTimersByTimeAsync(100);
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reopens conservatively after a canceled half-open probe", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockImplementation(() => new Promise(() => {}));
    const core = createSmartFetch({
      baseUrl: "https://app.circle.so",
      fetcher,
      retries: zeroRetry,
      usage: { circuitBreaker },
    });
    await expect(core("/one")).rejects.toBeInstanceOf(CircleHttpError);
    await vi.advanceTimersByTimeAsync(100);
    const abort = new AbortController();
    const check = expect(core("/probe", { signal: abort.signal })).rejects.toMatchObject({
      cause: "synthetic-cancel",
    });
    await flush();
    abort.abort("synthetic-cancel");
    await check;
    await expect(core("/blocked")).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets consecutive failures after an unselected status and excludes body failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(
        new Response("bad-json", { headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      retries: zeroRetry,
      usage: { ...policy, circuitBreaker: { ...circuitBreaker, failureThreshold: 2 } },
    });
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleNetworkError);
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await client.bookmarks.list();
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it("releases a stalled active body's capacity on deadline without counting a circuit failure", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async () => stream())
      .mockImplementation(async () => new Response(null, { status: 204 }));
    const core = createSmartFetch({
      baseUrl: "https://app.circle.so",
      fetcher,
      timeoutMs: 10,
      usage: { ...policy, circuitBreaker },
    });
    const first = await core("/one");
    const check = expect(first.text()).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await check;
    await core("/two");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("blocks automatic retries when a failure opens the circuit", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => new Response(null, { status: 503 }));
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      retries: { baseDelayMs: 0 },
      usage: { circuitBreaker },
    });
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("counts transport failures but preserves their original cause", async () => {
    const reason = new TypeError("synthetic network failure");
    const fetcher = vi.fn(async () => {
      throw reason;
    });
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      retries: zeroRetry,
      usage: { circuitBreaker },
    });
    const error = await client.bookmarks.list().catch((error) => error);
    expect(error.cause).toBe(reason);
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("ignores late healthy headers from an older circuit generation", async () => {
    const late = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => late.promise)
      .mockResolvedValue(new Response(null, { status: 503 }));
    const client = createHeadless({
      accessToken: "synthetic",
      fetcher,
      retries: zeroRetry,
      usage: { maxConcurrent: 2, circuitBreaker },
    });
    const pending = client.bookmarks.list();
    await flush();
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    late.resolve(new Response(null, { status: 204 }));
    await pending;
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
  });

  it("allows application-selected HTTP failure statuses and snapshots configuration", async () => {
    const statuses = [403];
    const usage = { circuitBreaker: { ...circuitBreaker, failureStatuses: statuses } };
    const fetcher = vi.fn(async () => new Response(null, { status: 403 }));
    const client = createHeadless({ accessToken: "synthetic", fetcher, usage });
    statuses.length = 0;
    usage.circuitBreaker.failureThreshold = 10;
    await expect(client.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await expect(client.bookmarks.list()).rejects.toMatchObject({
      cause: { code: "CIRCLE_CIRCUIT_OPEN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps users, communities and reused config objects isolated", async () => {
    const usage = { ...policy, circuitBreaker };
    const failed = createHeadless({
      accessToken: "synthetic-A",
      baseUrl: "https://one.example",
      retries: zeroRetry,
      usage,
      fetcher: async () => new Response(null, { status: 503 }),
    });
    const fetcher = vi.fn(async (request: RequestInfo | URL) => {
      expect((request as Request).headers.get("authorization")).toBe("Bearer synthetic-B");
      return Response.json({ records: [{ id: 2 }] });
    });
    const healthy = createHeadless({
      accessToken: "synthetic-B",
      baseUrl: "https://two.example",
      usage,
      fetcher,
    });
    await expect(failed.bookmarks.list()).rejects.toBeInstanceOf(CircleHttpError);
    await expect(healthy.bookmarks.list()).resolves.toEqual({ records: [{ id: 2 }] });
    await healthy.bookmarks.list();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shares admission with single-flight refresh and replays without deadlock", async () => {
    let refreshes = 0;
    const client = createHeadless({
      accessToken: "synthetic-old",
      refreshToken: "synthetic-refresh",
      authToken: "synthetic-app",
      autoRefresh: true,
      usage: policy,
      fetcher: async (input) => {
        const request = input as Request;
        if (request.url.includes("access_token/refresh")) {
          refreshes++;
          return Response.json({ access_token: "synthetic-new" });
        }
        return request.headers.get("authorization") === "Bearer synthetic-new"
          ? Response.json({ records: [] })
          : new Response(null, { status: 401 });
      },
    });
    await Promise.all([client.bookmarks.list(), client.bookmarks.list()]);
    expect(refreshes).toBe(1);
  });

  it("charges refresh and replay to the same rolling budget", async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const client = createHeadless({
      accessToken: "synthetic-old",
      refreshToken: "synthetic-refresh",
      authToken: "synthetic-app",
      autoRefresh: true,
      usage: { rate: { maxRequests: 1, intervalMs: 100 } },
      fetcher: async (input) => {
        starts.push(Date.now());
        const request = input as Request;
        if (request.url.includes("access_token/refresh"))
          return Response.json({ access_token: "synthetic-new" });
        return request.headers.get("authorization") === "Bearer synthetic-new"
          ? Response.json({ records: [] })
          : new Response(null, { status: 401 });
      },
    });
    const pending = client.bookmarks.list();
    await vi.advanceTimersByTimeAsync(199);
    expect(starts).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(starts.map((time) => time - Number(starts.at(0)))).toEqual([0, 100, 200]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["admin", "auth"])("applies the same policy to %s clients", async (kind) => {
    const fetcher = vi.fn(async () => new Response(null, { status: 503 }));
    const config = { token: "synthetic", fetcher, retries: zeroRetry, usage: { circuitBreaker } };
    // Retain one client: state is intentionally not shared between constructions.
    const client = kind === "admin" ? createAdmin(config) : createAuth(config);
    const call = () =>
      "spaces" in client
        ? client.spaces.list()
        : client.authToken.create({ email: "synthetic@example.test" });
    await expect(call()).rejects.toBeInstanceOf(CircleHttpError);
    await expect(call()).rejects.toMatchObject({ cause: { code: "CIRCLE_CIRCUIT_OPEN" } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    [],
    { maxConcurrent: null },
    { maxQueueSize: null },
    { maxQueueWaitMs: null },
    { maxConcurrent: 0 },
    { maxConcurrent: 10_001 },
    { maxQueueSize: -1 },
    { maxQueueWaitMs: 0 },
    { maxQueueWaitMs: Infinity },
    { rate: {} },
    { rate: { maxRequests: 1, intervalMs: 0 } },
    { rate: { maxRequests: 10_001, intervalMs: 1 } },
    { circuitBreaker: {} },
    { circuitBreaker: { ...circuitBreaker, failureStatuses: [200] } },
    { circuitBreaker: { ...circuitBreaker, failureStatuses: [600] } },
    { circuitBreaker: { ...circuitBreaker, failureStatuses: null } },
  ])("rejects invalid policy configuration %#", (usage) => {
    expect(() =>
      createHeadless({ accessToken: "synthetic", usage: usage as UsageControlsConfig }),
    ).toThrow(CircleConfigError);
  });
});
