import createClient from "openapi-fetch";
import { describe, expect, it } from "vitest";
import { createAdmin } from "./adminApi";
import { createAdminRequester } from "./adminApi/request";
import { createAuth } from "./authApi";
import { CircleConfigError } from "./core/errors";
import { HEADER_CONTENT_TYPE } from "./core/headers";
import { createHeadless } from "./headlessApi";
import { buildRequestInit } from "./requestInit";

function capture() {
  const requests: { request: Request; body: string }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push({ request, body: await request.text() });
    return new Response(null, { status: 204 });
  };
  return { fetcher, requests };
}

describe("schema-based request serialization", () => {
  it("puts segment duplicate title in query with an encoded ID and no body", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    await admin.communitySegments.duplicate("id/with ?#%", { title: "Copy & more" });
    expect(requests[0]?.request.url).toBe(
      "https://app.circle.so/api/admin/v2/community_segments/id%2Fwith%20%3F%23%25/duplicate?title=Copy%20%26%20more",
    );
    expect(requests[0]?.body).toBe("");
    expect(requests[0]?.request.headers.has(HEADER_CONTENT_TYPE)).toBe(false);
  });

  it("sends the required empty JSON replacement body", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    await admin.accessGroups.content.update(1, {});
    expect(requests[0]?.body).toBe("{}");
    expect(requests[0]?.request.headers.get(HEADER_CONTENT_TYPE)).toBe("application/json");
  });

  it("matches raw and facade query-only POST and required empty PATCH requests", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    await admin.communitySegments.duplicate("segment", { title: "Copy" });
    await admin.raw.POST("/api/admin/v2/community_segments/{id}/duplicate", {
      params: { path: { id: "segment" }, query: { title: "Copy" } },
    });
    await admin.accessGroups.content.update(1, {});
    await admin.raw.PATCH("/api/admin/v2/access_groups/{access_group_id}/content", {
      params: { path: { access_group_id: 1 } },
      body: {},
    });
    for (const [first, second] of [
      [0, 1],
      [2, 3],
    ] as const) {
      expect(requests[first]?.request.url).toBe(requests[second]?.request.url);
      expect(requests[first]?.body).toBe(requests[second]?.body);
    }
  });

  it("routes both export POST filters to query using the shared requester", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    const requester = createAdminRequester(admin.raw);
    await requester.post("/api/admin/v2/community_member_charges/export", {
      currency: "usd",
      amount_gte: 0,
    });
    await requester.post("/api/admin/v2/community_member_subscriptions/export", {
      scheduled_to_cancel: false,
    });
    expect(new URL(requests[0]?.request.url ?? "").searchParams.get("amount_gte")).toBe("0");
    expect(new URL(requests[1]?.request.url ?? "").searchParams.get("scheduled_to_cancel")).toBe(
      "false",
    );
    expect(requests.map((entry) => entry.body)).toEqual(["", ""]);
  });

  it("sends all three notification PUT operations as query and matches raw", async () => {
    const { fetcher, requests } = capture();
    const headless = createHeadless({ accessToken: "test-member", fetcher });
    await headless.notificationPreferences.update("in_app", {
      type: "post_comment",
      enabled: false,
    });
    await headless.raw.PUT("/api/headless/v1/notification_preferences/{medium}", {
      params: { path: { medium: "in_app" }, query: { type: "post_comment", enabled: false } },
    });
    await headless.notificationPreferences.updateForSpaces("in_app", { choice: "all" });
    await headless.notificationPreferences.updateForSpace("in_app", 2, { choice: "never" });
    expect(requests[0]?.request.url).toBe(requests[1]?.request.url);
    expect(new URL(requests[0]?.request.url ?? "").searchParams.get("enabled")).toBe("false");
    expect(requests[2]?.request.url).toBe(
      "https://app.circle.so/api/headless/v1/notification_preferences/in_app/spaces?choice=all",
    );
    expect(requests[3]?.request.url).toBe(
      "https://app.circle.so/api/headless/v1/notification_preferences/in_app/spaces/2?choice=never",
    );
    for (const entry of requests) {
      expect(entry.body).toBe("");
      expect(entry.request.method).toBe("PUT");
      expect(entry.request.headers.has(HEADER_CONTENT_TYPE)).toBe(false);
    }
  });

  it("keeps both DELETE JSON contracts separate from query-based DELETE", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    const headless = createHeadless({ accessToken: "test-member", fetcher });
    await admin.events.attendees.delete({ member_email: "member@example.test", event_id: "1" });
    await admin.raw.DELETE("/api/admin/v2/event_attendees", {
      body: { member_email: "member@example.test", event_id: "1" },
    });
    await headless.chatRooms.reactions.delete({ chat_room_message: 1, unicode: "1f923" });
    await headless.raw.DELETE("/api/headless/v1/reactions", {
      body: { chat_room_message: 1, unicode: "1f923" },
    });
    await admin.spaceMembers.remove({ email: "member@example.test", space_id: 2 });
    expect(requests[0]?.body).toBe(requests[1]?.body);
    expect(requests[2]?.body).toBe(requests[3]?.body);
    for (const entry of requests.slice(0, 4)) {
      expect(new URL(entry.request.url).search).toBe("");
      expect(entry.request.headers.get(HEADER_CONTENT_TYPE)).toBe("application/json");
    }
    expect(new URL(requests[4]?.request.url ?? "").searchParams.get("space_id")).toBe("2");
    expect(requests[4]?.body).toBe("");
  });

  it.each<{ headers: HeadersInit }>([
    { headers: { "x-test": "custom" } },
    { headers: [["x-test", "custom"]] },
    { headers: new Headers({ "x-test": "custom" }) },
  ])("forwards metadata across all surfaces without serializing it: %j", async ({ headers }) => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    const headless = createHeadless({ accessToken: "test-member", fetcher });
    const auth = createAuth({ token: "test-app", fetcher });
    const meta = {
      headers,
      signal: new AbortController().signal,
      credentials: "include",
    } satisfies RequestInit;
    await admin.accessGroups.list({ page: 2, ...meta });
    await headless.bookmarks.create({ bookmark_type: "post", record_id: 1, ...meta });
    await auth.accessToken.refresh({ refresh_token: "test-refresh", ...meta });
    await admin.raw.GET("/api/admin/v2/access_groups", { params: { query: { page: 2 } }, ...meta });
    await headless.raw.POST("/api/headless/v1/bookmarks", {
      body: { bookmark_type: "post", record_id: 1 },
      ...meta,
    });
    await auth.raw.PATCH("/api/v1/headless/access_token/refresh", {
      body: { refresh_token: "test-refresh" },
      ...meta,
    });
    expect(new URL(requests[0]?.request.url ?? "").search).toBe("?page=2");
    expect(requests[0]?.body).toBe("");
    expect(JSON.parse(requests[1]?.body ?? "")).toEqual({ bookmark_type: "post", record_id: 1 });
    expect(JSON.parse(requests[2]?.body ?? "")).toEqual({ refresh_token: "test-refresh" });
    for (const [first, second] of [
      [0, 3],
      [1, 4],
      [2, 5],
    ] as const) {
      expect(requests[first]?.request.url).toBe(requests[second]?.request.url);
      expect(requests[first]?.body).toBe(requests[second]?.body);
    }
    for (const entry of requests) {
      expect(entry.request.credentials).toBe("include");
      expect(entry.request.headers.get("x-test")).toBe("custom");
      expect(entry.request.signal.aborted).toBe(false);
    }
  });

  it("preserves flat body/query fields named body and query", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    const headless = createHeadless({ accessToken: "test-member", fetcher });
    await admin.comments.create({ post_id: 1, body: "Text & more" });
    await admin.search.advanced({ query: "search & more" });
    await headless.posts.create(1, { body: "Text" });
    expect(JSON.parse(requests[0]?.body ?? "")).toEqual({ post_id: 1, body: "Text & more" });
    expect(new URL(requests[1]?.request.url ?? "").searchParams.get("query")).toBe("search & more");
    expect(JSON.parse(requests[2]?.body ?? "")).toEqual({ body: "Text" });
  });

  it("preserves JSON nulls, empty arrays and nested objects and omits absent fields", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    await admin.invitationLinks.update(1, {
      redirect_space_id: null,
      paywall: null,
      access_group_ids: [],
    });
    await admin.profileFields.create({
      profile_field: {
        key: "team",
        label: "Team",
        field_type: "text",
        pages_attributes: [{ name: "signup", visible: false }],
      },
    });
    expect(JSON.parse(requests[0]?.body ?? "")).toEqual({
      redirect_space_id: null,
      paywall: null,
      access_group_ids: [],
    });
    expect(JSON.parse(requests[1]?.body ?? "")).toEqual({
      profile_field: {
        key: "team",
        label: "Team",
        field_type: "text",
        pages_attributes: [{ name: "signup", visible: false }],
      },
    });
  });

  it("serializes arrays and shallow deepObject filters identically in raw and facade calls", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    const headless = createHeadless({ accessToken: "test-member", fetcher });
    const filter = { query: "", filters: { author_name: "A & B", status: "upcoming" } } as const;
    await admin.search.advanced(filter);
    await admin.raw.GET("/api/admin/v2/advanced_search", { params: { query: filter } });
    await headless.communityMembers.list({ search_after: [1, "cursor & more"] });
    await headless.posts.list(1, { topics: [1, 2] });
    await admin.accessGroups.list({ ids: [] });
    expect(requests[0]?.request.url).toBe(requests[1]?.request.url);
    const query = new URL(requests[0]?.request.url ?? "").searchParams;
    expect(query.get("query")).toBe("");
    expect(query.get("filters[author_name]")).toBe("A & B");
    expect(query.get("filters[status]")).toBe("upcoming");
    expect(new URL(requests[2]?.request.url ?? "").searchParams.getAll("search_after")).toEqual([
      "1",
      "cursor & more",
    ]);
    expect(new URL(requests[3]?.request.url ?? "").searchParams.getAll("topics")).toEqual([
      "1",
      "2",
    ]);
    expect(new URL(requests[4]?.request.url ?? "").search).toBe("");
  });

  it("fails nested deepObject filters with an SDK error instead of guessing an encoding", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    await expect(
      admin.search.advanced({ query: "search", filters: { space_ids: ["1", "2"] } }),
    ).rejects.toMatchObject({ name: "CircleConfigError", cause: expect.any(Error) });
    expect(requests).toHaveLength(0);
  });

  it("does not add JSON to optional absent bodies or bodyless actions", async () => {
    const { fetcher, requests } = capture();
    const headless = createHeadless({ accessToken: "test-member", fetcher });
    await headless.posts.likes.create("post");
    await headless.cookies.create({ credentials: "include" });
    expect(requests.map((entry) => entry.body)).toEqual(["", ""]);
  });

  it("rejects unknown fields from an untyped caller before fetch", async () => {
    const { fetcher, requests } = capture();
    const admin = createAdmin({ token: "test-admin", fetcher });
    const options = { page: 1, misspelled_field: "test" };
    await expect(admin.accessGroups.list(options)).rejects.toBeInstanceOf(CircleConfigError);
    expect(requests).toHaveLength(0);
  });
});

describe("mixed query/body fixture contracts", () => {
  const contracts = {
    "post /fixture": {
      query: ["filter", "shared"],
      body: ["title", "shared", "credentials"],
      bodyRequired: true,
    },
  };

  it("splits unique fields and explicit overlaps, preserving metadata and null/undefined", () => {
    const headers = new Headers({ "x-test": "custom" });
    const signal = new AbortController().signal;
    expect(
      buildRequestInit(contracts, "/fixture", "post", {
        filter: false,
        title: null,
        headers,
        signal,
        credentials: "omit",
        path: { id: "1" },
        queryParams: { shared: "query" },
        bodyParams: { shared: 0, credentials: "schema-value" },
      }),
    ).toEqual({
      headers,
      signal,
      credentials: "omit",
      params: { path: { id: "1" }, query: { filter: false, shared: "query" } },
      body: { title: null, shared: 0, credentials: "schema-value" },
    });
    expect(
      buildRequestInit(contracts, "/fixture", "post", { title: undefined, filter: undefined }),
    ).toEqual({ body: {} });
  });

  it("places distinct query/body values on the wire through openapi-fetch", async () => {
    type FixtureOp = {
      parameters: { query: { filter?: boolean; shared: string } };
      requestBody: {
        content: {
          "application/json": { title: string | null; shared: number; credentials?: string };
        };
      };
      responses: { 204: { content?: never } };
    };
    const { fetcher, requests } = capture();
    const raw = createClient<{ "/fixture": { post: FixtureOp } }>({
      baseUrl: "https://fixture.test",
      fetch: fetcher,
    });
    const init = buildRequestInit<FixtureOp>(contracts, "/fixture", "post", {
      filter: false,
      title: null,
      credentials: "omit",
      queryParams: { shared: "query & value" },
      bodyParams: { shared: 0, credentials: "body-value" },
    });
    await raw.POST("/fixture", init);
    expect(new URL(requests[0]?.request.url ?? "").searchParams.get("shared")).toBe(
      "query & value",
    );
    expect(new URL(requests[0]?.request.url ?? "").searchParams.get("filter")).toBe("false");
    expect(JSON.parse(requests[0]?.body ?? "")).toEqual({
      title: null,
      shared: 0,
      credentials: "body-value",
    });
    expect(requests[0]?.request.credentials).toBe("omit");
  });

  it.each([
    { shared: "ambiguous" },
    { queryParams: { title: "wrong-side" } },
    { bodyParams: { title: "unique-fields-stay-flat" } },
    { queryParams: null },
    { bodyParams: [] },
  ])("rejects ambiguous or invalid scopes without guessing: %j", (options) => {
    expect(() => buildRequestInit(contracts, "/fixture", "post", options)).toThrow(
      CircleConfigError,
    );
  });

  it("preserves an original request preparation cause", () => {
    const cause = new Error("caller getter failed");
    const options = {
      get filter() {
        throw cause;
      },
    };
    expect(() => buildRequestInit(contracts, "/fixture", "post", options)).toThrow(
      expect.objectContaining({ name: "CircleConfigError", cause }),
    );
  });
});
