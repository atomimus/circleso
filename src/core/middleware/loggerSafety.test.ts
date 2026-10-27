import type { Middleware, MiddlewareCallbackParams } from "openapi-fetch";
import { describe, expect, it, vi } from "vitest";
import { CircleConfigError, CircleHttpError } from "../errors";
import {
  createLoggerMiddleware,
  type LoggerErrorContext,
  type LoggerHooks,
  type LoggerRequestContext,
  type LoggerResponseContext,
} from "./logger";

const secret = "fixture-secret-logging-10";
const bytes = new TextEncoder();

function context(
  request = new Request(
    `https://example.test/path/${secret}?access_token=${secret}&plain=${secret}#${secret}`,
  ),
): MiddlewareCallbackParams {
  return {
    request,
    id: "logical-call",
    schemaPath: "/path/{id}",
    params: {},
    options: {
      baseUrl: "https://example.test",
      parseAs: "json",
      fetch,
      querySerializer: () => "",
      bodySerializer: (body) => body,
    },
  };
}

function capture(extra: LoggerHooks = {}) {
  let request: LoggerRequestContext | undefined;
  let response: LoggerResponseContext | undefined;
  let error: LoggerErrorContext | undefined;
  const middleware = createLoggerMiddleware({
    onRequest: (value) => {
      request = value;
    },
    onResponse: (value) => {
      response = value;
    },
    onError: (value) => {
      error = value;
    },
    ...extra,
  }) as Required<Middleware>;
  return {
    middleware,
    request: () => {
      expect(request).toBeDefined();
      return request as LoggerRequestContext;
    },
    response: () => {
      expect(response).toBeDefined();
      return response as LoggerResponseContext;
    },
    error: () => {
      expect(error).toBeDefined();
      return error as LoggerErrorContext;
    },
  };
}

describe("logger snapshots and redaction", () => {
  it.each([
    204, 205, 304, 0,
  ])("handles null-body status %i with every logging mode", async (status) => {
    for (const options of [
      {},
      { logBodies: false },
      { logBodies: true },
      { logBodies: true, maxBodyBytes: 0 },
    ]) {
      const log = capture(options);
      const response = status === 0 ? Response.error() : new Response(null, { status });
      Object.defineProperties(response, {
        url: {
          value: `https://user:${secret}@example.test/redirect/${secret}?token=${secret}#${secret}`,
        },
        redirected: { value: true },
      });
      expect(await log.middleware.onResponse({ ...context(), response })).toBeUndefined();
      const snapshot = log.response().response;
      expect(snapshot.status).toBe(status);
      expect(snapshot.body).toBeNull();
      expect(snapshot.redirected).toBe(true);
      expect(snapshot.url).toBe("https://example.test/path/REDACTED");
      expect(snapshot.clone().status).toBe(status);
      expect(snapshot.clone().url).toBe(snapshot.url);
      expect(response.url).toContain(secret);
      expect(response.bodyUsed).toBe(false);
    }
  });

  it("does not traverse raw options/params or arbitrary errors, even with body logging", async () => {
    const getter = vi.fn(() => {
      throw new Error("must not traverse");
    });
    const object = {
      toJSON: getter,
      get token() {
        return getter();
      },
    };
    const params = {
      ...context(),
      params: { query: object },
      options: { ...context().options, headers: object },
    };
    const log = capture({ logBodies: true });
    await log.middleware.onRequest(params);
    await log.middleware.onError({ ...params, error: object });
    expect(log.request()).not.toHaveProperty("params");
    expect(log.request()).not.toHaveProperty("options");
    expect(log.error().error).toEqual({ name: "UnknownError" });
    expect(getter).not.toHaveBeenCalled();
  });

  it("redacts all header collections, duplicates and custom content-header redactions", async () => {
    const headers = new Headers([
      ["Authorization", `Token ${secret}`],
      ["Cookie", `session=${secret}`],
      ["Set-Cookie", `session=${secret}`],
      ["Set-Cookie", `refresh=${secret}`],
      ["X-Api-Key", secret],
      ["X-Access-Token", secret],
      ["X-Custom", secret],
      ["Content-Type", "application/json"],
      ["Content-Length", "1"],
    ]);
    const log = capture({ redactHeaders: ["CONTENT-LENGTH"], logBodies: true });
    await log.middleware.onResponse({
      ...context(new Request("https://example.test", { headers })),
      response: new Response(null, { headers }),
    });
    for (const headerSet of [log.response().request.headers, log.response().response.headers]) {
      headerSet.forEach((value, name) => {
        expect(value).toBe(name === "content-type" ? "application/json" : "REDACTED");
      });
      const getSetCookie = (headerSet as Headers & { getSetCookie?: () => string[] }).getSetCookie;
      if (getSetCookie) expect(getSetCookie.call(headerSet)).toEqual(["REDACTED"]);
    }
    expect(headers.get("authorization")).toContain(secret);
  });

  it("redacts nested JSON strings, sensitive subtrees, header tuples and encoded form values", async () => {
    const json = {
      ok: true,
      count: 2,
      empty: null,
      Cookie: { id: 123 },
      nested: [["Authorization", secret], { innocent: `Token ${secret}`, sessionId: 123 }],
      __proto__: null,
    };
    const log = capture({ logBodies: true });
    const response = Response.json(json);
    await log.middleware.onResponse({ ...context(), response });
    expect(JSON.parse(log.response().responseBody ?? "null")).toEqual({
      ok: true,
      count: 2,
      empty: null,
      Cookie: "REDACTED",
      nested: [["REDACTED", "REDACTED"], { innocent: "REDACTED", sessionId: "REDACTED" }],
    });
    expect(await response.json()).toEqual(json);
    const request = new Request("https://example.test", {
      method: "POST",
      body: new URLSearchParams({ refresh_token: secret, plain: secret }),
    });
    await log.middleware.onRequest(context(request));
    expect(log.request().requestBody).toBe("refresh_token=REDACTED&plain=REDACTED");
    expect(await request.text()).toContain(secret);
  });

  it.each([
    ["text/plain", `Token ${secret}; Cookie: session=${secret}`],
    ["application/json", `{"token":"${secret}"`],
    ["application/json", new Uint8Array([0xff, 0xfe])],
    ["application/octet-stream", secret],
    ["text/event-stream", `data: ${secret}`],
  ])("omits unsafe/incomplete payload %s without consuming it", async (mime, payload) => {
    const log = capture({ logBodies: true });
    const response = new Response(payload, { headers: { "content-type": mime } });
    await log.middleware.onResponse({ ...context(), response });
    expect(log.response().responseBody).toBeUndefined();
    expect(await log.response().response.text()).toBe("");
    expect(response.bodyUsed).toBe(false);
    await response.arrayBuffer();
  });

  it("omits multipart fields and filenames without reading the upload", async () => {
    const form = new FormData();
    form.set("token", secret);
    form.set("file", new Blob([secret]), `${secret}.txt`);
    const request = new Request("https://example.test", { method: "POST", body: form });
    const clone = vi.spyOn(request, "clone");
    const log = capture({ logBodies: true });
    await log.middleware.onRequest(context(request));
    expect(log.request().requestBody).toBeUndefined();
    expect(log.request().request.headers.get("content-type")).toBe("multipart/form-data");
    expect(clone).not.toHaveBeenCalled();
    expect((await request.formData()).get("token")).toBe(secret);
  });

  it("returns detached snapshots whose mutation cannot change the actual response or request", async () => {
    const request = new Request("https://example.test", {
      headers: { authorization: `Bearer ${secret}` },
    });
    const response = Response.json({ access_token: secret, count: 2 });
    const log = capture({ logBodies: true });
    await log.middleware.onRequest(context(request));
    await log.middleware.onResponse({ ...context(request), response });
    log.request().request.headers.set("authorization", "changed");
    log.response().response.headers.set("set-cookie", "changed");
    expect(await log.response().response.clone().json()).toEqual({
      access_token: "REDACTED",
      count: 2,
    });
    expect(await response.json()).toEqual({ access_token: secret, count: 2 });
    expect(request.headers.get("authorization")).toBe(`Bearer ${secret}`);
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("does not read a potentially sensitive CircleHttpError status getter", async () => {
    const error = new CircleHttpError(secret, {
      url: secret,
      method: "GET",
      status: 400,
      cause: { secret },
    });
    const getter = vi.fn(() => secret);
    Object.defineProperty(error, "status", { get: getter });
    const log = capture();
    await log.middleware.onError({ ...context(), error });
    expect(log.error().error).toEqual({ name: "CircleHttpError" });
    expect(getter).not.toHaveBeenCalled();
  });
});

describe("bounded logger inspection", () => {
  it("bounds empty-chunk sources even when the event loop cannot run a timer", async () => {
    const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) =>
      controller.enqueue(new Uint8Array()),
    );
    const response = new Response(new ReadableStream<Uint8Array>({ pull }), {
      headers: { "content-type": "application/json" },
    });
    const log = capture({ logBodies: true });
    await log.middleware.onResponse({ ...context(), response });
    expect(log.response().responseBody).toBeUndefined();
    expect(pull.mock.calls.length).toBeLessThan(1030);
    await response.body?.cancel();
  });

  it.each([
    false,
    true,
  ])("omits a large body with declared length %s, without emitting a prefix", async (declared) => {
    const text = JSON.stringify({ token: secret, padding: "x".repeat(100) });
    const response = new Response(text, {
      headers: {
        "content-type": "application/json",
        ...(declared ? { "content-length": String(bytes.encode(text).length) } : {}),
      },
    });
    const clone = vi.spyOn(response, "clone");
    const log = capture({ logBodies: true, maxBodyBytes: 32 });
    await log.middleware.onResponse({ ...context(), response });
    expect(log.response().responseBody).toBeUndefined();
    if (declared) expect(clone).not.toHaveBeenCalled();
    expect(await response.text()).toBe(text);
  });

  it("counts UTF-8 bytes and accepts an exact byte limit", async () => {
    const text = JSON.stringify({ x: "é" });
    for (const delta of [0, -1]) {
      const log = capture({ logBodies: true, maxBodyBytes: bytes.encode(text).length + delta });
      const response = new Response(text, { headers: { "content-type": "application/json" } });
      await log.middleware.onResponse({ ...context(), response });
      expect(log.response().responseBody).toBe(delta === 0 ? '{"x":"REDACTED"}' : undefined);
      expect(await response.text()).toBe(text);
    }
  });

  it("stops inspection of an incomplete stream and lets the original complete later", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(value) {
          controller = value;
          value.enqueue(bytes.encode('{"x":"'));
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
    const log = capture({ logBodies: true, bodyReadTimeoutMs: 5 });
    await log.middleware.onResponse({ ...context(), response });
    expect(log.response().responseBody).toBeUndefined();
    expect(response.bodyUsed).toBe(false);
    controller.enqueue(bytes.encode(`${secret}"}`));
    controller.close();
    expect(await response.json()).toEqual({ x: secret });
  });

  it("does not clone/pull a response requested as a stream or with logging disabled", async () => {
    for (const options of [
      { logBodies: false },
      { logBodies: true, maxBodyBytes: 0 },
      { logBodies: true },
    ]) {
      const pull = vi.fn();
      const response = new Response(new ReadableStream({ pull }, { highWaterMark: 0 }), {
        headers: { "content-type": "application/json" },
      });
      const clone = vi.spyOn(response, "clone");
      const log = capture(options);
      const params = context();
      await log.middleware.onResponse({
        ...params,
        options: { ...params.options, parseAs: "stream" },
        response,
      });
      expect(log.response().responseBody).toBeUndefined();
      expect(clone).not.toHaveBeenCalled();
      expect(pull).not.toHaveBeenCalled();
      await response.body?.cancel();
    }
  });

  it("does not inspect bodies for hooks which are absent", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const response = Response.json({});
    const requestClone = vi.spyOn(request, "clone");
    const responseClone = vi.spyOn(response, "clone");
    const logger = createLoggerMiddleware({ logBodies: true }) as Required<Middleware>;
    await logger.onRequest(context(request));
    await logger.onResponse({ ...context(request), response });
    expect(requestClone).not.toHaveBeenCalled();
    expect(responseClone).not.toHaveBeenCalled();
  });

  it("omits read failures and used/locked bodies without substituting the original", async () => {
    const log = capture({ logBodies: true });
    const error = new Error("synthetic stream failure");
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(error);
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
    await log.middleware.onResponse({ ...context(), response });
    expect(log.response().responseBody).toBeUndefined();
    await expect(response.text()).rejects.toBe(error);
    const used = Response.json({ token: secret });
    await used.text();
    await log.middleware.onResponse({ ...context(), response: used });
    expect(log.response().responseBody).toBeUndefined();
    const locked = Response.json({ token: secret });
    const reader = locked.body?.getReader();
    await log.middleware.onResponse({ ...context(), response: locked });
    expect(log.response().responseBody).toBeUndefined();
    reader?.releaseLock();
    await locked.text();
  });
});

describe("logger configuration and callback failures", () => {
  it.each([
    null,
    false,
    [],
    { onRequest: 1 },
    { onResponse: false },
    { onError: {} },
    { logBodies: "true" },
    { maxBodyBytes: -1 },
    { maxBodyBytes: 1.5 },
    { maxBodyBytes: 1_048_577 },
    { maxBodyBytes: null },
    { bodyReadTimeoutMs: 0 },
    { bodyReadTimeoutMs: Infinity },
    { bodyReadTimeoutMs: 1001 },
    { bodyReadTimeoutMs: null },
    { redactHeaders: "cookie" },
    { redactHeaders: [1] },
    { redactHeaders: ["bad\nheader"] },
  ])("rejects malformed logger configuration %j with an SDK error", (config) => {
    expect(() => createLoggerMiddleware(config as LoggerHooks)).toThrow(CircleConfigError);
  });

  it.each([
    "onRequest",
    "onResponse",
    "onError",
  ] as const)("wraps direct synchronous %s failures with their cause", async (hook) => {
    const cause = new TypeError("synthetic logger failure");
    const logger = createLoggerMiddleware({
      [hook]: () => {
        throw cause;
      },
    }) as Required<Middleware>;
    const params = { ...context(), response: new Response(null), error: {} };
    const call = logger[hook] as NonNullable<Middleware["onResponse"]>;
    await expect(call(params)).rejects.toMatchObject({
      name: "CircleConfigError",
      cause,
      message: `Logger ${hook} callback failed.`,
    });
  });
});
