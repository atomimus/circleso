import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "./authApi";
import { createOpenApiClient } from "./clients/shared";
import { CircleConfigError, CircleHttpError, CircleNetworkError } from "./core/errors";
import type { LoggerHooks } from "./core/middleware/logger";
import { createSessionCookiesUrl } from "./core/sessionCookies";
import { createHeadless } from "./headlessApi";

afterEach(() => vi.unstubAllGlobals());

function headerValues(headers: Headers): string {
  const entries: [string, string][] = [];
  headers.forEach((value, name) => {
    entries.push([name, value]);
  });
  return JSON.stringify(entries);
}

describe("cookie response metadata", () => {
  it.each([
    "createWithResponse",
    "deleteWithResponse",
  ] as const)("%s exposes typed data and each Set-Cookie value", async (method) => {
    const cookies = [
      "fixture_session=synthetic; Path=/; Secure; HttpOnly; SameSite=None",
      "fixture_other=synthetic; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Secure",
    ];
    const member = createHeadless({
      accessToken: "synthetic-member",
      fetcher: async (input) => {
        const request = input as Request;
        expect(request.method).toBe(method === "createWithResponse" ? "POST" : "DELETE");
        expect(request.credentials).toBe("include");
        expect(await request.text()).toBe("");
        const headers = new Headers({ "x-request-id": "synthetic-request" });
        for (const cookie of cookies) headers.append("set-cookie", cookie);
        return Response.json({ message: "synthetic" }, { headers });
      },
    });
    const result = await member.cookies[method]({ credentials: "include" });
    expect(result.data?.message).toBe("synthetic");
    expect(result.response.status).toBe(200);
    expect(result.response.headers.get("x-request-id")).toBe("synthetic-request");
    expect(result.response.headers.getSetCookie()).toEqual(cookies);
    expect(result.response.bodyUsed).toBe(true);
  });

  it.each([
    "include",
    "omit",
    "same-origin",
  ] as const)("preserves explicit %s credentials in facades, metadata methods and raw clients", async (credentials) => {
    const requests: Request[] = [];
    const member = createHeadless({
      token: "synthetic-member",
      fetcher: async (input) => {
        requests.push(input as Request);
        return Response.json({ message: "synthetic" });
      },
    });
    await member.cookies.create({ credentials });
    await member.cookies.delete({ credentials });
    await member.cookies.createWithResponse({ credentials });
    await member.cookies.deleteWithResponse({ credentials });
    await member.raw.POST("/api/headless/v1/cookies", { credentials });
    await member.raw["/api/headless/v1/cookies"].DELETE({ credentials });
    expect(requests.map((request) => request.credentials)).toEqual(Array(6).fill(credentials));
    expect(requests.every((request) => !request.headers.has("host"))).toBe(true);
  });

  it.each([
    "createWithResponse",
    "deleteWithResponse",
  ] as const)("%s preserves HTTP errors, parse failures and empty responses", async (method) => {
    const response = vi.fn<() => Promise<Response>>();
    const member = createHeadless({
      token: "synthetic-member",
      retries: { retries: 0 },
      fetcher: response,
    });
    response.mockResolvedValueOnce(Response.json({ message: "synthetic-error" }, { status: 401 }));
    await expect(member.cookies[method]()).rejects.toMatchObject({
      constructor: CircleHttpError,
      status: 401,
      method: method === "createWithResponse" ? "POST" : "DELETE",
      url: "https://app.circle.so/api/headless/v1/cookies",
      parsedJson: { message: "synthetic-error" },
    });
    response.mockResolvedValueOnce(
      new Response("{", { headers: { "content-type": "application/json" } }),
    );
    await expect(member.cookies[method]()).rejects.toBeInstanceOf(CircleNetworkError);
    response.mockResolvedValueOnce(
      new Response(null, { status: 204, headers: { "set-cookie": "synthetic=; Max-Age=0" } }),
    );
    const empty = await member.cookies[method]();
    expect(empty.data).toBeUndefined();
    expect(empty.response.status).toBe(204);
    expect(empty.response.headers.getSetCookie()).toEqual(["synthetic=; Max-Age=0"]);
  });

  it("keeps browser member calls available without exposing filtered Set-Cookie headers", async () => {
    vi.stubGlobal("window", {});
    expect(() => createAuth({ token: "synthetic-application" })).toThrow(CircleConfigError);
    const member = createHeadless({
      token: "synthetic-member",
      fetcher: async (request) => {
        expect((request as Request).credentials).toBe("include");
        // A synthetic filtered response, not a test of browser cookie storage or CORS.
        return Response.json({ message: "Cookies generated" });
      },
    });
    const { data, response } = await member.cookies.createWithResponse({ credentials: "include" });
    expect(data?.message).toBe("Cookies generated");
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});

describe("server application to member flows", () => {
  it.each([
    { email: "synthetic@example.test" },
    { community_member_id: 42 },
    { sso_user_id: "synthetic-sso" },
  ])("issues, uses, refreshes and revokes tokens for selector %j", async (identity) => {
    const calls: { path: string; method: string; body: unknown }[] = [];
    const auth = createAuth({
      token: "synthetic-application",
      fetcher: async (input) => {
        const request = input as Request;
        const path = new URL(request.url).pathname;
        const body: unknown = await request.json();
        expect(request.headers.get("authorization")).toBe("Bearer synthetic-application");
        expect(request.headers.has("host")).toBe(false);
        calls.push({ path, method: request.method, body });
        if (path.endsWith("auth_token"))
          return Response.json({
            access_token: "synthetic-access",
            refresh_token: "synthetic-refresh",
          });
        if (path.endsWith("refresh")) return Response.json({ access_token: "synthetic-renewed" });
        return new Response(null, { status: 204 });
      },
    });
    const tokens = await auth.authToken.create(identity);
    if (!tokens?.access_token || !tokens.refresh_token)
      throw new CircleConfigError("Fixture tokens missing");
    const member = createHeadless({
      accessToken: tokens.access_token,
      fetcher: async (input) => {
        expect((input as Request).headers.get("authorization")).toBe("Bearer synthetic-access");
        return Response.json({ records: [] });
      },
    });
    expect(await member.bookmarks.list()).toEqual({ records: [] });
    expect(
      (await auth.accessToken.refresh({ refresh_token: tokens.refresh_token }))?.access_token,
    ).toBe("synthetic-renewed");
    expect(await auth.accessToken.revoke({ access_token: tokens.access_token })).toBeUndefined();
    expect(await auth.refreshToken.revoke({ refresh_token: tokens.refresh_token })).toBeUndefined();
    expect(calls).toEqual([
      { path: "/api/v1/headless/auth_token", method: "POST", body: identity },
      {
        path: "/api/v1/headless/access_token/refresh",
        method: "PATCH",
        body: { refresh_token: "synthetic-refresh" },
      },
      {
        path: "/api/v1/headless/access_token/revoke",
        method: "POST",
        body: { access_token: "synthetic-access" },
      },
      {
        path: "/api/v1/headless/refresh_token/revoke",
        method: "POST",
        body: { refresh_token: "synthetic-refresh" },
      },
    ]);
  });

  it("isolates concurrent users including refresh and cookie metadata", async () => {
    const makeMember = (user: string) =>
      createHeadless({
        accessToken: `synthetic-${user}-old`,
        refreshToken: `synthetic-${user}-refresh`,
        authToken: "synthetic-application",
        autoRefresh: true,
        fetcher: async (input) => {
          const request = input as Request;
          if (request.url.endsWith("/refresh")) {
            expect(request.headers.get("authorization")).toBe("Bearer synthetic-application");
            expect(await request.json()).toEqual({ refresh_token: `synthetic-${user}-refresh` });
            return Response.json({ access_token: `synthetic-${user}-new` });
          }
          if (request.headers.get("authorization") === `Bearer synthetic-${user}-old`)
            return new Response(null, { status: 401 });
          expect(request.headers.get("authorization")).toBe(`Bearer synthetic-${user}-new`);
          expect(request.credentials).toBe("include");
          return Response.json(
            { message: user },
            { headers: { "set-cookie": `synthetic_session=${user}; Secure` } },
          );
        },
      });
    const [a, b] = await Promise.all([
      makeMember("a").cookies.createWithResponse({ credentials: "include" }),
      makeMember("b").cookies.createWithResponse({ credentials: "include" }),
    ]);
    expect(a.data?.message).toBe("a");
    expect(b.data?.message).toBe("b");
    expect(a.response.headers.getSetCookie()).toEqual(["synthetic_session=a; Secure"]);
    expect(b.response.headers.getSetCookie()).toEqual(["synthetic_session=b; Secure"]);
  });
});

describe("session redirect URL", () => {
  it("constructs only the documented HTTPS route and encodes the member token", () => {
    const value = createSessionCookiesUrl({
      communityUrl: "https://community.example.test/",
      accessToken: "synthetic+/?&=#%",
    });
    const url = new URL(value);
    expect(url.origin).toBe("https://community.example.test");
    expect(url.pathname).toBe("/session/cookies");
    expect([...url.searchParams]).toEqual([["access_token", "synthetic+/?&=#%"]]);
    expect(url.hash).toBe("");
  });

  it.each([
    "http://example.test",
    "javascript:synthetic",
    "//example.test",
    "https://user:synthetic@example.test",
    "https://example.test/path",
    "https://example.test/path/..",
    "https://example.test/?access_token=synthetic",
    "https://example.test/#synthetic",
    "https://example.test?",
    "https://example.test\\path",
    " https://example.test",
  ])("rejects invalid or non-origin community URLs without echoing secrets (%s)", (communityUrl) => {
    try {
      createSessionCookiesUrl({ communityUrl, accessToken: "synthetic-secret" });
      expect.fail("Expected invalid URL rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CircleConfigError);
      expect((error as Error).message).not.toContain("synthetic");
    }
  });

  it.each([
    undefined,
    null,
    1,
    {},
    { communityUrl: "https://example.test", accessToken: "" },
    { communityUrl: "https://example.test", accessToken: "synthetic\nsecret" },
  ])("normalizes invalid JavaScript input %j", (options) => {
    expect(() => createSessionCookiesUrl(options as never)).toThrow(CircleConfigError);
  });

  it("retains unexpected property-access causes", () => {
    const cause = new Error("synthetic cause");
    expect(() =>
      createSessionCookiesUrl({
        get communityUrl(): string {
          throw cause;
        },
        accessToken: "synthetic",
      }),
    ).toThrow(expect.objectContaining({ cause }));
  });

  it("omits access-token query values and cookies from SDK logger snapshots", async () => {
    const observed: string[] = [];
    const record: NonNullable<LoggerHooks["onRequest"]> = async ({ request }) => {
      observed.push(request.url, headerValues(request.headers), await request.text());
    };
    const url = new URL(
      createSessionCookiesUrl({
        communityUrl: "https://example.test",
        accessToken: "synthetic-query-secret",
      }),
    );
    // A local schema fixture exercises existing global logger behavior without inventing a Circle API operation.
    type Fixture = {
      "/session/cookies": {
        get: {
          parameters: { query: { access_token: string } };
          responses: { 204: { content?: never } };
        };
      };
    };
    const client = createOpenApiClient<Fixture>(
      {
        baseUrl: url.origin,
        logger: {
          onRequest: record,
          onResponse: async ({ request, response }) => {
            await record({ request, id: "fixture", schemaPath: "/session/cookies" });
            observed.push(response.url, headerValues(response.headers));
          },
        },
        fetcher: async (input) => {
          expect(new URL((input as Request).url).searchParams.get("access_token")).toBe(
            "synthetic-query-secret",
          );
          return new Response(null, {
            status: 204,
            headers: { "set-cookie": "synthetic-cookie-secret" },
          });
        },
      },
      [],
    );
    await client.GET("/session/cookies", {
      params: { query: { access_token: url.searchParams.get("access_token") ?? "" } },
    });
    expect(observed.join(" ")).not.toMatch(/synthetic-query-secret|synthetic-cookie-secret/);
    expect(observed[0]).toBe("https://example.test/session/cookies");
  });
});
