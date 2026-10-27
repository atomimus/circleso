import assert from "node:assert/strict";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { type AdminApi, createAdmin } from "./adminApi";
import { CircleHttpError, CircleNetworkError } from "./core/errors";
import {
  HEADER_AUTHORIZATION,
  HEADER_CONTENT_TYPE,
  HEADER_HOST,
  HEADER_REQUEST_ID,
} from "./core/headers";
import type { components, paths } from "./generated/admin-v2";
import type { OperationResponse } from "./requestTypes";

// Circle describes these as rich-text objects but supplies no properties. Keep the
// generated contracts; these localized assertions exercise preservation, not validation.
const document = { type: "doc", content: [{ type: "paragraph", content: [] }] };
const importedBody = {
  body: document,
} as unknown as paths["/api/admin/v2/chat_room_message_imports"]["post"]["requestBody"]["content"]["application/json"]["rich_text_body"];
const noteBody =
  document as unknown as paths["/api/admin/v2/contacts/{contact_id}/contact_notes"]["post"]["requestBody"]["content"]["application/json"]["tiptap_body"]["body"];
const lead = {
  id: 12,
  name: "Synthetic contact",
  type: "CommunityLead",
  email: null,
  public_uid: null,
  sqid: "syntheticSqid",
  member_tags: [{ id: 3, name: "Synthetic tag", emoji: null }],
} satisfies components["schemas"]["community_lead"];
const note = {
  id: 34,
  contact_id: 12,
  author_id: 56,
  community_id: 78,
  tiptap_body: null,
  policies: { can_edit: false, can_destroy: true },
} satisfies components["schemas"]["contact_note"];
const payment = {
  payment_method: "card",
  capability_id: null,
  capability_status: null,
  value: false,
  is_enabled: false,
  is_capability_active: false,
  is_capability_pending: false,
  can_request_capability: true,
  is_capability_available: true,
  mutable: true,
  normalized_state: "disabled",
} satisfies components["schemas"]["payment_method_preference"];
const tax = {
  processor_status: "enabled",
  platform_status: "disabled",
  default_tax_behavior: null,
} satisfies components["schemas"]["tax_setting"];
const connect = {
  connect: {
    enabled: false,
    recommendations: false,
    exclude_admins_from_recommendations: false,
    exclude_moderators_from_recommendations: false,
  },
  member_directory: { public: false, sort: null, view: null },
  messaging: {
    enabled: true,
    member_to_member_messaging_enabled: false,
    group_messaging_enabled: false,
    voice_messages_enabled: false,
    require_connection_before_messaging: true,
  },
} satisfies components["schemas"]["connect_settings"];
const room = {
  id: 90,
  name: "Synthetic room",
  status: "active",
  room_type: "stream",
  created_at: "2024-01-01T12:00:00Z",
  live_at: null,
  closed_at: null,
  recording_enabled: false,
  slug: "synthetic-room",
} satisfies components["schemas"]["live_room"];
const locations = {
  results: [
    { source: "mapbox_v6", name: null, full_address: null, source_id: null, feature_type: null },
    { source: "mapbox_v6", name: "Synthetic", source_id: "opaque-id", feature_type: "place" },
  ],
} satisfies components["schemas"]["location_search_results"];

function capture(body: unknown = {}, status = 200) {
  const requests: Request[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.clone());
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { [HEADER_CONTENT_TYPE]: "application/json", [HEADER_REQUEST_ID]: "remaining-1" },
    });
  });
  return {
    admin: createAdmin({ token: "fixture", fetcher, retries: { retries: 0 } }),
    fetcher,
    requests,
  };
}

function requestAt(requests: Request[], index = 0): Request {
  const request = requests[index];
  assert.ok(request, "Expected a captured request");
  return request;
}

type Operation = {
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: object;
  response: unknown;
  status?: number;
  errors: number[];
  call: (admin: AdminApi) => Promise<unknown>;
};

// All imports, deletions, notes and settings changes use synthetic data and mocked fetch.
const operations: Operation[] = [
  {
    name: "create lead",
    method: "POST",
    path: "/community_leads",
    body: { email: "synthetic@example.test", name: "Synthetic contact", member_tag_ids: [3] },
    response: lead,
    status: 201,
    errors: [401, 403, 422],
    call: (a) =>
      a.communityLeads.create({
        email: "synthetic@example.test",
        name: "Synthetic contact",
        member_tag_ids: [3],
      }),
  },
  {
    name: "delete lead",
    method: "DELETE",
    path: "/community_leads/12",
    response: { message: "Non-member contact deleted successfully." },
    errors: [401, 403, 404],
    call: (a) => a.communityLeads.delete(12),
  },
  {
    name: "list contact notes",
    method: "GET",
    path: "/contacts/syntheticSqid/contact_notes",
    query: { page: "2" },
    response: { records: [note], page: 2, per_page: 5, has_next_page: false },
    errors: [401, 403, 404],
    call: (a) => a.contactNotes.list("syntheticSqid", { page: 2 }),
  },
  {
    name: "create contact note",
    method: "POST",
    path: "/contacts/12/contact_notes",
    body: { tiptap_body: { body: document } },
    response: note,
    status: 201,
    errors: [401, 403, 404, 422],
    call: (a) => a.contactNotes.create("12", { tiptap_body: { body: noteBody } }),
  },
  {
    name: "get payment method preferences",
    method: "GET",
    path: "/payment_method_setting",
    response: [payment],
    errors: [401, 403, 422],
    call: (a) => a.paymentMethodPreferences.get(),
  },
  {
    name: "get tax settings",
    method: "GET",
    path: "/tax_setting",
    response: tax,
    errors: [400, 401, 403],
    call: (a) => a.taxSettings.get(),
  },
  {
    name: "update tax settings",
    method: "PUT",
    path: "/tax_setting",
    body: { tax_setting: { platform_status: "disabled", default_tax_behavior: "exclusive" } },
    response: tax,
    errors: [401, 403, 422],
    call: (a) =>
      a.taxSettings.update({
        tax_setting: { platform_status: "disabled", default_tax_behavior: "exclusive" },
      }),
  },
  {
    name: "get Connect settings",
    method: "GET",
    path: "/settings/connect",
    response: connect,
    errors: [401, 403],
    call: (a) => a.connectSettings.get(),
  },
  {
    name: "update Connect settings",
    method: "PATCH",
    path: "/settings/connect",
    body: {
      connect: { enabled: false },
      member_directory: { public: false, sort: "oldest", view: "cards" },
      messaging: { group_messaging_enabled: false },
    },
    response: connect,
    errors: [401, 403, 422],
    call: (a) =>
      a.connectSettings.update({
        connect: { enabled: false },
        member_directory: { public: false, sort: "oldest", view: "cards" },
        messaging: { group_messaging_enabled: false },
      }),
  },
  {
    name: "list live rooms",
    method: "GET",
    path: "/live/rooms",
    query: { page: "2", per_page: "10" },
    response: {
      records: [room],
      page: 2,
      per_page: 10,
      count: 1,
      page_count: 1,
      has_next_page: false,
    },
    errors: [401, 403],
    call: (a) => a.liveRooms.list({ page: 2, per_page: 10 }),
  },
  {
    name: "read transcripts",
    method: "GET",
    path: "/live/rooms/90/transcripts",
    response: { transcripts: ["WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nSynthetic\n", "WEBVTT\n"] },
    errors: [401, 403, 404],
    call: (a) => a.liveRooms.transcripts(90),
  },
  {
    name: "search locations",
    method: "GET",
    path: "/locations/search",
    query: { query: "Cairo & Giza/القاهرة" },
    response: locations,
    errors: [401, 403, 422],
    call: (a) => a.locations.search({ query: "Cairo & Giza/القاهرة" }),
  },
  {
    name: "import historical message",
    method: "POST",
    path: "/chat_room_message_imports",
    body: {
      chat_room_uuid: "synthetic-room",
      user_email: "synthetic@example.test",
      rich_text_body: { body: document },
      sent_at: "2024-01-01T12:00:00Z",
      parent_message_id: null,
    },
    // Deliberately arbitrary JSON: this is not a claimed Circle response schema.
    response: { opaque: [1, { future: false }], nullable: null },
    status: 201,
    errors: [401, 403, 422],
    call: (a) =>
      a.chatRoomMessageImports.create({
        chat_room_uuid: "synthetic-room",
        user_email: "synthetic@example.test",
        rich_text_body: importedBody,
        sent_at: "2024-01-01T12:00:00Z",
        parent_message_id: null,
      }),
  },
];

describe("remaining Admin resource contracts", () => {
  it.each(operations)("serializes and preserves $name", async (operation) => {
    const { admin, requests, fetcher } = capture(operation.response, operation.status);
    expect(await operation.call(admin)).toEqual(operation.response);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = requestAt(requests);
    const url = new URL(request.url);
    expect(url.origin).toBe("https://app.circle.so");
    expect(url.pathname).toBe(`/api/admin/v2${operation.path}`);
    expect(Object.fromEntries(url.searchParams)).toEqual(operation.query ?? {});
    expect(request.method).toBe(operation.method);
    expect(request.headers.get(HEADER_AUTHORIZATION)).toBe("Token fixture");
    expect(request.headers.get(HEADER_HOST)).toBe("app.circle.so");
    expect(await request.text()).toBe(operation.body ? JSON.stringify(operation.body) : "");
    expect(request.headers.get(HEADER_CONTENT_TYPE)).toBe(
      operation.body ? "application/json" : null,
    );
  });

  for (const operation of operations) {
    it.each(operation.errors)(`preserves HTTP %s context for ${operation.name}`, async (status) => {
      const body = {
        success: false,
        message: "Synthetic failure",
        error_details: { field: "fixture" },
      };
      const { admin, fetcher } = capture(body, status);
      const error = await operation.call(admin).catch((value: unknown) => value);
      expect(error).toBeInstanceOf(CircleHttpError);
      expect(error).toMatchObject({
        status,
        method: operation.method,
        requestId: "remaining-1",
        parsedJson: body,
        bodyText: JSON.stringify(body),
      });
      expect((error as CircleHttpError).url).toContain(`/api/admin/v2${operation.path}`);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  }

  it("keeps optional settings bodies absent and preserves explicitly nested empty objects", async () => {
    const { admin, requests } = capture();
    await admin.taxSettings.update();
    await admin.taxSettings.update({});
    await admin.connectSettings.update();
    await admin.connectSettings.update({});
    await admin.taxSettings.update({ tax_setting: {} });
    await admin.connectSettings.update({ connect: {}, member_directory: {}, messaging: {} });
    for (const request of requests.slice(0, 4)) {
      expect(await request.text()).toBe("");
      expect(request.headers.get(HEADER_CONTENT_TYPE)).toBeNull();
    }
    expect(await requestAt(requests, 4).json()).toEqual({ tax_setting: {} });
    expect(await requestAt(requests, 5).json()).toEqual({
      connect: {},
      member_directory: {},
      messaging: {},
    });
  });

  it("passes metadata separately and encodes contact string IDs", async () => {
    const { admin, requests } = capture(note, 201);
    const controller = new AbortController();
    await admin.contactNotes.create("synthetic/id ?#", {
      tiptap_body: { body: noteBody },
      headers: { "x-fixture": "notes" },
      signal: controller.signal,
      credentials: "include",
    });
    const request = requestAt(requests);
    expect(new URL(request.url).pathname).toBe(
      "/api/admin/v2/contacts/synthetic%2Fid%20%3F%23/contact_notes",
    );
    expect(request.headers.get("x-fixture")).toBe("notes");
    expect(request.credentials).toBe("include");
    expect(await request.json()).toEqual({ tiptap_body: { body: document } });
  });

  it("does not invent pagination, query defaults, or member lookups", async () => {
    const { admin, requests } = capture({ records: [] });
    await admin.contactNotes.list("12");
    await admin.liveRooms.list();
    await admin.communityLeads.create({ email: "synthetic@example.test", member_tag_ids: [] });
    expect(requests).toHaveLength(3);
    expect(new URL(requestAt(requests).url).search).toBe("");
    expect(new URL(requestAt(requests, 1).url).search).toBe("");
    expect(await requestAt(requests, 2).json()).toEqual({
      email: "synthetic@example.test",
      member_tag_ids: [],
    });
  });

  it("preserves empty transcript arrays and empty preference arrays", async () => {
    const transcripts = capture({ transcripts: [] });
    expect(await transcripts.admin.liveRooms.transcripts(90)).toEqual({ transcripts: [] });
    const preferences = capture([]);
    expect(await preferences.admin.paymentMethodPreferences.get()).toEqual([]);
    const places = capture({ results: [] });
    expect(await places.admin.locations.search({ query: "Synthetic" })).toEqual({ results: [] });
  });

  it.each([
    null,
    "opaque",
    [1, false],
    { future: { value: true } },
  ])("preserves unknown import JSON %j", async (body) => {
    const { admin } = capture(body, 201);
    expect(await operations.at(-1)?.call(admin)).toEqual(body);
  });

  // These operations declare JSON success. 204 verifies shared tolerance only.
  it.each(
    operations.filter((op) => op.method !== "GET"),
  )("tolerates empty success for $name", async (operation) => {
    const { admin } = capture(undefined, 204);
    expect(await operation.call(admin)).toBeUndefined();
  });

  it.each(
    operations.filter((op) => op.method !== "GET"),
  )("retains shared retry policy for $name", async (operation) => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("{}", { status: 503 }));
    const admin = createAdmin({
      token: "fixture",
      fetcher,
      retries: { retries: 2, baseDelayMs: 0, maxDelayMs: 0 },
    });
    await expect(operation.call(admin)).rejects.toBeInstanceOf(CircleHttpError);
    expect(fetcher).toHaveBeenCalledTimes(["PUT", "DELETE"].includes(operation.method) ? 3 : 1);
  });

  it("retains network causes without automatically repeating an import", async () => {
    const cause = new TypeError("Synthetic transport failure");
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw cause;
    });
    const admin = createAdmin({ token: "fixture", fetcher });
    const error = await admin.chatRoomMessageImports
      .create({
        chat_room_uuid: "synthetic-room",
        user_email: "synthetic@example.test",
        rich_text_body: importedBody,
        sent_at: "2024-01-01T12:00:00Z",
      })
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(CircleNetworkError);
    expect(error).toMatchObject({ cause });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retains the raw import response as unknown", async () => {
    const { admin } = capture(["opaque"], 201);
    const result = await admin.raw.POST("/api/admin/v2/chat_room_message_imports", {
      body: {
        chat_room_uuid: "synthetic-room",
        user_email: "synthetic@example.test",
        rich_text_body: importedBody,
        sent_at: "2024-01-01T12:00:00Z",
      },
    });
    expect(result.data).toEqual(["opaque"]);
    expectTypeOf(result.data).toEqualTypeOf<unknown>();
  });

  it("returns the exact generated response types", () => {
    type Response<Path extends keyof paths, Method extends keyof paths[Path]> = Promise<
      OperationResponse<paths[Path][Method] & object>
    >;
    expectTypeOf<ReturnType<AdminApi["communityLeads"]["create"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/community_leads", "post">
    >();
    expectTypeOf<ReturnType<AdminApi["communityLeads"]["delete"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/community_leads/{id}", "delete">
    >();
    expectTypeOf<ReturnType<AdminApi["contactNotes"]["list"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/contacts/{contact_id}/contact_notes", "get">
    >();
    expectTypeOf<ReturnType<AdminApi["contactNotes"]["create"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/contacts/{contact_id}/contact_notes", "post">
    >();
    expectTypeOf<ReturnType<AdminApi["paymentMethodPreferences"]["get"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/payment_method_setting", "get">
    >();
    expectTypeOf<ReturnType<AdminApi["taxSettings"]["get"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/tax_setting", "get">
    >();
    expectTypeOf<ReturnType<AdminApi["taxSettings"]["update"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/tax_setting", "put">
    >();
    expectTypeOf<ReturnType<AdminApi["connectSettings"]["get"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/settings/connect", "get">
    >();
    expectTypeOf<ReturnType<AdminApi["connectSettings"]["update"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/settings/connect", "patch">
    >();
    expectTypeOf<ReturnType<AdminApi["liveRooms"]["list"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/live/rooms", "get">
    >();
    expectTypeOf<ReturnType<AdminApi["liveRooms"]["transcripts"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/live/rooms/{room_id}/transcripts", "get">
    >();
    expectTypeOf<ReturnType<AdminApi["locations"]["search"]>>().toEqualTypeOf<
      Response<"/api/admin/v2/locations/search", "get">
    >();
    expectTypeOf<ReturnType<AdminApi["chatRoomMessageImports"]["create"]>>().toEqualTypeOf<
      Promise<unknown>
    >();
  });
});
