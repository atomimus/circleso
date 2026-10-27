import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { propagationLimits, publishAndWait, type ReleaseInput, waitForPublished } from "./release";

const input: ReleaseInput = {
  version: "1.0.1",
  sha: "a".repeat(40),
  run: "123",
  integrity: "qualified-digest",
  distTag: "latest",
};
const before = { latest: "1.0.0", next: "1.0.0-rc.1" };
const version = { version: input.version, dist: { integrity: input.integrity, attestations: {} } };
const tags = { ...before, latest: input.version };
const isTags = (url: RequestInfo | URL) => String(url).endsWith("/dist-tags");

describe("post-publication registry propagation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
    vi.setSystemTime(new Date("2026-10-27T00:00:00Z"));
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("submits once while 404, missing provenance and a stale tag propagate", async () => {
    let attempt = 0;
    const submit = vi.fn();
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      expect(init?.method).toBe("GET");
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toBeUndefined();
      if (isTags(url)) return Response.json(attempt < 3 ? before : tags);
      attempt++;
      if (attempt === 1) return new Response(null, { status: 404 });
      return Response.json(
        attempt === 2 ? { ...version, dist: { integrity: input.integrity } } : version,
      );
    });
    const pending = publishAndWait(input, before, submit, fetcher);
    await vi.advanceTimersByTimeAsync(0);
    expect(attempt).toBe(1);
    expect(submit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2 * propagationLimits.intervalMs);
    await expect(pending).resolves.toEqual({ version, tags });
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([
    404,
    408,
    429,
    500,
    503,
    "network",
    "json",
  ] as const)("retries transient registry GET failure %s without another submission", async (failure) => {
    let reads = 0;
    const submit = vi.fn();
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (isTags(url)) return Response.json(tags);
      if (++reads === 1) {
        if (failure === "network") throw new TypeError("synthetic connection failure");
        if (failure === "json") return new Response("{", { status: 200 });
        return new Response(null, { status: failure });
      }
      return Response.json(version);
    });
    const pending = publishAndWait(input, before, submit, fetcher);
    await vi.advanceTimersByTimeAsync(propagationLimits.intervalMs);
    await expect(pending).resolves.toEqual({ version, tags });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(reads).toBe(2);
  });

  it.each(["seconds", "date"])("honors Retry-After %s without an early request", async (format) => {
    let reads = 0;
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (isTags(url)) return Response.json(tags);
      return ++reads === 1
        ? new Response(null, {
            status: 429,
            headers: {
              "Retry-After":
                format === "seconds" ? "12" : new Date(Date.now() + 12_000).toUTCString(),
            },
          })
        : Response.json(version);
    });
    const pending = waitForPublished(input, before, fetcher);
    await vi.advanceTimersByTimeAsync(11_999);
    expect(reads).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ version, tags });
  });

  it("survives the observed long registry propagation delay with one publication", async () => {
    const availableAt = performance.now() + 100_000;
    const submit = vi.fn();
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      const ready = performance.now() >= availableAt;
      if (isTags(url)) return Response.json(ready ? tags : before);
      return ready ? Response.json(version) : new Response(null, { status: 404 });
    });
    const pending = publishAndWait(input, before, submit, fetcher);
    await vi.advanceTimersByTimeAsync(99_999);
    expect(submit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ version, tags });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([
    "missing version",
    "missing provenance",
    "stale tag",
    "404",
    "long retry-after",
  ])("expires the total verification budget for %s without republishing", async (condition) => {
    const submit = vi.fn();
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (isTags(url)) return Response.json(condition === "stale tag" ? before : tags);
      if (condition === "404") return new Response(null, { status: 404 });
      if (condition === "long retry-after")
        return new Response(null, { status: 503, headers: { "Retry-After": "3600" } });
      if (condition === "missing version") return Response.json({});
      return Response.json(
        condition === "missing provenance"
          ? { ...version, dist: { integrity: input.integrity } }
          : version,
      );
    });
    const outcome = publishAndWait(input, before, submit, fetcher).catch((error) => error);
    await vi.advanceTimersByTimeAsync(propagationLimits.timeoutMs);
    expect(await outcome).toMatchObject({
      message: expect.stringMatching(/timed out.*do not republish/i),
    });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
    if (condition === "long retry-after") expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["fetch", "body"])("bounds a hanging %s through the total deadline", async (phase) => {
    const signals: AbortSignal[] = [];
    const submit = vi.fn();
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      const signal = init?.signal;
      expect(signal).toBeInstanceOf(AbortSignal);
      if (!signal) throw new Error("Missing verification signal");
      signals.push(signal);
      if (isTags(url)) return Response.json(tags);
      if (phase === "fetch") return new Promise<Response>(() => {}); // A broken transport may ignore abort.
      return new Response(
        new ReadableStream({
          start(controller) {
            signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
          },
        }),
      );
    });
    const outcome = publishAndWait(input, before, submit, fetcher).catch((error) => error);
    await vi.advanceTimersByTimeAsync(propagationLimits.timeoutMs);
    expect(await outcome).toMatchObject({
      message: expect.stringMatching(/timed out.*do not republish/i),
    });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(signals.length).toBeGreaterThan(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it.each([
    "integrity",
    "version",
    "unrelated tag",
    400,
    401,
    403,
  ])("fails closed immediately on contradictory or unauthorized metadata %s", async (condition) => {
    const submit = vi.fn();
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (isTags(url))
        return Response.json(condition === "unrelated tag" ? { ...tags, next: "different" } : tags);
      if (typeof condition === "number") return new Response(null, { status: condition });
      if (condition === "version") return Response.json({ ...version, version: "different" });
      return Response.json(
        condition === "integrity"
          ? { ...version, dist: { ...version.dist, integrity: "different" } }
          : version,
      );
    });
    await expect(publishAndWait(input, before, submit, fetcher)).rejects.toThrow();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not poll or retry when the publication command itself fails", async () => {
    const failure = new Error("synthetic submission failure");
    const submit = vi.fn(() => {
      throw failure;
    });
    const fetcher = vi.fn<typeof fetch>();
    await expect(publishAndWait(input, before, submit, fetcher)).rejects.toBe(failure);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
