import { describe, expect, it, vi } from "vitest";
import { CircleHttpError } from "./errors";
import { HEADER_AUTHORIZATION, HEADER_CONTENT_TYPE } from "./headers";
import { createTokenManager } from "./tokenManager";

const BASE_URL = "https://api-headless.circle.so";
const REFRESH_URL = `${BASE_URL}/api/v1/headless/access_token/refresh`;

describe("token manager auto-refresh", () => {
  it("refreshes tokens on expired responses and retries once", async () => {
    const seen: Array<{ url: string; auth: string | undefined }> = [];
    let mainCalls = 0;
    let refreshBody: string | undefined;

    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      seen.push({
        url: request.url,
        auth: request.headers.get(HEADER_AUTHORIZATION) ?? undefined,
      });

      if (request.url === REFRESH_URL) {
        refreshBody = await request.text();
        return new Response(JSON.stringify({ access_token: "next-token" }), {
          status: 200,
          headers: { [HEADER_CONTENT_TYPE]: "application/json" },
        });
      }

      mainCalls += 1;
      if (mainCalls === 1) {
        return new Response(JSON.stringify({ message: "The access token is expired." }), {
          status: 400,
          headers: { [HEADER_CONTENT_TYPE]: "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { [HEADER_CONTENT_TYPE]: "application/json" },
      });
    });

    const manager = createTokenManager({
      accessToken: "old-token",
      refreshToken: "refresh-token",
    });

    const autoFetch = manager.createAutoRefreshFetch({
      baseUrl: BASE_URL,
      fetcher: fetcher as typeof fetch,
    });

    const request = new Request(`${BASE_URL}/api/headless/v1/me`, {
      headers: { [HEADER_AUTHORIZATION]: "Bearer old-token" },
    });

    const response = await autoFetch(request);
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(seen).toEqual([
      { url: `${BASE_URL}/api/headless/v1/me`, auth: "Bearer old-token" },
      { url: REFRESH_URL, auth: "Bearer refresh-token" },
      { url: `${BASE_URL}/api/headless/v1/me`, auth: "Bearer next-token" },
    ]);
    expect(refreshBody).toBe(JSON.stringify({ refresh_token: "refresh-token" }));
  });

  it("throws the refresh error when refresh fails", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      if (request.url === REFRESH_URL) {
        return new Response("refresh failed", {
          status: 500,
          headers: { [HEADER_CONTENT_TYPE]: "text/plain" },
        });
      }

      return new Response(JSON.stringify({ message: "The access token is expired." }), {
        status: 401,
        headers: { [HEADER_CONTENT_TYPE]: "application/json" },
      });
    });

    const manager = createTokenManager({
      accessToken: "old-token",
      refreshToken: "refresh-token",
    });

    const autoFetch = manager.createAutoRefreshFetch({
      baseUrl: BASE_URL,
      fetcher: fetcher as typeof fetch,
    });

    const request = new Request(`${BASE_URL}/api/headless/v1/me`, {
      headers: { [HEADER_AUTHORIZATION]: "Bearer old-token" },
    });

    let thrown: unknown;
    try {
      await autoFetch(request);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CircleHttpError);
    expect(thrown).toMatchObject({
      status: 500,
      url: REFRESH_URL,
      bodyText: "refresh failed",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
