import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createAdmin } from "./adminApi";
import { createAuth } from "./authApi";
import { createClient } from "./core/client";
import { CircleConfigError, CircleHttpError, CircleNetworkError } from "./core/errors";
import { createSmartFetch } from "./core/http";
import { createHeadless } from "./headlessApi";

const baseUrl = "https://community.example.test";

function surfaces(response: () => Response) {
  const config = {
    baseUrl,
    token: "synthetic-token",
    fetcher: async () => response(),
    retries: { retries: 0 },
  };
  const admin = createAdmin(config);
  const headless = createHeadless(config);
  const auth = createAuth(config);
  return [
    {
      name: "Admin",
      call: () => admin.spaces.list(),
      method: "GET",
      path: "/api/admin/v2/spaces",
      raw: () => admin.raw.GET("/api/admin/v2/spaces"),
    },
    {
      name: "Headless",
      call: () => headless.spaces.list(),
      method: "GET",
      path: "/api/headless/v1/spaces",
      raw: () => headless.raw.GET("/api/headless/v1/spaces"),
    },
    {
      name: "Auth",
      call: () => auth.accessToken.refresh({ refresh_token: "synthetic-refresh" }),
      method: "PATCH",
      path: "/api/v1/headless/access_token/refresh",
      raw: () =>
        auth.raw.PATCH("/api/v1/headless/access_token/refresh", {
          body: { refresh_token: "synthetic-refresh" },
        }),
    },
  ] as const;
}

describe("response parsing regressions", () => {
  for (const index of [0, 1, 2] as const) {
    it(`rejects an empty HTTP 400 (surface ${index})`, async () => {
      await expect(
        surfaces(() => new Response(null, { status: 400 }))[index]?.call(),
      ).rejects.toBeInstanceOf(CircleHttpError);
    });

    it.each([
      ["plain failure", "text/plain"],
      ["{broken", "application/json"],
    ])(`preserves error text %s (surface ${index})`, async (body, contentType) => {
      await expect(
        surfaces(
          () => new Response(body, { status: 400, headers: { "content-type": contentType } }),
        )[index]?.call(),
      ).rejects.toMatchObject({ name: "CircleHttpError", status: 400, bodyText: body });
    });

    it(`normalizes malformed successful JSON (surface ${index})`, async () => {
      await expect(
        surfaces(
          () => new Response("{broken", { headers: { "content-type": "application/json" } }),
        )[index]?.call(),
      ).rejects.toBeInstanceOf(CircleNetworkError);
    });
  }

  it("normalizes iterator HTTP failures", async () => {
    const headless = createHeadless({
      token: "synthetic-token",
      retries: { retries: 0 },
      fetcher: async () => Response.json({ message: "no access" }, { status: 400 }),
    });
    const iterator = headless.iter.chatRoomMessages("room / one")[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toBeInstanceOf(CircleHttpError);
  });

  it.each([
    null,
    "",
    "false",
    "{broken",
  ])("rejects iterator HTTP failures with body %j", async (body) => {
    const headless = createHeadless({
      baseUrl,
      token: "synthetic",
      retries: { retries: 0 },
      fetcher: async () => new Response(body, { status: 400 }),
    });
    const iterator = headless.iter.chatRoomMessages("room / one")[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 400,
      method: "GET",
      url: `${baseUrl}/api/headless/v1/messages/room%20%2F%20one/chat_room_messages?previous_per_page=20`,
    });
  });

  it("keeps iterator HTTP context after yielding an earlier page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ records: [{ id: 7 }], has_previous_page: true, first_id: 7 }),
      )
      .mockResolvedValueOnce(Response.json({ message: "later failure" }, { status: 400 }));
    const headless = createHeadless({ baseUrl, token: "synthetic", fetcher });
    const iterator = headless.iter.chatRoomMessages("room")[Symbol.asyncIterator]();
    expect((await iterator.next()).value).toMatchObject({ id: 7 });
    await expect(iterator.next()).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 400,
      parsedJson: { message: "later failure" },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("raw and resource contracts", () => {
  for (const index of [0, 1, 2] as const) {
    it.each([
      false,
      null,
      0,
      "",
      "failure",
      { data: { message: "keep wrapper" } },
    ])(`retains raw JSON failure payload %j and throws by status (surface ${index})`, async (body) => {
      const surface = surfaces(() => Response.json(body, { status: 400 }))[index];
      const raw = await surface.raw();
      expect(raw.response.ok).toBe(false);
      expect(raw.error).toEqual(body);
      expect("data" in raw).toBe(false);
      await expect(surface.call()).rejects.toMatchObject({
        status: 400,
        parsedJson: body,
        bodyText: JSON.stringify(body),
        method: surface.method,
        url: `${baseUrl}${surface.path}`,
      });
    });

    it.each([
      204, 205, 200,
    ])(`returns undefined for empty %i (surface ${index})`, async (status) => {
      const surface = surfaces(
        () => new Response(null, { status, headers: { "content-type": "application/json" } }),
      )[index];
      await expect(surface.call()).resolves.toBeUndefined();
      const raw = await surface.raw();
      expect(raw.response.ok).toBe(true);
      expect(raw.data).toBeUndefined();
      expect("error" in raw).toBe(false);
    });

    it(`carries request ID, resolved URL and decoding cause (surface ${index})`, async () => {
      const surface = surfaces(
        () =>
          new Response("{broken", {
            headers: {
              "content-type": "application/problem+json",
              "x-request-id": "request-1",
              "x-correlation-id": "correlation-1",
            },
          }),
      )[index];
      for (const call of [surface.call, surface.raw]) {
        const error = await call().catch((cause: unknown) => cause);
        expect(error).toBeInstanceOf(CircleNetworkError);
        expect(error).toMatchObject({
          status: 200,
          url: `${baseUrl}${surface.path}`,
          method: surface.method,
          requestId: "request-1",
          bodyText: "{broken",
          cause: expect.any(SyntaxError),
        });
      }
    });

    it.each([
      "plain failure",
      "{broken",
      "false",
      "null",
      "",
    ])(`keeps raw HTTP error results for %j (surface ${index})`, async (bodyText) => {
      const surface = surfaces(
        () =>
          new Response(bodyText, {
            status: 400,
            headers: { "content-type": "application/json", "x-correlation-id": "correlation-1" },
          }),
      )[index];
      const result = await surface.raw();
      expect(result.response.status).toBe(400);
      expect("error" in result).toBe(true);
      expect(result.error).toEqual(
        bodyText === "false" ? false : bodyText === "null" ? null : bodyText,
      );
      await expect(surface.call()).rejects.toMatchObject({ bodyText, requestId: "correlation-1" });
    });

    it(`preserves JSON success primitives (surface ${index})`, async () => {
      for (const body of [false, null, 0, "", "ok"]) {
        const surface = surfaces(() => Response.json(body))[index];
        await expect(surface.call()).resolves.toEqual(body);
        expect((await surface.raw()).data).toEqual(body);
      }
    });
  }

  it("retains the raw parseAs and path-based typings", async () => {
    const headless = createHeadless({
      token: "synthetic",
      fetcher: async () => new Response("plain text"),
    });
    const result = await headless.raw["/api/headless/v1/spaces"].GET({ parseAs: "text" });
    expectTypeOf(result.data).toEqualTypeOf<string | undefined>();
    expectTypeOf(result.response).toEqualTypeOf<Response>();
    expect(result.data).toBe("plain text");
    const stream = await headless.raw.GET("/api/headless/v1/spaces", { parseAs: "stream" });
    expectTypeOf(stream.data).toEqualTypeOf<Response["body"] | undefined>();
    expect(stream.data).toBe(stream.response.body);
    await stream.data?.cancel();
  });

  it("retains native reader consumption and clone behavior with SDK errors", async () => {
    const headless = createHeadless({
      token: "synthetic",
      fetcher: async () => Response.json({ records: [] }),
    });
    const { response } = await headless.raw.GET("/api/headless/v1/spaces", { parseAs: "stream" });
    const copy = response.clone();
    expect(await response.json()).toEqual({ records: [] });
    expect(await copy.json()).toEqual({ records: [] });
    await expect(response.json()).rejects.toBeInstanceOf(CircleNetworkError);
    expect(() => response.clone()).toThrow(CircleNetworkError);
  });

  it.each([200, 400])("normalizes already consumed fetch responses at HTTP %i", async (status) => {
    const response = new Response("consumed", { status });
    await response.text();
    const surface = surfaces(() => response)[0];
    await expect(surface.call()).rejects.toMatchObject({
      name: status === 400 ? "CircleHttpError" : "CircleNetworkError",
      status,
      method: "GET",
      url: `${baseUrl}/api/admin/v2/spaces`,
      cause: expect.any(TypeError),
    });
  });

  it.each([200, 400])("normalizes body transport failures at HTTP %i", async (status) => {
    const cause = new TypeError("body connection lost");
    const fetcher = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(cause);
            },
          }),
          { status },
        ),
    );
    const headless = createHeadless({ token: "synthetic", fetcher, retries: { retries: 2 } });
    await expect(headless.spaces.list()).rejects.toMatchObject({
      name: status === 400 ? "CircleHttpError" : "CircleNetworkError",
      cause,
      status,
      url: "https://app.circle.so/api/headless/v1/spaces",
      method: "GET",
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("normalizes body decoding errors in other parseAs modes", async () => {
    const headless = createHeadless({
      token: "synthetic",
      fetcher: async () => new Response("not form data"),
    });
    const { response } = await headless.raw.GET("/api/headless/v1/spaces", { parseAs: "stream" });
    await expect(response.formData()).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: expect.any(TypeError),
      status: 200,
    });
  });

  it("normalizes request preparation and middleware errors without changing causes", async () => {
    const headless = createHeadless({ token: "synthetic" });
    const cause = new Error("synthetic hook failure");
    headless.raw.use({
      onRequest() {
        throw cause;
      },
    });
    await expect(headless.raw.GET("/api/headless/v1/spaces")).rejects.toMatchObject({
      name: "CircleConfigError",
      cause,
    });
    expect(() => headless.raw.use({} as Parameters<typeof headless.raw.use>[0])).toThrow(
      CircleConfigError,
    );
  });

  it("normalizes per-call raw fetch failures", async () => {
    const cause = new TypeError("fetch connection lost");
    const headless = createHeadless({ token: "synthetic" });
    await expect(
      headless.raw.GET("/api/headless/v1/spaces", {
        fetch: async () => {
          throw cause;
        },
      }),
    ).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
      method: "GET",
      url: "https://app.circle.so/api/headless/v1/spaces",
    });
  });

  it("normalizes consumed responses returned by middleware", async () => {
    const headless = createHeadless({ token: "synthetic", fetcher: async () => Response.json({}) });
    headless.raw.use({
      async onResponse({ response }) {
        await response.text();
      },
    });
    await expect(headless.raw.GET("/api/headless/v1/spaces")).rejects.toMatchObject({
      name: "CircleNetworkError",
      status: 200,
      cause: expect.any(TypeError),
    });
  });

  it("normalizes middleware short circuits and preserves ejection", async () => {
    const fetcher = vi.fn(async () => Response.json([]));
    const headless = createHeadless({ token: "synthetic", fetcher });
    const cached = { onRequest: () => new Response("broken") };
    headless.raw.use(cached);
    await expect(headless.raw.GET("/api/headless/v1/spaces")).rejects.toMatchObject({
      name: "CircleNetworkError",
      status: 200,
      cause: expect.any(SyntaxError),
    });
    expect(fetcher).not.toHaveBeenCalled();
    headless.raw.eject(cached);
    expect((await headless.raw.GET("/api/headless/v1/spaces")).data).toEqual([]);
    await expect(
      headless.raw.GET("/api/headless/v1/spaces", { middleware: [cached] }),
    ).rejects.toBeInstanceOf(CircleNetworkError);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    200, 400,
  ])("normalizes malformed refresh bodies at status %i with refresh context", async (status) => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      return request.url.endsWith("/access_token/refresh")
        ? new Response("{broken refresh", { status, headers: { "x-request-id": "refresh-1" } })
        : Response.json({ message: "expired" }, { status: 401 });
    });
    const headless = createHeadless({
      baseUrl,
      token: "synthetic",
      refreshToken: "synthetic-refresh",
      autoRefresh: true,
      authToken: "synthetic-application",
      fetcher,
      retries: { retries: 0 },
    });
    await expect(headless.spaces.list()).rejects.toMatchObject({
      name: "CircleHttpError",
      status,
      url: `${baseUrl}/api/v1/headless/access_token/refresh`,
      method: "PATCH",
      requestId: "refresh-1",
      bodyText: "{broken refresh",
      cause: expect.any(SyntaxError),
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not hide HTTP failures skipped for a zero content length", async () => {
    const admin = createAdmin({
      token: "synthetic",
      fetcher: async () => new Response(null, { status: 400, headers: { "content-length": "0" } }),
    });
    const raw = await admin.raw.GET("/api/admin/v2/spaces");
    expect(raw.error).toBeUndefined();
    expect(raw.response.ok).toBe(false);
    await expect(admin.spaces.list()).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 400,
    });
  });

  it("preserves final response URLs including clones", async () => {
    const headless = createHeadless({
      token: "synthetic",
      fetcher: async () => {
        const response = new Response("broken");
        Object.defineProperty(response, "url", { value: "https://redirect.example.test/final" });
        return response;
      },
    });
    const raw = await headless.raw.GET("/api/headless/v1/spaces", { parseAs: "stream" });
    const copy = raw.response.clone();
    await expect(copy.json()).rejects.toMatchObject({
      name: "CircleNetworkError",
      url: "https://redirect.example.test/final",
      cause: expect.any(SyntaxError),
    });
    await raw.response.body?.cancel();
  });
});

describe("shared generic and smart fetch parsing", () => {
  it("normalizes request serialization errors with their original cause", async () => {
    const body: Record<string, unknown> = {};
    body.self = body;
    const client = createClient({ baseUrl });
    await expect(client.post("/example", { body })).rejects.toMatchObject({
      name: "CircleConfigError",
      cause: expect.any(TypeError),
    });
    const fetcher = vi.fn();
    const smartFetch = createSmartFetch({ baseUrl, fetcher });
    await expect(smartFetch("https://[invalid")).rejects.toBeInstanceOf(CircleConfigError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    "Application/JSON; charset=utf-8",
    "application/problem+json",
    "application/vnd.circle+json",
  ])("selects JSON for %s", async (contentType) => {
    const client = createClient({
      baseUrl,
      fetcher: async () => new Response("false", { headers: { "content-type": contentType } }),
    });
    await expect(client.get("/example")).resolves.toBe(false);
  });
  it("returns text, empty success, and normalized JSON errors", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("text"))
      .mockResolvedValueOnce(new Response(""))
      .mockResolvedValueOnce(
        new Response("broken", { headers: { "content-type": "application/json" } }),
      );
    const client = createClient({ baseUrl, fetcher });
    await expect(client.get("/example")).resolves.toBe("text");
    await expect(client.get("/example")).resolves.toBeUndefined();
    await expect(client.get("/example")).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: expect.any(SyntaxError),
      bodyText: "broken",
      status: 200,
    });
  });
  it("preserves HTTP status and exact body-read cause in smart fetch", async () => {
    const cause = new TypeError("synthetic read failure");
    const smartFetch = createSmartFetch({
      baseUrl,
      retries: { retries: 0 },
      fetcher: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(cause);
            },
          }),
          { status: 400 },
        ),
    });
    await expect(smartFetch("/example")).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 400,
      cause,
    });
  });
});
