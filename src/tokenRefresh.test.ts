import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  CircleTimeoutError,
} from "./core/errors";
import type { HeadlessApiConfig } from "./headlessApi";
import { createHeadless } from "./headlessApi";
import { CircleSo } from "./index";

const baseUrl = "https://member.example.test";
const refreshPath = "/api/v1/headless/access_token/refresh";
const unauthorized = () =>
  Response.json({ message: "The access token is expired." }, { status: 401 });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function client(fetcher: typeof fetch, options: Partial<HeadlessApiConfig> = {}) {
  return createHeadless({
    baseUrl,
    accessToken: "old",
    refreshToken: "refresh",
    autoRefresh: true,
    authToken: "synthetic-application",
    retries: { retries: 0 },
    fetcher,
    ...options,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("public headless token recovery", () => {
  it("requires an application token for auto-refresh before making requests", () => {
    const fetcher = vi.fn();
    expect(() =>
      createHeadless({ accessToken: "old", refreshToken: "refresh", autoRefresh: true, fetcher }),
    ).toThrow(CircleConfigError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    false,
    true,
  ])("keeps application and member credentials separate through unified=%s", async (unified) => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath)) {
        expect(request.method).toBe("PATCH");
        expect(request.headers.get("authorization")).toBe("Bearer synthetic-application");
        expect(await request.json()).toEqual({ refresh_token: "refresh" });
        return Response.json({ access_token: "new" });
      }
      expect(request.headers.get("authorization")).toBe(
        fetcher.mock.calls.length === 1 ? "Bearer old" : "Bearer new",
      );
      return fetcher.mock.calls.length === 1 ? unauthorized() : Response.json({ records: [] });
    });
    const api = unified
      ? new CircleSo({
          baseUrl,
          admin: { token: "synthetic-admin" },
          auth: { token: "different-auth-surface-token" },
          headless: {
            accessToken: "old",
            refreshToken: "refresh",
            autoRefresh: true,
            authToken: "synthetic-application",
          },
          fetcher,
        }).headless
      : client(fetcher);
    await api.bookmarks.list();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("preserves caller-owned token hook types", () => {
    expectTypeOf<NonNullable<HeadlessApiConfig["getAccessToken"]>>().toEqualTypeOf<
      () => string | undefined | Promise<string | undefined>
    >();
    expectTypeOf<NonNullable<HeadlessApiConfig["setAccessToken"]>>().toEqualTypeOf<
      (token: string | undefined) => void | Promise<void>
    >();
  });
  it("reuses the new token when an old-token 401 arrives after refresh completes", async () => {
    const late = deferred<Response>();
    let originals = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath)) return Response.json({ access_token: "new" });
      if (request.headers.get("authorization") === "Bearer new")
        return Response.json({ records: [] });
      originals += 1;
      return originals === 1 ? unauthorized() : late.promise;
    });
    const api = client(fetcher);
    const first = api.bookmarks.list();
    const second = api.bookmarks.list();
    await first;
    late.resolve(unauthorized());
    await second;
    expect(
      fetcher.mock.calls.filter(([r]) => (r as Request).url.endsWith(refreshPath)),
    ).toHaveLength(1);
  });

  it("does not refresh a permission-related 403", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        { message: "Your community isn't eligible for headless API access." },
        { status: 403 },
      ),
    );
    await expect(client(fetcher).bookmarks.list()).rejects.toMatchObject({
      status: 403,
      method: "GET",
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("shares a failed refresh with a late old-token response", async () => {
    const late = deferred<Response>();
    let originals = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath))
        return Response.json({ message: "Refresh token not found." }, { status: 404 });
      originals += 1;
      return originals === 1 ? unauthorized() : late.promise;
    });
    const api = client(fetcher);
    const first = api.bookmarks.list().catch((error: unknown) => error);
    const second = api.bookmarks.list().catch((error: unknown) => error);
    const error = await first;
    late.resolve(unauthorized());
    expect(await second).toBe(error);
    expect(
      fetcher.mock.calls.filter(([r]) => (r as Request).url.endsWith(refreshPath)),
    ).toHaveLength(1);
  });

  it("single-flights simultaneous failures, awaits storage, and refreshes a later generation", async () => {
    const refreshing = deferred<Response>();
    const stored = deferred<void>();
    let refreshes = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath)) {
        refreshes += 1;
        return refreshes === 1 ? refreshing.promise : Response.json({ access_token: "next" });
      }
      return request.headers.get("authorization") ===
        (refreshes === 2 ? "Bearer next" : "Bearer new")
        ? Response.json({ records: [] })
        : unauthorized();
    });
    let token = "old";
    const setter = vi.fn(async (next) => {
      await stored.promise;
      token = next;
    });
    const api = client(fetcher, { getAccessToken: () => token, setAccessToken: setter });
    const calls = Array.from({ length: 8 }, () => api.bookmarks.list());
    await vi.waitFor(() => expect(refreshes).toBe(1));
    refreshing.resolve(Response.json({ access_token: "new" }));
    await vi.waitFor(() => expect(setter).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenCalledTimes(9);
    stored.resolve();
    await Promise.all(calls);
    expect(fetcher).toHaveBeenCalledTimes(17);
    token = "externally-expired";
    await api.bookmarks.list();
    expect(refreshes).toBe(2);
    expect(setter).toHaveBeenCalledTimes(2);
  });

  it.each([
    401, 429, 503,
  ])("does not retry the authenticated replay after HTTP %i", async (status) => {
    let members = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if ((input as Request).url.endsWith(refreshPath))
        return Response.json({ access_token: "new" });
      members += 1;
      return members === 1
        ? unauthorized()
        : Response.json(
            { message: "still denied" },
            { status, headers: { "x-request-id": "original-retry" } },
          );
    });
    await expect(
      client(fetcher, { retries: { retries: 3, baseDelayMs: 0 } }).bookmarks.list(),
    ).rejects.toMatchObject({
      name: "CircleHttpError",
      status,
      url: `${baseUrl}/api/headless/v1/bookmarks`,
      method: "GET",
      requestId: "original-retry",
      parsedJson: { message: "still denied" },
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not retry a network failure on the authenticated replay", async () => {
    const cause = new TypeError("synthetic connection failure");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(Response.json({ access_token: "new" }))
      .mockRejectedValue(cause);
    await expect(
      client(fetcher, { retries: { retries: 3, baseDelayMs: 0 } }).bookmarks.list(),
    ).rejects.toMatchObject({ name: "CircleNetworkError", cause });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it.each([
    400, 403, 404, 422,
  ])("leaves HTTP %i unchanged even when its message says expired", async (status) => {
    const fetcher = vi.fn(async () =>
      Response.json({ message: "The access token is expired." }, { status }),
    );
    const result = await client(fetcher).raw.GET("/api/headless/v1/bookmarks");
    expect(result.response.status).toBe(status);
    expect(result.error).toEqual({ message: "The access token is expired." });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    "GET",
    "POST",
    "PATCH",
    "DELETE",
  ] as const)("preserves %s request context and upload bytes", async (method) => {
    const uploads: string[] = [];
    const requests: Request[] = [];
    let refreshed = false;
    const controller = new AbortController();
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath)) {
        refreshed = true;
        return Response.json({ access_token: "new" });
      }
      requests.push(request);
      uploads.push(await request.text());
      return refreshed ? Response.json({ records: [] }) : unauthorized();
    });
    const api = client(fetcher);
    // The same shared core is used by every generated operation; use a real bookmark path.
    if (method === "GET")
      await api.raw.GET("/api/headless/v1/bookmarks", {
        params: { query: { page: 2 } },
        headers: { "x-test-context": "kept" },
        signal: controller.signal,
      });
    if (method === "POST")
      await api.raw.POST("/api/headless/v1/bookmarks", {
        body: { record_id: 1, bookmark_type: "post" },
        headers: { "x-test-context": "kept" },
        signal: controller.signal,
      });
    if (method === "PATCH")
      await api.raw.PATCH("/api/headless/v1/posts/{post_id}/comments/{id}", {
        params: { path: { post_id: 2, id: 1 } },
        body: { comment: { body: "updated" } },
        headers: { "x-test-context": "kept" },
        signal: controller.signal,
      });
    if (method === "DELETE")
      await api.raw.DELETE("/api/headless/v1/bookmarks/{id}", {
        params: { path: { id: 1 } },
        headers: { "x-test-context": "kept" },
        signal: controller.signal,
      });
    expect(requests).toHaveLength(2);
    expect(uploads[1]).toBe(uploads[0]);
    expect(requests.map((request) => request.method)).toEqual([method, method]);
    expect(requests[1]?.url).toBe(requests[0]?.url);
    expect(requests.map((request) => request.headers.get("x-test-context"))).toEqual([
      "kept",
      "kept",
    ]);
    expect(requests.map((request) => request.headers.get("authorization"))).toEqual([
      "Bearer old",
      "Bearer new",
    ]);
  });

  it("preserves multipart boundaries and uploads without cloning the request", async () => {
    const uploads: string[] = [];
    const types: (string | null)[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath)) return Response.json({ access_token: "new" });
      types.push(request.headers.get("content-type"));
      uploads.push(await request.text());
      return uploads.length === 1 ? unauthorized() : Response.json({});
    });
    const form = new FormData();
    form.append("caption", "synthetic upload");
    const clone = vi.spyOn(Request.prototype, "clone");
    try {
      await client(fetcher).raw.POST("/api/headless/v1/bookmarks", {
        body: { record_id: 1, bookmark_type: "post" },
        bodySerializer: () => form,
      });
      expect(uploads).toHaveLength(2);
      expect(uploads[1]).toBe(uploads[0]);
      expect(types[1]).toBe(types[0]);
      expect(types[0]).toContain("multipart/form-data; boundary=");
      expect(clone).not.toHaveBeenCalled();
    } finally {
      clone.mockRestore();
    }
  });

  it.each([
    "oversized",
    "disabled",
    "stream",
    "native middleware",
  ])("returns the original 401 for a one-shot %s upload", async (mode) => {
    const uploads: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      uploads.push(await (input as Request).text());
      return unauthorized();
    });
    const api = client(fetcher, {
      retries: { retries: 2, maxReplayBodyBytes: mode === "disabled" ? 0 : 5 },
    });
    const body = "larger-than-cap";
    if (mode === "native middleware")
      api.raw.use({ onRequest: ({ request }) => new Request(request) });
    const result = await api.raw.POST("/api/headless/v1/bookmarks", {
      body: { record_id: 1, bookmark_type: "post" },
      bodySerializer: () =>
        mode === "stream"
          ? new ReadableStream({
              start(c) {
                c.enqueue(new TextEncoder().encode(body));
                c.close();
              },
            })
          : body,
      duplex: "half",
    });
    expect(result.response.status).toBe(401);
    expect(result.error).toEqual({ message: "The access token is expired." });
    expect(uploads).toEqual([body]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    401, 403, 404, 422, 500,
  ])("fans out refresh HTTP %i once with auth endpoint context", async (status) => {
    const gate = deferred<Response>();
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      (input as Request).url.endsWith(refreshPath) ? gate.promise : unauthorized(),
    );
    const api = client(fetcher, {
      authBaseUrl: "https://auth.example.test",
      retries: { retries: 2, retryNonIdempotent: true, baseDelayMs: 0 },
    });
    const calls = Array.from({ length: 4 }, () =>
      api.bookmarks.list().catch((error: unknown) => error),
    );
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(5));
    gate.resolve(
      Response.json(
        { message: "refresh rejected" },
        { status, headers: { "x-request-id": "auth-request" } },
      ),
    );
    const errors = await Promise.all(calls);
    expect(errors[0]).toBeInstanceOf(CircleHttpError);
    expect(errors[0]).toMatchObject({
      status,
      method: "PATCH",
      url: `https://auth.example.test${refreshPath}`,
      requestId: "auth-request",
      parsedJson: { message: "refresh rejected" },
    });
    expect(errors.every((error) => error === errors[0])).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it.each([
    "",
    "{bad",
    "null",
    "{}",
    '{"access_token":3}',
    '{"access_token":" "}',
    '{"access_token":"bad\\r\\nvalue"}',
  ])("rejects malformed refresh payload %j with refresh context", async (payload) => {
    const setter = vi.fn();
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      (input as Request).url.endsWith(refreshPath)
        ? new Response(payload, { headers: { "x-correlation-id": "malformed" } })
        : unauthorized(),
    );
    const error = await client(fetcher, { setAccessToken: setter })
      .bookmarks.list()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CircleHttpError);
    expect(error).toMatchObject({
      status: 200,
      method: "PATCH",
      url: `${baseUrl}${refreshPath}`,
      bodyText: payload,
      requestId: "malformed",
    });
    if (payload === "{bad") expect((error as CircleHttpError).cause).toBeInstanceOf(SyntaxError);
    expect(setter).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shares refresh network failure without retrying PATCH", async () => {
    const cause = new TypeError("synthetic refresh network failure");
    const gate = deferred<void>();
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if ((input as Request).url.endsWith(refreshPath)) {
        await gate.promise;
        throw cause;
      }
      return unauthorized();
    });
    const api = client(fetcher, { retries: { retries: 2, retryNonIdempotent: true } });
    const a = api.bookmarks.list().catch((e: unknown) => e);
    const b = api.bookmarks.list().catch((e: unknown) => e);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    gate.resolve();
    const error = await a;
    expect(error).toBeInstanceOf(CircleNetworkError);
    expect(error).toMatchObject({ cause, url: `${baseUrl}${refreshPath}`, method: "PATCH" });
    expect(await b).toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it.each([
    "getter",
    "setter",
  ])("wraps a failing %s hook without losing its cause", async (hook) => {
    const cause = new Error("synthetic storage failure");
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      (input as Request).url.endsWith(refreshPath)
        ? Response.json({ access_token: "new" })
        : unauthorized(),
    );
    const api = client(fetcher, {
      ...(hook === "getter"
        ? {
            getAccessToken: () => {
              throw cause;
            },
          }
        : {
            setAccessToken: async () => {
              throw cause;
            },
          }),
    });
    const error = await api.bookmarks.list().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CircleConfigError);
    expect(error).toMatchObject({ cause });
    expect(fetcher).toHaveBeenCalledTimes(hook === "getter" ? 0 : 2);
  });

  it("shares a rejected setter without publishing its token or retrying refresh", async () => {
    const storage = deferred<void>();
    const cause = new Error("storage rejected");
    const setter = vi.fn(async () => {
      await storage.promise;
      throw cause;
    });
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      (input as Request).url.endsWith(refreshPath)
        ? Response.json({ access_token: "new" })
        : unauthorized(),
    );
    const api = client(fetcher, { setAccessToken: setter });
    const calls = [api.bookmarks.list(), api.bookmarks.list()].map((call) =>
      call.catch((e: unknown) => e),
    );
    await vi.waitFor(() => expect(setter).toHaveBeenCalledOnce());
    storage.resolve();
    const [first, second] = await Promise.all(calls);
    expect(first).toMatchObject({ name: "CircleConfigError", cause });
    expect(second).toBe(first);
    expect(await api.bookmarks.list().catch((e: unknown) => e)).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(setter).toHaveBeenCalledOnce();
  });

  it("reuses caller-owned newer tokens without refreshing and treats undefined as cleared storage", async () => {
    const response = deferred<Response>();
    let token: string | undefined = "old";
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      (input as Request).headers.get("authorization") === "Bearer old"
        ? response.promise
        : Response.json({ records: [] }),
    );
    const api = client(fetcher, { getAccessToken: () => token });
    const call = api.bookmarks.list();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    token = "external-new";
    response.resolve(unauthorized());
    await call;
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((fetcher.mock.calls[1]?.[0] as Request).headers.get("authorization")).toBe(
      "Bearer external-new",
    );
    token = undefined;
    await expect(api.bookmarks.list()).rejects.toBeInstanceOf(CircleConfigError);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not let an older asynchronous token read replace a newer generation", async () => {
    const oldRead = deferred<string>();
    let reads = 0;
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => Response.json({ records: [] }));
    const api = client(fetcher, {
      getAccessToken: () => (++reads === 1 ? oldRead.promise : "external-new"),
    });
    const first = api.bookmarks.list();
    await api.bookmarks.list();
    oldRead.resolve("old");
    await first;
    expect(
      fetcher.mock.calls.every(
        ([r]) => (r as Request).headers.get("authorization") === "Bearer external-new",
      ),
    ).toBe(true);
  });

  it.each([
    200, 500,
  ])("serializes a newer generation behind an earlier refresh HTTP %i", async (status) => {
    const firstRefresh = deferred<Response>();
    let refreshes = 0;
    let token = "old";
    const setter = vi.fn((next: string | undefined) => {
      token = next ?? "";
    });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath)) {
        refreshes += 1;
        return refreshes === 1 ? firstRefresh.promise : Response.json({ access_token: "final" });
      }
      return request.headers.get("authorization") === "Bearer final" ||
        (request.headers.get("authorization") === "Bearer external" && refreshes === 2)
        ? Response.json({ records: [] })
        : unauthorized();
    });
    const api = client(fetcher, { getAccessToken: () => token, setAccessToken: setter });
    const oldCall = api.bookmarks.list().catch((e: unknown) => e);
    await vi.waitFor(() => expect(refreshes).toBe(1));
    token = "external";
    const newCall = api.bookmarks.list();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    expect(refreshes).toBe(1);
    firstRefresh.resolve(
      Response.json(status === 200 ? { access_token: "obsolete" } : { message: "failed" }, {
        status,
      }),
    );
    await newCall;
    await oldCall;
    expect(refreshes).toBe(2);
    expect(setter).toHaveBeenCalledExactlyOnceWith("final");
    expect(token).toBe("final");
  });

  it("fans out a shared refresh getter failure and permits recovery after external rotation", async () => {
    vi.useFakeTimers();
    let reads = 0;
    let token = "old";
    const cause = new Error("refresh storage unavailable");
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      (input as Request).headers.get("authorization") === "Bearer external"
        ? Response.json({ records: [] })
        : unauthorized(),
    );
    const api = client(fetcher, {
      getAccessToken: () => {
        if (++reads === 3) throw cause;
        return token;
      },
    });
    const calls = [api.bookmarks.list(), api.bookmarks.list()].map((p) =>
      p.catch((e: unknown) => e),
    );
    await vi.advanceTimersByTimeAsync(0);
    const [first, second] = await Promise.all(calls);
    expect(first).toMatchObject({ name: "CircleConfigError", cause });
    expect(second).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(2);
    token = "external";
    await api.bookmarks.list();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("honors ordinary retry policy before a single auth replay", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(Response.json({ access_token: "new" }))
      .mockResolvedValueOnce(Response.json({ records: [] }));
    await client(fetcher, {
      retries: { retries: 1, baseDelayMs: 0, jitterRatio: 0 },
    }).bookmarks.list();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect((fetcher.mock.calls[3]?.[0] as Request).headers.get("authorization")).toBe("Bearer new");
  });

  it("replays a small body when the first unauthorized attempt never reads the upload", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(Response.json({ access_token: "new" }))
      .mockImplementationOnce(async (input: RequestInfo | URL) => {
        expect(await (input as Request).json()).toEqual({ record_id: 1, bookmark_type: "post" });
        return Response.json({ id: 1 });
      });
    await client(fetcher).bookmarks.create({ record_id: 1, bookmark_type: "post" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("preserves transport failures while reading the refresh body", async () => {
    const cause = new Error("refresh stream failed");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.error(cause);
            },
          }),
          { headers: { "x-request-id": "read-error" } },
        ),
      );
    await expect(client(fetcher).bookmarks.list()).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
      status: 200,
      method: "PATCH",
      url: `${baseUrl}${refreshPath}`,
      requestId: "read-error",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("cancels late refresh responses after the shared deadline", async () => {
    vi.useFakeTimers();
    const pending = deferred<Response>();
    const cancel = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockReturnValueOnce(pending.promise);
    const call = client(fetcher, { timeoutMs: 20 })
      .bookmarks.list()
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20);
    expect(await call).toBeInstanceOf(CircleTimeoutError);
    pending.resolve(new Response(new ReadableStream({ cancel })));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves caller cancellation during the authenticated response body", async () => {
    vi.useFakeTimers();
    const reading = deferred<void>();
    const cancel = vi.fn();
    const controller = new AbortController();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(Response.json({ access_token: "new" }))
      .mockImplementationOnce(
        async () =>
          new Response(
            new ReadableStream(
              {
                pull() {
                  reading.resolve();
                },
                cancel,
              },
              { highWaterMark: 0 },
            ),
          ),
      );
    const call = client(fetcher, { timeoutMs: 50 })
      .bookmarks.list({ signal: controller.signal })
      .catch((e: unknown) => e);
    await reading.promise;
    controller.abort("stop replay");
    await vi.advanceTimersByTimeAsync(0);
    expect(await call).toMatchObject({
      name: "CircleNetworkError",
      cause: "stop replay",
      url: `${baseUrl}/api/headless/v1/bookmarks`,
      method: "GET",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    "headers",
    "body",
    "setter",
    "refresh getter",
  ])("bounds shared refresh %s and cleans timers", async (phase) => {
    vi.useFakeTimers();
    const setterGate = deferred<void>();
    const bodyCancel = vi.fn();
    let reads = 0;
    let hangReads = true;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (!(input as Request).url.endsWith(refreshPath)) return unauthorized();
      if (phase === "headers") return new Promise<Response>(() => {});
      if (phase === "body")
        return new Response(new ReadableStream({ cancel: bodyCancel }), {
          headers: { "x-request-id": "slow-refresh" },
        });
      return Response.json({ access_token: "new" });
    });
    const api = client(fetcher, {
      timeoutMs: 30,
      getAccessToken: () =>
        ++reads <= 2 || phase !== "refresh getter" || !hangReads
          ? "old"
          : new Promise<string>(() => {}),
      ...(phase === "setter" ? { setAccessToken: () => setterGate.promise } : {}),
    });
    const calls = [api.bookmarks.list(), api.bookmarks.list()].map((p) =>
      p.catch((e: unknown) => e),
    );
    await vi.advanceTimersByTimeAsync(30);
    const errors = await Promise.all(calls);
    expect(errors[0]).toBeInstanceOf(CircleTimeoutError);
    expect(errors[0]).toMatchObject({
      url: `${baseUrl}${refreshPath}`,
      method: "PATCH",
      timeoutMs: 30,
    });
    expect(errors[1]).toBe(errors[0]);
    if (phase === "body") {
      expect(bodyCancel).toHaveBeenCalledOnce();
      expect(errors[0]).toMatchObject({ status: 200, requestId: "slow-refresh" });
    }
    setterGate.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    hangReads = false;
    expect(await api.bookmarks.list().catch((e: unknown) => e)).toBe(errors[0]);
  });

  it("bounds and cancels initial getter waiting before fetching", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn();
    const api = client(fetcher, {
      timeoutMs: 20,
      getAccessToken: () => new Promise<string>(() => {}),
    });
    const control = new AbortController();
    const stopped = api.bookmarks.list({ signal: control.signal }).catch((e: unknown) => e);
    const timed = api.bookmarks.list().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(0);
    const reason = new Error("caller stopped");
    control.abort(reason);
    expect(await stopped).toMatchObject({ name: "CircleNetworkError", cause: reason });
    await vi.advanceTimersByTimeAsync(20);
    expect(await timed).toBeInstanceOf(CircleTimeoutError);
    expect(fetcher).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps shared refresh alive when all current waiters cancel", async () => {
    vi.useFakeTimers();
    const refreshing = deferred<Response>();
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.url.endsWith(refreshPath)) return refreshing.promise;
      return request.headers.get("authorization") === "Bearer new"
        ? Response.json({ records: [] })
        : unauthorized();
    });
    const setter = vi.fn();
    const api = client(fetcher, { timeoutMs: 100, setAccessToken: setter });
    const controllers = [new AbortController(), new AbortController()];
    const calls = controllers.map((control) =>
      api.bookmarks.list({ signal: control.signal }).catch((e: unknown) => e),
    );
    await vi.advanceTimersByTimeAsync(0);
    controllers.forEach((control) => {
      control.abort("stop");
    });
    for (const error of await Promise.all(calls))
      expect(error).toMatchObject({ name: "CircleNetworkError", cause: "stop" });
    const refreshRequest = fetcher.mock.calls
      .map(([r]) => r as Request)
      .find((r) => r.url.endsWith(refreshPath));
    expect(refreshRequest?.signal.aborted).toBe(false);
    const remaining = api.bookmarks.list();
    refreshing.resolve(Response.json({ access_token: "new" }));
    await remaining;
    expect(setter).toHaveBeenCalledOnce();
    expect(
      fetcher.mock.calls.filter(([r]) => (r as Request).url.endsWith(refreshPath)),
    ).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
