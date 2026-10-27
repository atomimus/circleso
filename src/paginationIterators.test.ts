import { readFileSync } from "node:fs";
import { parseYaml } from "@redocly/openapi-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdmin } from "./admin";
import { CircleConfigError } from "./core/errors";
import { createHeadless } from "./headless";

// Independent route/argument matrix; every documented paged operation must be represented.
const offsetCases = [
  [
    "admin",
    "accessGroupMembers",
    "/api/admin/v2/access_groups/{access_group_id}/community_members",
    [42],
    {},
    true,
  ],
  ["admin", "accessGroups", "/api/admin/v2/access_groups", [], {}, true],
  ["admin", "advancedSearch", "/api/admin/v2/advanced_search", [], { query: "synthetic" }, true],
  ["admin", "comments", "/api/admin/v2/comments", [], {}, true],
  ["admin", "communityMemberCharges", "/api/admin/v2/community_member_charges", [], {}, true],
  ["admin", "communityMemberSpaces", "/api/admin/v2/community_member_spaces", [], {}, true],
  [
    "admin",
    "communityMemberSubscriptions",
    "/api/admin/v2/community_member_subscriptions",
    [],
    {},
    true,
  ],
  [
    "admin",
    "communityMemberAccessGroups",
    "/api/admin/v2/community_members/{community_member_id}/access_groups",
    [42],
    {},
    true,
  ],
  ["admin", "communityMembers", "/api/admin/v2/community_members", [], {}, true],
  ["admin", "communitySegments", "/api/admin/v2/community_segments", [], {}, true],
  [
    "admin",
    "contactNotes",
    "/api/admin/v2/contacts/{contact_id}/contact_notes",
    ["synthetic / id"],
    {},
    false,
  ],
  ["admin", "courseLessons", "/api/admin/v2/course_lessons", [], {}, true],
  ["admin", "courseSections", "/api/admin/v2/course_sections", [], {}, true],
  ["admin", "eventAttendees", "/api/admin/v2/event_attendees", [], { event_id: "42" }, true],
  ["admin", "events", "/api/admin/v2/events", [], {}, true],
  ["admin", "filterKitControls", "/api/admin/v2/filter_kit_controls", [], {}, true],
  ["admin", "flaggedContents", "/api/admin/v2/flagged_contents", [], {}, true],
  ["admin", "forms", "/api/admin/v2/forms", [], {}, true],
  ["admin", "formSubmissions", "/api/admin/v2/forms/{form_id}/submissions", [42], {}, true],
  ["admin", "imagePosts", "/api/admin/v2/spaces/{space_id}/images/posts", [42], {}, true],
  ["admin", "invitationLinks", "/api/admin/v2/invitation_links", [], {}, true],
  ["admin", "liveRooms", "/api/admin/v2/live/rooms", [], {}, true],
  ["admin", "memberTags", "/api/admin/v2/member_tags", [], {}, true],
  ["admin", "paywallAffiliates", "/api/admin/v2/paywall_affiliates", [], {}, true],
  ["admin", "paywalls", "/api/admin/v2/paywalls/search", [], {}, true],
  ["admin", "posts", "/api/admin/v2/posts", [], {}, true],
  ["admin", "profileFields", "/api/admin/v2/profile_fields", [], {}, true],
  [
    "admin",
    "spaceGroupMembers",
    "/api/admin/v2/space_group_members",
    [],
    { space_group_id: 42 },
    true,
  ],
  ["admin", "spaceGroups", "/api/admin/v2/space_groups", [], {}, true],
  ["admin", "spaceMembers", "/api/admin/v2/space_members", [], { space_id: 42 }, true],
  ["admin", "spaces", "/api/admin/v2/spaces", [], {}, true],
  ["admin", "taggedMembers", "/api/admin/v2/tagged_members", [], {}, true],
  ["admin", "topics", "/api/admin/v2/topics", [], {}, true],
  ["admin", "workflows", "/api/admin/v2/workflows", [], {}, true],
  [
    "headless",
    "advancedSearch",
    "/api/headless/v1/advanced_search",
    [],
    { query: "synthetic" },
    true,
  ],
  ["headless", "bookmarks", "/api/headless/v1/bookmarks", [], {}, true],
  [
    "headless",
    "chatRoomParticipants",
    "/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants",
    ["synthetic / id"],
    {},
    true,
  ],
  ["headless", "chatRooms", "/api/headless/v1/messages", [], {}, true],
  ["headless", "chatThreads", "/api/headless/v1/chat_threads", [], {}, true],
  ["headless", "postComments", "/api/headless/v1/posts/{post_id}/comments", [42], {}, true],
  ["headless", "events", "/api/headless/v1/community_events", [], {}, true],
  [
    "headless",
    "memberComments",
    "/api/headless/v1/community_members/{community_member_id}/comments",
    [42],
    {},
    true,
  ],
  [
    "headless",
    "memberPosts",
    "/api/headless/v1/community_members/{community_member_id}/posts",
    [42],
    {},
    true,
  ],
  [
    "headless",
    "memberSpaces",
    "/api/headless/v1/community_members/{community_member_id}/spaces",
    [42],
    {},
    true,
  ],
  [
    "headless",
    "lessonFiles",
    "/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files",
    [42, 42],
    {},
    true,
  ],
  [
    "headless",
    "quizAttempts",
    "/api/headless/v1/courses/{course_id}/quiz_attempts",
    [42],
    {},
    true,
  ],
  ["headless", "courseTopics", "/api/headless/v1/course_topics", [], {}, true],
  [
    "headless",
    "eventAttendees",
    "/api/headless/v1/events/{event_id}/event_attendees",
    [42],
    {},
    true,
  ],
  ["headless", "home", "/api/headless/v1/home", [], {}, true],
  ["headless", "notifications", "/api/headless/v1/notifications", [], {}, true],
  [
    "headless",
    "pageProfileFields",
    "/api/headless/v1/page_profile_fields",
    [],
    { page_name: "signup" },
    true,
  ],
  ["headless", "posts", "/api/headless/v1/spaces/{space_id}/posts", [42], {}, true],
  [
    "headless",
    "recurringEvents",
    "/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events",
    [42, 42],
    {},
    true,
  ],
  ["headless", "commentReplies", "/api/headless/v1/comments/{comment_id}/replies", [42], {}, true],
  ["headless", "search", "/api/headless/v1/search", [], { search_text: "synthetic" }, true],
  ["headless", "spaceBookmarks", "/api/headless/v1/spaces/{space_id}/bookmarks", [42], {}, true],
  ["headless", "spaceTopics", "/api/headless/v1/spaces/{space_id}/topics", [42], {}, true],
  ["headless", "commentLikes", "/api/headless/v1/comments/{comment_id}/user_likes", [42], {}, true],
  [
    "headless",
    "postLikes",
    "/api/headless/v1/posts/{post_id}/user_likes",
    ["synthetic / id"],
    {},
    true,
  ],
] as const;

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of items) result.push(item);
  return result;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("typed offset adapters at the public fetch boundary", () => {
  for (const [surface, name, route, ids, required, hasPerPage] of offsetCases) {
    it(`${surface}.iter.${name} preserves route, inputs, metadata and bounded progression`, async () => {
      const requests: Request[] = [];
      const fetcher = vi.fn(async (input: RequestInfo | URL) => {
        requests.push(input as Request);
        return Response.json({
          records: [{ id: requests.length }],
          has_next_page: requests.length < 2,
        });
      });
      const config = { token: "synthetic", fetcher };
      const api = surface === "admin" ? createAdmin(config) : createHeadless(config);
      const iter = api.iter as unknown as Record<
        string,
        (...args: unknown[]) => AsyncIterable<{ id: number }>
      >;
      const controller = new AbortController();
      const invoke = iter[name];
      expect(invoke).toBeTypeOf("function");
      const items = invoke?.(...ids, {
        ...required,
        page: 3,
        ...(hasPerPage ? { per_page: 2 } : {}),
        maxPages: 2,
        maxItems: 2,
        signal: controller.signal,
        headers: { "x-synthetic": "metadata" },
      });
      expect(fetcher).not.toHaveBeenCalled();
      expect(await collect(items as AsyncIterable<{ id: number }>)).toEqual([{ id: 1 }, { id: 2 }]);
      expect(fetcher).toHaveBeenCalledTimes(2);
      for (const [index, request] of requests.entries()) {
        let idIndex = 0;
        const path = route.replace(/\{[^}]+\}/g, () => encodeURIComponent(String(ids[idIndex++])));
        const url = new URL(request.url);
        expect(url.pathname).toBe(path);
        expect(request.method).toBe("GET");
        expect(url.searchParams.get("page")).toBe(String(3 + index));
        expect(url.searchParams.get("per_page")).toBe(hasPerPage ? "2" : null);
        for (const [key, value] of Object.entries(required))
          expect(url.searchParams.get(key)).toBe(String(value));
        expect(url.searchParams.has("maxPages")).toBe(false);
        expect(url.searchParams.has("maxItems")).toBe(false);
        expect(request.headers.get("x-synthetic")).toBe("metadata");
      }
    });
  }
  it("inventory covers every operation with documented paging parameters", () => {
    type Op = {
      parameters?: { name: string }[];
      requestBody?: {
        content?: Record<
          string,
          { schema: { $ref?: string; properties?: Record<string, unknown> } }
        >;
      };
    };
    const actual = offsetCases.map(([surface, , path]) => `${surface} get ${path}`);
    actual.push(
      "headless get /api/headless/v1/community_members",
      "headless post /api/headless/v1/search/community_members",
      "headless get /api/headless/v1/messages/{chat_room_uuid}/chat_room_messages",
    );
    const expected: string[] = [];
    for (const [surface, file] of [
      ["admin", "admin-v2"],
      ["headless", "headless-client-v1"],
    ]) {
      const doc = parseYaml(readFileSync(`api/specs/${file}.yaml`, "utf8")) as {
        paths: Record<string, Record<string, Op>>;
        components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
      };
      for (const [path, methods] of Object.entries(doc.paths))
        for (const [method, op] of Object.entries(methods)) {
          const schema = op.requestBody?.content?.["application/json"]?.schema;
          const body = schema?.$ref
            ? doc.components.schemas[schema.$ref.split("/").at(-1) ?? ""]
            : schema;
          if (
            op.parameters?.some((p) =>
              ["page", "previous_per_page", "search_after"].includes(p.name),
            ) ||
            body?.properties?.search_after
          )
            expected.push(`${surface} ${method} ${path}`);
        }
    }
    expect(actual.sort()).toEqual(expected.sort());
    expect(actual).toHaveLength(62);
  });
  it("rejects Admin sizes above the documented maximum without truncation or a request", async () => {
    const fetcher = vi.fn();
    const admin = createAdmin({ token: "synthetic", fetcher });
    await expect(collect(admin.iter.posts({ per_page: 101 }))).rejects.toBeInstanceOf(
      CircleConfigError,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not impose an undocumented Member size maximum", async () => {
    const fetcher = vi.fn(async (request: RequestInfo | URL) => {
      expect(new URL((request as Request).url).searchParams.get("per_page")).toBe("101");
      return Response.json({ records: [{ id: 1 }], has_next_page: false });
    });
    await collect(
      createHeadless({ token: "synthetic", fetcher }).iter.bookmarks({ per_page: 101 }),
    );
  });
});

describe("cursor resource contracts", () => {
  it("GET directory preserves typed tuples, filters, zero limits and nullable records", async () => {
    const requests: Request[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      requests.push(input as Request);
      return Response.json(
        requests.length === 1
          ? { records: [null, { id: 1 }], next_search_after: ["001", 12] }
          : { records: [{ id: 2 }], next_search_after: null },
      );
    });
    const member = createHeadless({ token: "synthetic", fetcher });
    expect(await collect(member.iter.communityMembers({ maxItems: 0 }))).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
    const options = {
      space_id: 42,
      search_text: "synthetic filter",
      sort: "latest" as const,
      per_page: 2,
      search_after: ["initial", 1],
      maxItems: 3,
    };
    expect(await collect(member.iter.communityMembers(options))).toEqual([
      null,
      { id: 1 },
      { id: 2 },
    ]);
    const urls = requests.map((r) => new URL(r.url));
    expect(urls.map((u) => u.searchParams.getAll("search_after"))).toEqual([
      ["initial", "1"],
      ["001", "12"],
    ]);
    for (const url of urls) {
      expect(url.searchParams.get("space_id")).toBe("42");
      expect(url.searchParams.get("search_text")).toBe("synthetic filter");
      expect(url.searchParams.get("sort")).toBe("latest");
      expect(url.searchParams.has("page")).toBe(false);
    }
    expect(options.search_after).toEqual(["initial", 1]);
  });
  it("POST search snapshots filters and sends each cursor tuple unchanged in JSON", async () => {
    const bodies: unknown[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      bodies.push(await (input as Request).json());
      return Response.json(
        bodies.length === 1
          ? { records: [{ id: 1 }], next_search_after: ["001", "last"] }
          : { records: [{ id: 2 }], next_search_after: null },
      );
    });
    const member = createHeadless({ token: "synthetic", fetcher });
    const options = {
      filters: [{ key: "role", value: "Member" }],
      exclude_empty_name: false,
      order: "role" as const,
      status: "active" as const,
      per_page: 2,
      maxPages: 2,
    };
    const items = member.iter.communityMemberSearch(options)[Symbol.asyncIterator]();
    options.filters[0] = { key: "name", value: "Changed externally" };
    expect((await items.next()).value).toEqual({ id: 1 });
    expect((await items.next()).value).toEqual({ id: 2 });
    expect((await items.next()).done).toBe(true);
    expect(bodies).toEqual([
      {
        filters: [{ key: "role", value: "Member" }],
        exclude_empty_name: false,
        order: "role",
        status: "active",
        per_page: 2,
      },
      {
        filters: [{ key: "role", value: "Member" }],
        exclude_empty_name: false,
        order: "role",
        status: "active",
        per_page: 2,
        search_after: ["001", "last"],
      },
    ]);
  });
  it("reports the POST numeric cursor conflict after valid records without coercion or another request", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ records: [{ id: 1 }], next_search_after: [1, "x"] }),
    );
    const member = createHeadless({ token: "synthetic", fetcher });
    const items = member.iter.communityMemberSearch({})[Symbol.asyncIterator]();
    expect((await items.next()).value).toEqual({ id: 1 });
    await expect(items.next()).rejects.toMatchObject({
      name: "CircleNetworkError",
      message: expect.stringContaining("numeric cursor"),
      method: "POST",
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("public iterator lifetimes and errors", () => {
  it.each([
    "previous",
    "next",
  ] as const)("preserves raw.iter.chatRoomMessages and %s query parameters", async (direction) => {
    const requests: Request[] = [];
    const member = createHeadless({
      token: "synthetic",
      fetcher: async (input) => {
        requests.push(input as Request);
        return Response.json({
          records: [{ id: requests.length }],
          first_id: requests.length,
          last_id: requests.length,
          has_next_page: requests.length < 2,
          has_previous_page: requests.length < 2,
        });
      },
    });
    expect(member.iter).toBe(member.raw.iter);
    expect(
      await collect(
        member.raw.iter.chatRoomMessages("synthetic / room", { direction, perPage: 3 }),
      ),
    ).toEqual([{ id: 1 }, { id: 2 }]);
    for (const request of requests) {
      const url = new URL(request.url);
      expect(url.pathname).toContain("synthetic%20%2F%20room");
      expect(url.searchParams.get(`${direction}_per_page`)).toBe("3");
      expect(
        url.searchParams.has(`${direction === "previous" ? "next" : "previous"}_per_page`),
      ).toBe(false);
    }
  });
  it("aborts a pending page body, preserves caller cause, and cancels the stream", async () => {
    const cancel = vi.fn();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const fetcher = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"records":['));
              started();
            },
            cancel,
          }),
          { headers: { "content-type": "application/json" } },
        ),
    );
    const controller = new AbortController();
    const member = createHeadless({ token: "synthetic", fetcher, retries: { retries: 0 } });
    const pending = member.iter
      .bookmarks({ signal: controller.signal })
      [Symbol.asyncIterator]()
      .next();
    await ready;
    const assertion = expect(pending).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: "synthetic cancel",
    });
    controller.abort("synthetic cancel");
    await assertion;
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("early break consumes/releases only one page with no prefetch or live timers", async () => {
    vi.useFakeTimers();
    let closed = false;
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn(async (input) => {
      signals.push((input as Request).signal);
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('{"records":[{"id":1},{"id":2}],"has_next_page":true}'),
            );
            controller.close();
            closed = true;
          },
        }),
        { headers: { "content-type": "application/json" } },
      );
    });
    const controller = new AbortController();
    const member = createHeadless({ token: "synthetic", timeoutMs: 10, fetcher });
    for await (const item of member.iter.bookmarks({ signal: controller.signal })) {
      expect(item.id).toBe(1);
      break;
    }
    expect(closed).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    controller.abort("after release");
    expect(signals[0]?.aborted).toBe(false);
  });
  it("checks cancellation between buffered records and makes no further request", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ records: [{ id: 1 }, { id: 2 }], has_next_page: true }),
    );
    const controller = new AbortController();
    const items = createHeadless({ token: "synthetic", fetcher })
      .iter.bookmarks({ signal: controller.signal })
      [Symbol.asyncIterator]();
    expect((await items.next()).value).toEqual({ id: 1 });
    controller.abort({ reason: "synthetic" });
    await expect(items.next()).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: { reason: "synthetic" },
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each(["offset", "cursor", "chat"])("%s keeps the original network cause", async (style) => {
    const cause = new TypeError("synthetic fetch failed");
    const member = createHeadless({
      token: "synthetic",
      retries: { retries: 0 },
      fetcher: async () => {
        throw cause;
      },
    });
    const items =
      style === "offset"
        ? member.iter.bookmarks()
        : style === "cursor"
          ? member.iter.communityMembers()
          : member.iter.chatRoomMessages("synthetic");
    await expect(collect<unknown>(items)).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
    });
  });
  it("keeps rich HTTP context after a successful offset page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ records: [{ id: 1 }], has_next_page: true }))
      .mockResolvedValueOnce(
        Response.json(
          { error: "synthetic" },
          { status: 400, headers: { "x-request-id": "synthetic-id" } },
        ),
      );
    const items = createAdmin({ token: "synthetic", fetcher }).iter.posts()[Symbol.asyncIterator]();
    expect((await items.next()).value).toEqual({ id: 1 });
    await expect(items.next()).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 400,
      requestId: "synthetic-id",
      parsedJson: { error: "synthetic" },
      method: "GET",
      url: expect.stringContaining("page=2"),
    });
  });
});

it.each([
  "offset",
  "directory",
  "search",
  "chat",
])("%s applies both zero and positive item/page budgets", async (style) => {
  let n = 0;
  const fetcher = vi.fn(async () =>
    Response.json({
      records: [{ id: ++n }, { id: ++n }],
      next_search_after: [String(n)],
      has_next_page: true,
      has_previous_page: true,
      first_id: n,
      last_id: n,
    }),
  );
  const member = createHeadless({ token: "synthetic", fetcher });
  const scan = (bounds: { maxPages?: number; maxItems?: number }) =>
    style === "offset"
      ? member.iter.bookmarks(bounds)
      : style === "directory"
        ? member.iter.communityMembers(bounds)
        : style === "search"
          ? member.iter.communityMemberSearch(bounds)
          : member.iter.chatRoomMessages("synthetic", bounds);
  for (const bounds of [{ maxPages: 0 }, { maxItems: 0 }])
    expect(await collect<unknown>(scan(bounds))).toEqual([]);
  expect(fetcher).not.toHaveBeenCalled();
  expect(await collect<unknown>(scan({ maxPages: 1 }))).toHaveLength(2);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await collect<unknown>(scan({ maxItems: 3 }))).toHaveLength(3);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it("an iterator page uses the shared refresh flow once and continues with the new token", async () => {
  const requests: Request[] = [];
  const fetcher = vi.fn(async (input) => {
    const request = input as Request;
    requests.push(request);
    const url = new URL(request.url);
    if (url.pathname.endsWith("/access_token/refresh"))
      return Response.json({ access_token: "new-token", refresh_token: "new-refresh" });
    const page = url.searchParams.get("page");
    if (page === "1") return Response.json({ records: [{ id: 1 }], has_next_page: true });
    if (request.headers.get("authorization") === "Bearer old-token")
      return Response.json({ message: "expired" }, { status: 401 });
    return Response.json({ records: [{ id: 2 }], has_next_page: false });
  });
  const member = createHeadless({
    accessToken: "old-token",
    refreshToken: "synthetic-refresh",
    authToken: "synthetic-app",
    autoRefresh: true,
    fetcher,
    retries: { retries: 0 },
  });
  expect(await collect(member.iter.bookmarks({ maxPages: 2 }))).toEqual([{ id: 1 }, { id: 2 }]);
  expect(requests.map((r) => new URL(r.url).pathname)).toEqual([
    "/api/headless/v1/bookmarks",
    "/api/headless/v1/bookmarks",
    "/api/v1/headless/access_token/refresh",
    "/api/headless/v1/bookmarks",
  ]);
  expect(requests.at(-1)?.headers.get("authorization")).toBe("Bearer new-token");
});

it("the page body deadline uses CircleTimeoutError and cancels the stalled stream", async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const fetcher = vi.fn(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"records":['));
          },
          cancel,
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  const member = createHeadless({
    token: "synthetic",
    timeoutMs: 5,
    retries: { retries: 0 },
    fetcher,
  });
  const pending = member.iter.communityMembers()[Symbol.asyncIterator]().next();
  const assertion = expect(pending).rejects.toMatchObject({
    name: "CircleTimeoutError",
    timeoutMs: 5,
  });
  await vi.advanceTimersByTimeAsync(5);
  await assertion;
  expect(cancel).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
