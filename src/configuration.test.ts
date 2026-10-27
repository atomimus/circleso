import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdmin } from "./adminApi";
import { createAuth } from "./authApi";
import { createAdminClient } from "./clients/adminClient";
import { createHeadlessAuthClient } from "./clients/headlessAuthClient";
import { createHeadlessClient } from "./clients/headlessClient";
import { CircleConfigError } from "./core/errors";
import { createSmartFetch } from "./core/http";
import { createAdminAuthMiddleware } from "./core/middleware/adminAuth";
import { createBearerAuthMiddleware } from "./core/middleware/bearerAuth";
import { createHostHeaderMiddleware } from "./core/middleware/hostHeader";
import { createTokenManager } from "./core/tokenManager";
import { createHeadless } from "./headlessApi";
import { CircleSo } from "./index";

afterEach(() => vi.unstubAllGlobals());

function recorder() {
  const requests: Request[] = [];
  const fetcher: typeof fetch = vi.fn(async (input, init) => {
    requests.push(input instanceof Request ? input : new Request(input, init));
    return Response.json({ records: [] });
  });
  return { requests, fetcher };
}

describe("public configuration boundaries", () => {
  it.each([
    undefined,
    null,
    false,
    "bad",
    [],
  ])("normalizes invalid configuration objects %j", (value) => {
    for (const factory of [
      createAdmin,
      createAuth,
      createHeadless,
      createAdminClient,
      createHeadlessClient,
      createHeadlessAuthClient,
      createSmartFetch,
      createTokenManager,
      createAdminAuthMiddleware,
      createBearerAuthMiddleware,
    ]) {
      expect(() => Reflect.apply(factory, undefined, [value])).toThrow(CircleConfigError);
    }
    expect(() => new CircleSo(value as never)).toThrow(CircleConfigError);
  });

  it.each([
    "localhost:8080",
    "127.0.0.1:8080",
    "[::1]:8080",
    "EXAMPLE.test",
    "community.example.test.",
  ])("accepts explicit Host authority %s", async (communityHost) => {
    const { requests, fetcher } = recorder();
    await createAdmin({ token: "admin", communityHost, fetcher }).accessGroups.list();
    expect(requests[0]?.headers.get("host")).toBe(communityHost.toLowerCase());
    expect(new URL(requests[0]?.url ?? "").origin).toBe("https://app.circle.so");
  });
  it.each([
    undefined,
    "community.example.test",
  ])("keeps defaults independent of communityHost=%s and honors custom fetchers", async (communityHost) => {
    const { requests, fetcher } = recorder();
    const options = { fetcher, ...(communityHost ? { communityHost } : {}) };
    await createAdmin({ ...options, token: "admin" }).accessGroups.list();
    await createHeadless({ ...options, accessToken: "member" }).bookmarks.list();
    await createAuth({ ...options, token: "application" }).accessToken.refresh({
      refresh_token: "refresh",
    });
    expect(requests).toHaveLength(3);
    for (const request of requests)
      expect(new URL(request.url).origin).toBe("https://app.circle.so");
    expect(requests.map((request) => request.headers.get("host"))).toEqual([
      communityHost ?? "app.circle.so",
      null,
      null,
    ]);
    expect(requests.map((request) => request.headers.get("authorization"))).toEqual([
      "Token admin",
      "Bearer member",
      "Bearer application",
    ]);
  });

  it("keeps custom destinations and Admin Host independent through the unified client", async () => {
    const { requests, fetcher } = recorder();
    const sdk = new CircleSo({
      baseUrl: "https://shared.example.test",
      communityHost: "shared-host.example.test",
      admin: {
        token: "admin",
        baseUrl: "https://admin.example.test/prefix/",
        communityHost: "admin-host.example.test",
      },
      headless: { token: "member" },
      auth: { token: "application", baseUrl: "http://localhost:3456" },
      fetcher,
    });
    await sdk.admin.accessGroups.list();
    await sdk.headless.bookmarks.list();
    await sdk.auth.accessToken.refresh({ refresh_token: "refresh" });
    expect(requests.map((request) => request.url)).toEqual([
      "https://admin.example.test/prefix/api/admin/v2/access_groups",
      "https://shared.example.test/api/headless/v1/bookmarks",
      "http://localhost:3456/api/v1/headless/access_token/refresh",
    ]);
    expect(requests.map((request) => request.headers.get("host"))).toEqual([
      "admin-host.example.test",
      null,
      null,
    ]);
  });

  it("uses the explicit Auth URL prefix for refresh and preserves the Member destination", async () => {
    const requests: Request[] = [];
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      if (requests.length === 1) return Response.json({}, { status: 401 });
      if (requests.length === 2) {
        expect(request.headers.get("authorization")).toBe("Bearer application");
        expect(await request.json()).toEqual({ refresh_token: "refresh" });
        return Response.json({ access_token: "rotated" });
      }
      expect(request.headers.get("authorization")).toBe("Bearer rotated");
      return Response.json({ records: [] });
    });
    await createHeadless({
      communityHost: "community.example.test",
      baseUrl: "https://member.example.test/prefix",
      authBaseUrl: "https://auth.example.test/proxy/",
      accessToken: "member",
      refreshToken: "refresh",
      authToken: "application",
      autoRefresh: true,
      fetcher,
    }).bookmarks.list();
    expect(requests.map((request) => request.url)).toEqual([
      "https://member.example.test/prefix/api/headless/v1/bookmarks",
      "https://auth.example.test/proxy/api/v1/headless/access_token/refresh",
      "https://member.example.test/prefix/api/headless/v1/bookmarks",
    ]);
    for (const request of requests) expect(request.headers.has("host")).toBe(false);
  });

  it.each([
    "",
    " ",
    "relative",
    "ftp://example.test",
    "https://user:pass@example.test",
    "https://example.test?key=value",
    "https://example.test/#fragment",
    " https://example.test",
    "https://example.test\\path",
  ])("rejects invalid baseUrl %s at creation", (baseUrl) => {
    for (const factory of [createAdminClient, createHeadlessClient, createHeadlessAuthClient]) {
      expect(() => factory({ token: "synthetic", baseUrl })).toThrow(CircleConfigError);
    }
    expect(() => createSmartFetch({ baseUrl })).toThrow(CircleConfigError);
  });

  it.each([
    "",
    " ",
    "https://example.test",
    "example.test/path",
    "user@example.test",
    "example.test?x=1",
    "example.test\r\nx: y",
    "-bad.test",
    "example.test:65536",
  ])("rejects invalid communityHost %s at creation", (communityHost) => {
    for (const factory of [createAdminClient, createHeadlessClient, createHeadlessAuthClient]) {
      expect(() => factory({ token: "synthetic", communityHost })).toThrow(CircleConfigError);
    }
  });

  it.each([
    " ",
    "with space",
    "bad\r\nheader",
    "bad\tvalue",
    "non-ascii-\u2603",
  ])("rejects invalid static credentials %j", (token) => {
    for (const factory of [createAdminClient, createHeadlessClient, createHeadlessAuthClient]) {
      expect(() => factory({ token })).toThrow(CircleConfigError);
    }
  });

  it("rejects invalid hooks, aliases, refresh settings and custom fetchers before fetch", () => {
    const invalid = [
      { accessToken: "member", token: "other" },
      { getAccessToken: "member" },
      { accessToken: "member", setAccessToken: true },
      { accessToken: "member", autoRefresh: "yes" },
      { accessToken: "member", refreshToken: " ", authToken: "application", autoRefresh: true },
      { accessToken: "member", refreshToken: "refresh", authToken: " ", autoRefresh: true },
      { accessToken: "member", authBaseUrl: "bad-url" },
      { accessToken: "member", fetcher: {} },
      { accessToken: "member", fetcher: null },
    ];
    for (const config of invalid)
      expect(() => createHeadlessClient(config as never)).toThrow(CircleConfigError);
  });

  it.each([
    NaN,
    Infinity,
    -1,
    2_147_483_648,
  ])("rejects invalid timeout %s before any token hook", (timeoutMs) => {
    const getAccessToken = vi.fn(() => "member");
    expect(() => createHeadlessClient({ getAccessToken, timeoutMs })).toThrow(CircleConfigError);
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    " ",
    123,
  ])("rejects invalid provider results %j without fetching", async (value) => {
    const { fetcher } = recorder();
    const headless = createHeadless({ getAccessToken: (() => value) as never, fetcher });
    await expect(headless.bookmarks.list()).rejects.toBeInstanceOf(CircleConfigError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves token-provider rejection causes without invoking the provider at creation", async () => {
    const { fetcher } = recorder();
    const cause = new Error("synthetic storage failure");
    const getAccessToken = vi.fn(async () => {
      throw cause;
    });
    const headless = createHeadless({ getAccessToken, fetcher });
    expect(getAccessToken).not.toHaveBeenCalled();
    await expect(headless.bookmarks.list()).rejects.toMatchObject({
      name: "CircleConfigError",
      cause,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("validates public middleware and direct token-manager credentials before use", () => {
    expect(() => createSmartFetch({} as never)).toThrow(CircleConfigError);
    expect(() => createHostHeaderMiddleware({} as never)).toThrow(CircleConfigError);
    expect(() => createBearerAuthMiddleware({ token: " " })).toThrow(CircleConfigError);
    expect(() =>
      createAdminAuthMiddleware({ token: "admin", host: "https://example.test" }),
    ).toThrow(CircleConfigError);
    expect(() => createTokenManager({ accessToken: " " })).toThrow(CircleConfigError);
    expect(() => createTokenManager({ getAccessToken: "bad" } as never)).toThrow(CircleConfigError);
    expect(() =>
      createTokenManager({ accessToken: "member" }).createAutoRefreshFetch({
        baseUrl: "https://app.circle.so",
        authToken: "application",
      }),
    ).toThrow(CircleConfigError);
  });

  it.each([
    "",
    " ",
    "invalid\r\nheader",
  ])("rejects invalid userAgent %j before fetching", (userAgent) => {
    const { fetcher } = recorder();
    expect(() => createHeadless({ accessToken: "member", fetcher, userAgent })).toThrow(
      CircleConfigError,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects invalid per-call deadlines at the smart-fetch boundary", async () => {
    const { fetcher } = recorder();
    const smartFetch = createSmartFetch({ baseUrl: "https://app.circle.so", fetcher });
    await expect(smartFetch("/", { timeoutMs: NaN })).rejects.toBeInstanceOf(CircleConfigError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts getter precedence and matching token aliases without eager token reads", async () => {
    const { requests, fetcher } = recorder();
    const getAccessToken = vi.fn(() => "stored-member");
    const sdk = new CircleSo({
      admin: { token: "admin" },
      headless: { token: "initial-member", accessToken: "initial-member", getAccessToken },
      auth: { token: "application" },
      fetcher,
    });
    expect(getAccessToken).not.toHaveBeenCalled();
    await sdk.headless.bookmarks.list();
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer stored-member");
    expect(
      () =>
        new CircleSo({
          admin: { token: "admin" },
          headless: { token: "a", accessToken: "b" },
          auth: { token: "application" },
          fetcher,
        }),
    ).toThrow(CircleConfigError);
  });

  it.each([
    "window",
    "document",
    "dedicated worker",
    "shared worker",
    "service worker",
    "classic worker",
  ])("rejects privileged clients in %s while Member calls work", async (runtime) => {
    if (runtime === "window") vi.stubGlobal("window", { document: {} });
    else if (runtime === "document") vi.stubGlobal("document", {});
    else if (runtime === "classic worker") {
      vi.stubGlobal("self", globalThis);
      vi.stubGlobal("importScripts", () => {});
    } else {
      class WorkerGlobalScope {}
      vi.stubGlobal("WorkerGlobalScope", WorkerGlobalScope);
      vi.stubGlobal("self", new WorkerGlobalScope());
    }
    const { requests, fetcher } = recorder();
    expect(() => createAdmin({ token: "admin", fetcher })).toThrow(CircleConfigError);
    expect(() => createAuth({ token: "application", fetcher })).toThrow(CircleConfigError);
    expect(
      () =>
        new CircleSo({
          admin: { token: "admin" },
          headless: { accessToken: "member" },
          auth: { token: "application" },
          fetcher,
        }),
    ).toThrow(CircleConfigError);
    expect(() =>
      createHeadlessClient({
        accessToken: "member",
        authToken: "application",
        refreshToken: "refresh",
        autoRefresh: true,
        fetcher,
      }),
    ).toThrow(CircleConfigError);
    expect(() =>
      createHeadlessClient({ accessToken: "member", authToken: "application", fetcher }),
    ).toThrow(CircleConfigError);
    expect(() =>
      createTokenManager({ accessToken: "member", refreshToken: "refresh" }).createAutoRefreshFetch(
        { baseUrl: "https://app.circle.so", authToken: "application", fetcher },
      ),
    ).toThrow(CircleConfigError);
    await createHeadless({ getAccessToken: () => "member", fetcher }).bookmarks.list();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer member");
    expect(requests[0]?.headers.has("host")).toBe(false);
  });

  it("does not classify Node's navigator or server worker_threads as browser workers", () => {
    vi.stubGlobal("navigator", { userAgent: "Node.js" });
    vi.stubGlobal("self", undefined);
    expect(() => createAdminClient({ token: "admin" })).not.toThrow();
    expect(() => createHeadlessAuthClient({ token: "application" })).not.toThrow();
  });

  it("retains native URL parser causes", () => {
    try {
      createAdminClient({ token: "admin", baseUrl: "https://[invalid" });
    } catch (error) {
      expect(error).toBeInstanceOf(CircleConfigError);
      expect((error as CircleConfigError).cause).toBeInstanceOf(TypeError);
      return;
    }
    throw new Error("Expected invalid URL to fail");
  });

  it("rejects differing Admin Host/destination with default Fetch before sending", () => {
    expect(() =>
      createAdminClient({ token: "admin", communityHost: "community.example.test" }),
    ).toThrow(CircleConfigError);
    expect(() =>
      createAdminClient({ token: "admin", baseUrl: "https://proxy.example.test" }),
    ).toThrow(CircleConfigError);
    expect(() =>
      createAdminClient({
        token: "admin",
        communityHost: "community.example.test",
        fetcher: globalThis.fetch,
      }),
    ).toThrow(CircleConfigError);
    expect(() =>
      createAdminClient({
        token: "admin",
        baseUrl: "https://community.example.test",
        communityHost: "community.example.test",
      }),
    ).not.toThrow();
    const { fetcher } = recorder();
    expect(() =>
      createAdminClient({ token: "admin", communityHost: "community.example.test", fetcher }),
    ).not.toThrow();
  });
});
