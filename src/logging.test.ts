import { describe, expect, it, vi } from "vitest";
import { createAdmin } from "./adminApi";
import { createAuth } from "./authApi";
import { createHeadlessAuthClient } from "./clients/headlessAuthClient";
import { createHeadlessClient } from "./clients/headlessClient";
import { CircleConfigError, CircleNetworkError } from "./core/errors";
import type {
  LoggerHooks,
  LoggerRequestContext,
  LoggerResponseContext,
} from "./core/middleware/logger";
import { createHeadless } from "./headlessApi";

// Deliberately synthetic. Never use real credentials in logger fixtures.
const secret = "fixture-secret-logging-10";

function headerEntries(headers: Headers): [string, string][] {
  const entries: [string, string][] = [];
  headers.forEach((value, name) => {
    entries.push([name, value]);
  });
  return entries;
}

describe("logging through public clients", () => {
  it.each([
    204, 205,
  ])("preserves %i through all named surfaces and logging configurations", async (status) => {
    for (const logger of [
      undefined,
      {},
      { logBodies: false },
      { logBodies: true, onResponse: async () => {} },
      { logBodies: true, maxBodyBytes: 0, onResponse: () => {} },
    ]) {
      const config = {
        token: secret,
        fetcher: async () => new Response(null, { status }),
        ...(logger !== undefined ? { logger } : {}),
      };
      expect(await createAdmin(config).spaces.list()).toBeUndefined();
      expect(await createHeadless(config).spaces.list()).toBeUndefined();
      expect(
        await createAuth(config).accessToken.refresh({ refresh_token: secret }),
      ).toBeUndefined();
    }
  });
  it.each([204, 205, 200])("preserves empty %i responses with body logging", async (status) => {
    const observed: LoggerResponseContext[] = [];
    const response = new Response(null, { status, statusText: "Fixture status" });
    Object.defineProperty(response, "url", { value: "https://example.test/final" });
    const client = createHeadlessClient({
      token: secret,
      logger: {
        logBodies: true,
        onResponse: (context) => {
          observed.push(context);
        },
      },
      fetcher: async () => response,
    });
    const result = await client.GET("/api/headless/v1/spaces");
    expect(result.data).toBeUndefined();
    expect(result.response.status).toBe(status);
    expect(result.response.statusText).toBe("Fixture status");
    expect(result.response.url).toBe("https://example.test/final");
    expect(observed[0]?.response.status).toBe(status);
  });

  it("exposes no original options, params, URL values, headers or nested string credentials", async () => {
    const captured: LoggerRequestContext[] = [];
    const observed: LoggerResponseContext[] = [];
    const body = {
      access_token: secret,
      nested: [{ message: secret, cookie: `session=${secret}` }],
    };
    const client = createHeadlessAuthClient({
      token: secret,
      logger: {
        logBodies: true,
        onRequest: (context) => {
          captured.push(context);
        },
        onResponse: (context) => {
          observed.push(context);
        },
      },
      fetcher: async (input) => {
        const request = input as Request;
        expect(request.headers.get("authorization")).toBe(`Bearer ${secret}`);
        expect(await request.json()).toEqual({ refresh_token: secret });
        return Response.json(body, {
          headers: { "set-cookie": `session=${secret}`, "x-debug": secret },
        });
      },
    });
    const result = await client.PATCH("/api/v1/headless/access_token/refresh", {
      body: { refresh_token: secret },
      headers: { Cookie: `session=${secret}`, "X-Debug": secret },
    });
    expect(result.data).toEqual(body);
    for (const context of [...captured, ...observed]) {
      expect(context).not.toHaveProperty("options");
      expect(context).not.toHaveProperty("params");
      expect(JSON.stringify(context)).not.toContain(secret);
      expect(JSON.stringify(headerEntries(context.request.headers))).not.toContain(secret);
      expect(context.request.url).not.toContain(secret);
      expect(await context.request.text()).not.toContain(secret);
    }
    expect(await observed[0]?.response.text()).not.toContain(secret);
    expect(observed).toHaveLength(1);
    expect(
      JSON.stringify(headerEntries(observed[0]?.response.headers ?? new Headers())),
    ).not.toContain(secret);
  });

  it.each([
    false,
    true,
  ])("does not expose refresh failures or cause chains (bodies %s)", async (logBodies) => {
    const observed: unknown[] = [];
    const client = createHeadlessClient({
      token: secret,
      refreshToken: secret,
      authToken: secret,
      autoRefresh: true,
      logger: {
        logBodies,
        onError: (context) => {
          observed.push(context);
        },
      },
      fetcher: async (input) =>
        (input as Request).url.includes("/refresh")
          ? Response.json({ refresh_token: secret, message: secret }, { status: 401 })
          : Response.json({}, { status: 401 }),
    });
    await expect(client.GET("/api/headless/v1/spaces")).rejects.toMatchObject({ status: 401 });
    expect(observed).toHaveLength(1);
    expect(JSON.stringify(observed)).not.toContain(secret);
  });

  it("preserves the thrown transport error but exposes only safe logger error metadata", async () => {
    const cause = new Error(secret, { cause: { token: secret } });
    const original = new CircleNetworkError(secret, cause, {
      bodyText: secret,
      url: `https://example.test/?token=${secret}`,
    });
    const callback = vi.fn();
    const client = createHeadlessClient({
      token: secret,
      retries: { retries: 0 },
      logger: { onError: callback },
      fetcher: async () => {
        throw original;
      },
    });
    await expect(client.GET("/api/headless/v1/spaces")).rejects.toBe(original);
    expect(callback).toHaveBeenCalledOnce();
    expect(JSON.stringify(callback.mock.calls)).not.toContain(secret);
    expect(callback.mock.calls[0]?.[0].error).not.toHaveProperty("cause");
    expect(callback.mock.calls[0]?.[0].error).not.toHaveProperty("message");
  });

  it.each([
    "onRequest",
    "onResponse",
    "onError",
  ] as const)("awaits and wraps asynchronous %s failures", async (hook) => {
    const cause = new TypeError("synthetic callback failure");
    const logger: LoggerHooks = {
      [hook]: async () => {
        await Promise.resolve();
        throw cause;
      },
    };
    const client = createHeadlessClient({
      token: secret,
      retries: { retries: 0 },
      logger,
      fetcher: async () => {
        if (hook === "onError") throw new Error("synthetic transport");
        return Response.json({});
      },
    });
    const result = await client.GET("/api/headless/v1/spaces").catch((error: unknown) => error);
    expect(result).toBeInstanceOf(CircleConfigError);
    expect(result).toMatchObject({ cause, message: `Logger ${hook} callback failed.` });
  });

  it("logs a single logical call safely across HTTP retries and successful auto-refresh", async () => {
    for (const autoRefresh of [false, true]) {
      const captured: (LoggerRequestContext | LoggerResponseContext)[] = [];
      const calls: string[] = [];
      const client = createHeadlessClient({
        token: secret,
        refreshToken: secret,
        authToken: secret,
        autoRefresh,
        retries: { retries: 1, baseDelayMs: 0, maxDelayMs: 0 },
        logger: {
          logBodies: true,
          onRequest: (value) => {
            captured.push(value);
          },
          onResponse: (value) => {
            captured.push(value);
          },
        },
        fetcher: async (input) => {
          const request = input as Request;
          calls.push(request.url);
          if (request.url.includes("/refresh")) {
            expect(await request.json()).toEqual({ refresh_token: secret });
            return Response.json({ access_token: `${secret}-rotated` });
          }
          if (calls.length === 1)
            return Response.json(
              { token: secret },
              {
                status: autoRefresh ? 401 : 429,
                headers: { "retry-after": "0", "set-cookie": secret },
              },
            );
          expect(request.headers.get("authorization")).toBe(
            `Bearer ${secret}${autoRefresh ? "-rotated" : ""}`,
          );
          return Response.json(
            { access_token: secret, message: secret, count: 1 },
            { headers: { "set-cookie": secret } },
          );
        },
      });
      const result = await client.GET("/api/headless/v1/home", {
        params: { query: { page: 1 } },
        headers: { cookie: `session=${secret}` },
      });
      expect(result.response.status).toBe(200);
      expect(calls).toHaveLength(autoRefresh ? 3 : 2);
      expect(captured).toHaveLength(2);
      expect(JSON.stringify(captured)).not.toContain(secret);
      for (const log of captured) {
        expect(log.request.url).toBe("https://app.circle.so/api/headless/v1/home");
        log.request.headers.forEach((value) => {
          expect(value).not.toContain(secret);
        });
        if ("response" in log) {
          expect(await log.response.clone().text()).not.toContain(secret);
          log.response.headers.forEach((value) => {
            expect(value).not.toContain(secret);
          });
        }
      }
    }
  });

  it("preserves native stream pulls and response metadata through the public raw boundary", async () => {
    const pull = vi.fn();
    const response = new Response(new ReadableStream({ pull }, { highWaterMark: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    Object.defineProperty(response, "url", { value: `https://example.test/path?token=${secret}` });
    const onResponse = vi.fn();
    const client = createHeadlessClient({
      token: secret,
      logger: { logBodies: true, onResponse },
      fetcher: async () => response,
    });
    const result = await client.GET("/api/headless/v1/spaces", { parseAs: "stream" });
    expect(result.response.url).toContain(secret);
    expect(pull).not.toHaveBeenCalled();
    expect(onResponse.mock.calls[0]?.[0].responseBody).toBeUndefined();
    await result.data?.cancel();
  });

  it("awaits successful asynchronous hooks in order and ignores hook return values", async () => {
    const events: string[] = [];
    const client = createHeadlessClient({
      token: secret,
      logger: {
        onRequest: async () => {
          await Promise.resolve();
          events.push("request");
        },
        onResponse: async () => {
          await Promise.resolve();
          events.push("response");
        },
      },
      fetcher: async () => {
        events.push("fetch");
        return Response.json({});
      },
    });
    await client.GET("/api/headless/v1/spaces");
    expect(events).toEqual(["request", "fetch", "response"]);
  });
});
