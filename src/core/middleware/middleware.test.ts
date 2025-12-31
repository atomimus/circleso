import type { MergedOptions, MiddlewareCallbackParams } from "openapi-fetch";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CircleConfigError } from "../errors";
import { HEADER_AUTHORIZATION, HEADER_HOST } from "../headers";
import { createAdminAuthMiddleware } from "./adminAuth";
import { createBearerAuthMiddleware } from "./bearerAuth";
import { createHostHeaderMiddleware } from "./hostHeader";

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

function resolveRequest(result: unknown, fallback: Request) {
  return result instanceof Request ? result : fallback;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("middleware", () => {
  it("sets admin token auth and host header", async () => {
    const middleware = createAdminAuthMiddleware({
      token: "admin-token",
      host: "community.circle.so",
    });

    const request = new Request("https://api.example.com/admin");
    const result = await middleware.onRequest?.(createContext(request));
    const nextRequest = resolveRequest(result, request);

    expect(nextRequest.headers.get(HEADER_AUTHORIZATION)).toBe("Token admin-token");
    expect(nextRequest.headers.get(HEADER_HOST)).toBe("community.circle.so");
  });

  it("sets bearer auth header", async () => {
    const middleware = createBearerAuthMiddleware({ token: "headless-token" });
    const request = new Request("https://api.example.com/headless");
    const result = await middleware.onRequest?.(createContext(request));
    const nextRequest = resolveRequest(result, request);

    expect(nextRequest.headers.get(HEADER_AUTHORIZATION)).toBe("Bearer headless-token");
  });

  it("throws when host header is enabled in browser runtime", () => {
    vi.stubGlobal("window", { document: {} });
    expect(() => createHostHeaderMiddleware({ host: "community.circle.so" })).toThrowError(
      "Admin API requires 'host' header; use server-side runtime or proxy.",
    );
    expect(() => createHostHeaderMiddleware({ host: "community.circle.so" })).toThrowError(
      CircleConfigError,
    );
  });
});
