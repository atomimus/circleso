import type { MergedOptions, MiddlewareCallbackParams } from "openapi-fetch";
import { describe, expect, it } from "vitest";
import {
  HEADER_API_KEY,
  HEADER_AUTHORIZATION,
  HEADER_CONTENT_TYPE,
  HEADER_COOKIE,
  HEADER_SET_COOKIE,
} from "../headers";
import {
  createLoggerMiddleware,
  type LoggerRequestContext,
  type LoggerResponseContext,
} from "./logger";

const fallbackFetch: typeof globalThis.fetch = async () => new Response();

const baseOptions = {
  baseUrl: "https://api.example.com",
  parseAs: "json",
  querySerializer: () => "",
  bodySerializer: (body: unknown) => body,
  fetch: globalThis.fetch ?? fallbackFetch,
} satisfies MergedOptions<unknown>;

function createContext(request: Request): MiddlewareCallbackParams {
  return {
    request,
    schemaPath: "/test",
    params: {},
    id: "test",
    options: baseOptions,
  };
}

describe("logger middleware", () => {
  it("redacts sensitive headers and omits bodies by default", async () => {
    let capturedRequest: LoggerRequestContext | undefined;
    let capturedResponse: LoggerResponseContext | undefined;

    const middleware = createLoggerMiddleware({
      onRequest: (params) => {
        capturedRequest = params;
      },
      onResponse: (params) => {
        capturedResponse = params;
      },
    });

    const request = new Request("https://api.example.com/secret", {
      method: "POST",
      headers: {
        [HEADER_AUTHORIZATION]: "Bearer secret",
        [HEADER_COOKIE]: "session=abc",
        [HEADER_API_KEY]: "apikey",
        "x-trace-id": "trace",
      },
      body: JSON.stringify({ access_token: "secret" }),
    });

    await middleware?.onRequest?.(createContext(request));

    expect(capturedRequest?.request.headers.get(HEADER_AUTHORIZATION)).toBe("REDACTED");
    expect(capturedRequest?.request.headers.get(HEADER_COOKIE)).toBe("REDACTED");
    expect(capturedRequest?.request.headers.get(HEADER_API_KEY)).toBe("REDACTED");
    expect(capturedRequest?.request.headers.get("x-trace-id")).toBe("trace");
    expect(capturedRequest?.requestBody).toBeUndefined();
    expect(await capturedRequest?.request.text()).toBe("");

    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        [HEADER_SET_COOKIE]: "session=abc",
        [HEADER_CONTENT_TYPE]: "application/json",
      },
    });

    await middleware?.onResponse?.({ ...createContext(request), response });

    expect(capturedResponse?.response.headers.get(HEADER_SET_COOKIE)).toBe("REDACTED");
    expect(capturedResponse?.responseBody).toBeUndefined();
    expect(await capturedResponse?.response.text()).toBe("");
  });

  it("redacts token fields in bodies when logBodies is enabled", async () => {
    let capturedRequest: LoggerRequestContext | undefined;
    let capturedResponse: LoggerResponseContext | undefined;

    const middleware = createLoggerMiddleware({
      logBodies: true,
      onRequest: (params) => {
        capturedRequest = params;
      },
      onResponse: (params) => {
        capturedResponse = params;
      },
    });

    const request = new Request("https://api.example.com/body", {
      method: "POST",
      headers: {
        [HEADER_AUTHORIZATION]: "Bearer secret",
      },
      body: JSON.stringify({
        access_token: "secret",
        nested: { token: "another-secret" },
      }),
    });

    await middleware?.onRequest?.(createContext(request));

    expect(capturedRequest?.requestBody).toBe(
      JSON.stringify({ access_token: "REDACTED", nested: { token: "REDACTED" } }),
    );

    const response = new Response(JSON.stringify({ refresh_token: "secret" }), {
      status: 200,
      headers: {
        [HEADER_SET_COOKIE]: "session=abc",
        [HEADER_CONTENT_TYPE]: "application/json",
      },
    });

    await middleware?.onResponse?.({ ...createContext(request), response });

    expect(capturedResponse?.responseBody).toBe(JSON.stringify({ refresh_token: "REDACTED" }));
  });
});
