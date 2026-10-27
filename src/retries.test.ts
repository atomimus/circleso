import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { createAdmin } from "./adminApi";
import { createAuth } from "./authApi";
import {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  CircleTimeoutError,
} from "./core/errors";
import { createSmartFetch, type RetryConfig, type SmartFetchInit } from "./core/http";
import { createHeadless } from "./headlessApi";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("smart fetch replay controls", () => {
  it("exposes typed replay limits and a per-attempt body factory", () => {
    expectTypeOf<RetryConfig["maxReplayBodyBytes"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<RetryConfig["maxRetryAfterMs"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NonNullable<SmartFetchInit["bodyFactory"]>>().toEqualTypeOf<
      (attempt: number, signal: AbortSignal) => BodyInit | Promise<BodyInit>
    >();
  });

  it("replays fresh caller-owned streams without retaining request metadata", async () => {
    const bodies: string[] = [];
    const factory = vi.fn((attempt: number, signal: AbortSignal) => {
      expect(signal.aborted).toBe(false);
      expect(attempt).toBe(bodies.length);
      return new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("fresh"));
          controller.close();
        },
      });
    });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      bodies.push(await (input as Request).text());
      return bodies.length === 1
        ? new Response("retry", { status: 503, headers: { "retry-after": "0" } })
        : new Response("ok");
    });
    const smartFetch = createSmartFetch({ baseUrl: "https://example.test", fetcher });
    const response = await smartFetch("/upload", { method: "PUT", bodyFactory: factory });
    expect(await response.text()).toBe("ok");
    expect(bodies).toEqual(["fresh", "fresh"]);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory.mock.calls[0]?.[1]).not.toBe(factory.mock.calls[1]?.[1]);
  });

  it("does not treat a body factory as permission to retry POST", async () => {
    const factory = vi.fn(() => "fresh");
    const fetcher = vi.fn(async () => new Response("failure", { status: 503 }));
    const smartFetch = createSmartFetch({ baseUrl: "https://example.test", fetcher });
    await expect(
      smartFetch("/unsafe", { method: "POST", bodyFactory: factory }),
    ).rejects.toBeInstanceOf(CircleHttpError);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("preserves a factory TypeError as a config failure instead of retrying it", async () => {
    const cause = new TypeError("factory failed");
    const factory = vi.fn(() => {
      throw cause;
    });
    const fetcher = vi.fn();
    const smartFetch = createSmartFetch({ baseUrl: "https://example.test", fetcher });
    await expect(
      smartFetch("/upload", { method: "PUT", bodyFactory: factory }),
    ).rejects.toMatchObject({
      name: "CircleConfigError",
      cause,
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["timeout", "cancel"])("bounds asynchronous factory preparation by %s", async (mode) => {
    vi.useFakeTimers();
    const fetcher = vi.fn();
    const controller = new AbortController();
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      timeoutMs: 10,
    });
    const result = smartFetch("/upload", {
      method: "PUT",
      signal: controller.signal,
      bodyFactory: () => new Promise<BodyInit>(() => {}),
    });
    const assertion = expect(result).rejects.toBeInstanceOf(
      mode === "timeout" ? CircleTimeoutError : CircleNetworkError,
    );
    if (mode === "timeout") await vi.advanceTimersByTimeAsync(10);
    else controller.abort("caller");
    await assertion;
    expect(fetcher).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disposes a factory stream that arrives after the attempt deadline", async () => {
    vi.useFakeTimers();
    let complete: ((body: BodyInit) => void) | undefined;
    const cancel = vi.fn();
    const fetcher = vi.fn();
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      timeoutMs: 10,
    });
    const result = smartFetch("/upload", {
      method: "PUT",
      bodyFactory: () =>
        new Promise<BodyInit>((resolve) => {
          complete = resolve;
        }),
    });
    const assertion = expect(result).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    complete?.(new ReadableStream({ cancel }));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps opaque input Request bodies single-attempt even when labelled JSON", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      await (input as Request).text();
      return new Response("failure", { status: 503 });
    });
    const smartFetch = createSmartFetch({ baseUrl: "https://example.test", fetcher });
    const request = new Request("https://example.test/upload", {
      method: "PUT",
      body: "{}",
      headers: { "content-type": "application/json", "content-length": "2" },
    });
    await expect(smartFetch(request)).rejects.toMatchObject({ status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    "string",
    "buffer",
    "blob",
    "params",
    "form",
  ])("preserves the encoded %s body and content type exactly across attempts", async (kind) => {
    const form = new FormData();
    form.append("field", "fixture");
    form.append("file", new Blob(["file-fixture"]), "fixture.txt");
    const bodies = new Map<string, BodyInit>([
      ["string", "fixture"],
      ["buffer", new TextEncoder().encode("fixture")],
      ["blob", new Blob(["fixture"], { type: "application/octet-stream" })],
      ["params", new URLSearchParams({ field: "fixture" })],
      ["form", form],
    ]);
    const uploads: { text: string; contentType: string | null }[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      uploads.push({
        text: await request.text(),
        contentType: request.headers.get("content-type"),
      });
      return uploads.length === 1
        ? new Response("retry", { status: 503, headers: { "retry-after": "0" } })
        : new Response("ok");
    });
    const smartFetch = createSmartFetch({ baseUrl: "https://example.test", fetcher });
    const body = bodies.get(kind);
    if (body === undefined) throw new Error("Missing body fixture.");
    const response = await smartFetch("/upload", { method: "PUT", body });
    await response.text();
    expect(uploads).toHaveLength(2);
    expect(uploads[1]).toEqual(uploads[0]);
    if (kind === "form")
      expect(uploads[0]?.contentType).toMatch(/^multipart\/form-data; boundary=/);
    if (kind === "string") expect(uploads[0]?.contentType).toBe("text/plain;charset=UTF-8");
  });

  it("stops snapshotting at the cap and streams the remaining multipart bytes intact", async () => {
    const form = new FormData();
    form.append("a", "a".repeat(20));
    form.append("b", new Blob(["b".repeat(1000)]), "b.txt");
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      const received = await request.formData();
      expect(received.get("a")).toBe("a".repeat(20));
      expect(await (received.get("b") as Blob).text()).toBe("b".repeat(1000));
      return new Response("failure", { status: 503 });
    });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      retries: { maxReplayBodyBytes: 150 },
    });
    await expect(smartFetch("/upload", { method: "PUT", body: form })).rejects.toMatchObject({
      status: 503,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses per-call retry overrides and the configured Retry-After cap", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("retry", { status: 503, headers: { "retry-after": "2" } }),
      )
      .mockResolvedValueOnce(new Response("ok"));
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      retries: { retries: 0, maxRetryAfterMs: 1 },
    });
    const result = smartFetch("/", { retries: { retries: 1, maxRetryAfterMs: 2000 } });
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await (await result).text()).toBe("ok");
  });

  it.each([0, 1])("bounds exponential jitter at random=%s", async (random) => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(random);
    const times: number[] = [];
    const start = Date.now();
    const fetcher = vi.fn(async () => {
      times.push(Date.now() - start);
      return times.length < 4 ? new Response("retry", { status: 503 }) : new Response("ok");
    });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      retries: { retries: 3, baseDelayMs: 10, maxDelayMs: 25, jitterRatio: 0.2 },
    });
    const result = smartFetch("/");
    await vi.runAllTimersAsync();
    await (await result).text();
    expect(times).toEqual(random === 0 ? [0, 8, 24, 44] : [0, 12, 36, 61]);
  });

  it.each([
    { retries: -1 },
    { retries: 1.5 },
    { retries: Number.POSITIVE_INFINITY },
    { retries: 11 },
    { baseDelayMs: Number.NaN },
    { maxDelayMs: -1 },
    { maxRetryAfterMs: 2_147_483_648 },
    { jitterRatio: -0.1 },
    { jitterRatio: 1.1 },
    { maxReplayBodyBytes: -1 },
    { maxReplayBodyBytes: 1.5 },
    { retryNonIdempotent: "yes" },
    { retries: null },
  ])("rejects invalid retry configuration %j before fetching", async (retries) => {
    const fetcher = vi.fn();
    expect(() =>
      createAdmin({ token: "synthetic-token", fetcher, retries: retries as RetryConfig }),
    ).toThrow(CircleConfigError);
    const smartFetch = createSmartFetch({ baseUrl: "https://example.test", fetcher });
    await expect(smartFetch("/", { retries: retries as RetryConfig })).rejects.toBeInstanceOf(
      CircleConfigError,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("public client request replay", () => {
  it("accepts native middleware request replacements without guessing their body provenance", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(await (input as Request).json()).toEqual({ name: "Renamed" });
      return Response.json({ message: "failure" }, { status: 503 });
    });
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    admin.raw.use({
      onRequest: ({ request }) => new Request(request, { headers: request.headers }),
    });
    await expect(admin.spaces.update(4, { name: "Renamed" })).rejects.toMatchObject({
      status: 503,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retries an Admin JSON PUT even when the first upload is not consumed", async () => {
    const bodies: string[] = [];
    let first: Request | undefined;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (!first) {
        first = request;
        return new Response('{"message":"slow down"}', {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      bodies.push(await request.text());
      return Response.json({ id: 4 });
    });
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    await expect(admin.spaces.update(4, { name: "Renamed" })).resolves.toMatchObject({ id: 4 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(bodies).toEqual([JSON.stringify({ name: "Renamed" })]);
    expect(first?.bodyUsed).toBe(true);
  });

  it.each(["admin", "headless"] as const)("replays a consumed %s DELETE body", async (surface) => {
    const bodies: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      bodies.push(await (input as Request).text());
      return bodies.length === 1
        ? new Response("retry", { status: 503, headers: { "retry-after": "0" } })
        : new Response(null, { status: 204 });
    });
    if (surface === "admin") {
      const admin = createAdmin({ token: "synthetic-token", fetcher });
      await admin.events.attendees.delete({ member_email: "fixture@example.com", event_id: "1" });
    } else {
      const headless = createHeadless({ accessToken: "synthetic-token", fetcher });
      await headless.chatRooms.reactions.delete({ chat_room_message: 1, unicode: "1f923" });
    }
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(bodies[1]).toBe(bodies[0]);
    expect(bodies[0]).not.toBe("");
  });

  it("retains the final HTTP failure after a body-bearing PUT exhausts retries", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      await (input as Request).text();
      return Response.json(
        { message: `failure-${fetcher.mock.calls.length}` },
        {
          status: 503,
          headers: { "retry-after": "0", "x-request-id": `req-${fetcher.mock.calls.length}` },
        },
      );
    });
    const admin = createAdmin({ token: "synthetic-token", fetcher, retries: { retries: 2 } });
    const result = admin.spaces.update(4, { name: "Renamed" });
    await expect(result).rejects.toBeInstanceOf(CircleHttpError);
    await expect(result).rejects.toMatchObject({
      status: 503,
      method: "PUT",
      url: "https://app.circle.so/api/admin/v2/spaces/4",
      requestId: "req-3",
      parsedJson: { message: "failure-3" },
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it.each([408, 429, 500, 503, 599])("retries public GET status %s", async (status) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("retry", {
          status,
          headers: { "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(Response.json({ records: [] }));
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    await admin.spaces.list();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 404, 422])("does not retry public GET status %s", async (status) => {
    const fetcher = vi.fn(async () => new Response("failure", { status }));
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    await expect(admin.spaces.list()).rejects.toMatchObject({ status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("keeps POST/PATCH opt-in (retryNonIdempotent=%s)", async (enabled) => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      await (input as Request).text();
      return fetcher.mock.calls.length % 2 === 1 || !enabled
        ? Response.json({ message: "failure" }, { status: 503, headers: { "retry-after": "0" } })
        : Response.json({});
    });
    const retries = { retryNonIdempotent: enabled, retries: 1 };
    const admin = createAdmin({ token: "synthetic-token", fetcher, retries });
    const auth = createAuth({ token: "synthetic-token", fetcher, retries });
    if (enabled) {
      await admin.invitationLinks.create({ name: "Fixture" });
      await auth.accessToken.refresh({ refresh_token: "synthetic-refresh" });
    } else {
      await expect(admin.invitationLinks.create({ name: "Fixture" })).rejects.toMatchObject({
        status: 503,
      });
      await expect(
        auth.accessToken.refresh({ refresh_token: "synthetic-refresh" }),
      ).rejects.toMatchObject({ status: 503 });
    }
    expect(fetcher).toHaveBeenCalledTimes(enabled ? 4 : 2);
  });

  it("preserves the final network cause and identical JSON uploads", async () => {
    const causes = [new TypeError("first"), new TypeError("last")];
    const bodies: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      bodies.push(await (input as Request).text());
      throw causes[bodies.length - 1];
    });
    const admin = createAdmin({
      token: "synthetic-token",
      fetcher,
      retries: { retries: 1, baseDelayMs: 0, jitterRatio: 0 },
    });
    const result = admin.spaces.update(4, { name: "Renamed" });
    const assertion = expect(result).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: causes[1],
      method: "PUT",
      url: "https://app.circle.so/api/admin/v2/spaces/4",
    });
    await assertion;
    expect(bodies).toEqual([
      JSON.stringify({ name: "Renamed" }),
      JSON.stringify({ name: "Renamed" }),
    ]);
  });

  it.each([
    "Tue, 27 Oct 2026 10:00:02 GMT",
    "2",
  ])("honors Retry-After %s beyond maxDelayMs", async (retryAfter) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-27T10:00:00Z"));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("retry", {
          status: 429,
          headers: { "retry-after": retryAfter },
        }),
      )
      .mockResolvedValueOnce(Response.json({}));
    const admin = createAdmin({
      token: "synthetic-token",
      fetcher,
      timeoutMs: 10,
      retries: { retries: 1, baseDelayMs: 1, maxDelayMs: 5, jitterRatio: 1 },
    });
    const result = admin.spaces.list();
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    "Tue, 27 Oct 2026 09:59:00 GMT",
    "0",
  ])("does not back off for Retry-After %s", async (retryAfter) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-27T10:00:00Z"));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("retry", {
          status: 429,
          headers: { "retry-after": retryAfter },
        }),
      )
      .mockResolvedValueOnce(Response.json({}));
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    const result = admin.spaces.list();
    await vi.advanceTimersByTimeAsync(0);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    "invalid",
    "-1",
    "1.5",
    "1e3",
    "Infinity",
  ])("falls back to exponential backoff for Retry-After %s", async (retryAfter) => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("retry", {
          status: 429,
          headers: { "retry-after": retryAfter },
        }),
      )
      .mockResolvedValueOnce(Response.json({}));
    const admin = createAdmin({
      token: "synthetic-token",
      fetcher,
      retries: { baseDelayMs: 20, jitterRatio: 0 },
    });
    const result = admin.spaces.list();
    await vi.advanceTimersByTimeAsync(19);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
  });

  it.each([
    "61",
    "9999999999999999999999999999999999999999999999",
    "Tue, 27 Oct 2099 10:00:00 GMT",
  ])("returns the final HTTP error when Retry-After %s exceeds the cap", async (retryAfter) => {
    const fetcher = vi.fn(async () =>
      Response.json(
        { message: "wait" },
        {
          status: 429,
          headers: { "retry-after": retryAfter, "x-request-id": "capped" },
        },
      ),
    );
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    await expect(admin.spaces.list()).rejects.toMatchObject({
      status: 429,
      requestId: "capped",
      parsedJson: { message: "wait" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("cancels a superseded response without waiting for its source cancellation", async () => {
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ cancel }), {
          status: 503,
          headers: { "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(Response.json({}));
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    await admin.spaces.list();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("cancels retry waiting with the original caller cause and no extra attempt", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new Error("caller stopped");
    const fetcher = vi.fn(
      async () => new Response("retry", { status: 429, headers: { "retry-after": "2" } }),
    );
    const admin = createAdmin({ token: "synthetic-token", fetcher, timeoutMs: 10 });
    const result = admin.spaces.update(4, { name: "Renamed", signal: controller.signal });
    const assertion = expect(result).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: reason,
    });
    await vi.advanceTimersByTimeAsync(100);
    controller.abort(reason);
    await assertion;
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives retried PUT response bodies a fresh deadline", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("retry", {
          status: 429,
          headers: { "retry-after": "1" },
        }),
      )
      .mockResolvedValueOnce(new Response(new ReadableStream({ start() {} })));
    const admin = createAdmin({ token: "synthetic-token", fetcher, timeoutMs: 10 });
    const result = admin.spaces.update(4, { name: "Renamed" });
    const assertion = expect(result).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(1009);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, 5])("sends an oversized body intact once with a %s-byte replay cap", async (cap) => {
    const bodies: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      bodies.push(await (input as Request).text());
      return new Response("retry", { status: 503, headers: { "retry-after": "0" } });
    });
    const admin = createAdmin({
      token: "synthetic-token",
      fetcher,
      retries: { maxReplayBodyBytes: cap },
    });
    await expect(admin.spaces.update(4, { name: "Renamed" })).rejects.toMatchObject({
      status: 503,
    });
    expect(bodies).toEqual([JSON.stringify({ name: "Renamed" })]);
  });

  it("does not snapshot or clone a genuinely streaming raw upload before fetching", async () => {
    const pull = vi.fn();
    const cancel = vi.fn();
    const clone = vi.spyOn(Request.prototype, "clone");
    const stream = new ReadableStream<Uint8Array>({ pull, cancel }, { highWaterMark: 0 });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect((input as Request).body).not.toBeNull();
      return new Response("retry", { status: 503, headers: { "retry-after": "0" } });
    });
    const admin = createAdmin({ token: "synthetic-token", fetcher });
    const init = {
      params: { path: { id: 4 } },
      body: { name: "Fixture" },
      bodySerializer: () => stream,
      duplex: "half" as const,
    };
    const result = await admin.raw.PUT("/api/admin/v2/spaces/{id}", init);
    expect(result.response.status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(clone).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
  });
});
