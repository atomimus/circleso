import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdmin } from "./adminApi";
import { createAuth } from "./authApi";
import { CircleNetworkError, CircleTimeoutError } from "./core/errors";
import { createHeadless } from "./headlessApi";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function clients(fetcher: typeof fetch, timeoutMs = 50) {
  const config = { token: "synthetic-token", fetcher, timeoutMs, retries: { retries: 0 } };
  return [
    { name: "Admin", call: (signal: AbortSignal) => createAdmin(config).spaces.list({ signal }) },
    {
      name: "Headless",
      call: (signal: AbortSignal) => createHeadless(config).spaces.list({ signal }),
    },
    {
      name: "Auth",
      call: (signal: AbortSignal) =>
        createAuth(config).accessToken.refresh({ refresh_token: "synthetic-refresh", signal }),
    },
  ];
}

describe("public client cancellation", () => {
  for (const index of [0, 1, 2]) {
    it(`rejects pre-aborted resource calls before fetch (surface ${index})`, async () => {
      const fetcher = vi.fn(async () => Response.json({}));
      const controller = new AbortController();
      const cause = new Error("caller stopped");
      controller.abort(cause);
      const client = clients(fetcher)[index];
      expect(client).toBeDefined();
      await expect(client?.call(controller.signal)).rejects.toMatchObject({
        name: "CircleNetworkError",
        cause,
      });
      expect(fetcher).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it(`cancels in-flight resource calls even if fetch ignores abort (surface ${index})`, async () => {
      const fetcher = vi.fn(() => new Promise<Response>(() => {}));
      const controller = new AbortController();
      const cause = { message: "caller stopped" };
      const promise = clients(fetcher)[index]?.call(controller.signal);
      const assertion = expect(promise).rejects.toMatchObject({
        name: "CircleNetworkError",
        cause,
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(fetcher).toHaveBeenCalledOnce();
      controller.abort(cause);
      await assertion;
      expect(vi.getTimerCount()).toBe(0);
    });

    it(`cancels stalled response reads with the original reason (surface ${index})`, async () => {
      const cancel = vi.fn();
      let reading!: () => void;
      const readStarted = new Promise<void>((resolve) => {
        reading = resolve;
      });
      const body = new ReadableStream<Uint8Array>({ pull: reading, cancel }, { highWaterMark: 0 });
      const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(body));
      const controller = new AbortController();
      const cause = new DOMException("caller deadline", "TimeoutError");
      let failure: unknown;
      const promise = clients(fetcher)
        [index]?.call(controller.signal)
        .catch((error: unknown) => {
          failure = error;
        });
      // Rendezvous with the actual body read, independent of native Request scheduling.
      await readStarted;
      controller.abort(cause);
      expect((fetcher.mock.calls[0]?.[0] as Request).signal.aborted).toBe(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(failure).toBeInstanceOf(CircleNetworkError);
      await promise;
      expect(failure).toBeInstanceOf(CircleNetworkError);
      expect((failure as CircleNetworkError).cause).toBe(cause);
      expect(cancel).toHaveBeenCalledWith(failure);
      expect(body.locked).toBe(false);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    });

    it(`bounds stalled error response reads (surface ${index})`, async () => {
      const cancel = vi.fn();
      const fetcher = vi.fn(
        async () => new Response(new ReadableStream({ cancel }), { status: 400 }),
      );
      const promise = clients(fetcher, 10)[index]?.call(new AbortController().signal);
      const assertion = expect(promise).rejects.toBeInstanceOf(CircleTimeoutError);
      await vi.advanceTimersByTimeAsync(10);
      await assertion;
      expect(cancel).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    });
  }

  it("bounds a stalled body after immediate headers through a public resource", async () => {
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const cancel = vi.fn();
    const fetcher = vi.fn(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              source = controller;
            },
            cancel,
          }),
        ),
    );
    const headless = createHeadless({ token: "synthetic-token", fetcher, timeoutMs: 10 });
    let failure: unknown;
    const promise = headless.spaces.list().catch((error: unknown) => {
      failure = error;
    });
    try {
      await vi.advanceTimersByTimeAsync(10);
      expect(failure).toBeInstanceOf(CircleTimeoutError);
      expect(failure).toMatchObject({ timeoutMs: 10, cause: { name: "TimeoutError" } });
      expect(cancel).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      if (!cancel.mock.calls.length) source.close();
      await promise;
    }
  });

  it.each(["network", "Retry-After"])("cancels a public call during %s backoff", async (kind) => {
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const fetcher = vi.fn(async () => {
      if (kind === "network") throw new TypeError("synthetic network failure");
      return new Response(new ReadableStream({ cancel }), {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    });
    const headless = createHeadless({
      token: "synthetic-token",
      fetcher,
      timeoutMs: 10,
      retries: { retries: 2, baseDelayMs: 60000, maxDelayMs: 60000, jitterRatio: 0 },
    });
    const controller = new AbortController();
    const cause = new Error("cancel retry wait");
    const promise = headless.spaces.list({ signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({ name: "CircleNetworkError", cause });
    await vi.advanceTimersByTimeAsync(20);
    expect(fetcher).toHaveBeenCalledOnce();
    controller.abort(cause);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledTimes(kind === "network" ? 0 : 1);
  });

  it("shares one deadline between delayed headers and progressing body chunks", async () => {
    let headers!: (response: Response) => void;
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const cancel = vi.fn();
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          headers = resolve;
        }),
    );
    const headless = createHeadless({ token: "synthetic-token", fetcher, timeoutMs: 10 });
    const promise = headless.spaces.list();
    const assertion = expect(promise).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(7);
    headers(
      new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            source = c;
          },
          cancel,
        }),
      ),
    );
    await vi.advanceTimersByTimeAsync(0);
    source.enqueue(new TextEncoder().encode('{"records":'));
    await vi.advanceTimersByTimeAsync(2);
    source.enqueue(new TextEncoder().encode("["));
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("accepts a slow body completed within the deadline and releases its resources", async () => {
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        source = c;
      },
    });
    const fetcher = vi.fn(async () => new Response(body));
    const headless = createHeadless({ token: "synthetic-token", fetcher, timeoutMs: 10 });
    const promise = headless.spaces.list();
    await vi.advanceTimersByTimeAsync(8);
    source.enqueue(new TextEncoder().encode("[]"));
    source.close();
    await expect(promise).resolves.toEqual([]);
    expect(body.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    "json",
    "text",
    "arrayBuffer",
    "blob",
  ] as const)("bounds raw parseAs %s body reads", async (parseAs) => {
    const fetcher = vi.fn(
      async () =>
        new Response(new ReadableStream(), {
          headers: { "Content-Type": "multipart/form-data; boundary=synthetic" },
        }),
    );
    const headless = createHeadless({ token: "synthetic-token", fetcher, timeoutMs: 10 });
    const assertion = expect(
      headless.raw.GET("/api/headless/v1/spaces", { parseAs }),
    ).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases the lifetime when a raw stream iterator exits early", async () => {
    const cancel = vi.fn();
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1]));
      },
      cancel,
    });
    const headless = createHeadless({
      token: "synthetic-token",
      timeoutMs: 10,
      fetcher: async () => new Response(source),
    });
    const { data } = await headless.raw.GET("/api/headless/v1/spaces", { parseAs: "stream" });
    expect(vi.getTimerCount()).toBe(1);
    for await (const chunk of data as unknown as AsyncIterable<Uint8Array>) {
      expect(chunk).toEqual(new Uint8Array([1]));
      break;
    }
    expect(cancel).toHaveBeenCalledOnce();
    expect(source.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases discarded unauthorized bodies before refresh and bounds the refresh body", async () => {
    const unauthorizedCancel = vi.fn();
    const refreshCancel = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new ReadableStream({ cancel: unauthorizedCancel }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(new ReadableStream({ cancel: refreshCancel })));
    const headless = createHeadless({
      token: "synthetic-token",
      refreshToken: "synthetic-refresh",
      autoRefresh: true,
      authToken: "synthetic-application",
      timeoutMs: 10,
      fetcher,
    });
    const promise = headless.spaces.list();
    const assertion = expect(promise).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(0);
    expect(unauthorizedCancel).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(refreshCancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lets a canceled caller leave a shared refresh without canceling another caller", async () => {
    let refreshHeaders!: (response: Response) => void;
    let token = "old";
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.includes("access_token/refresh")) {
        return new Promise<Response>((resolve) => {
          refreshHeaders = resolve;
        });
      }
      return request.headers.get("Authorization") === "Bearer new"
        ? Response.json({ records: [] })
        : new Response(null, { status: 401 });
    });
    const headless = createHeadless({
      token,
      refreshToken: "synthetic-refresh",
      autoRefresh: true,
      authToken: "synthetic-application",
      getAccessToken: () => token,
      setAccessToken: (value) => {
        token = value ?? "";
      },
      timeoutMs: 50,
      fetcher,
    });
    const controller = new AbortController();
    const canceled = headless.spaces.list({ signal: controller.signal });
    const assertion = expect(canceled).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: "stop waiting",
    });
    const remaining = headless.spaces.list();
    await vi.advanceTimersByTimeAsync(0);
    controller.abort("stop waiting");
    await assertion;
    refreshHeaders(Response.json({ access_token: "new" }));
    await expect(remaining).resolves.toEqual({ records: [] });
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disposes a completed SDK page before a pagination iterator is closed", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        records: [{ id: 1 }],
        has_previous_page: true,
        first_id: 1,
      }),
    );
    const headless = createHeadless({ token: "synthetic-token", timeoutMs: 10, fetcher });
    for await (const message of headless.raw.iter.chatRoomMessages("synthetic-room")) {
      expect(message.id).toBe(1);
      break;
    }
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
