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
import { createHeadless } from "./headlessApi";
import type { OperationResponse } from "./requestTypes";

const workflowId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const workflow = {
  id: workflowId,
  name: "Synthetic automation",
  status: "active",
  workflow_type: "dynamic",
  type_label: "Automation",
  runs_count: 2,
  community_segment_id: null,
  url: `https://example.test/settings/workflows/view/${workflowId}`,
} satisfies components["schemas"]["workflow"];
const control = {
  id: 12,
  key: "profile_field",
  enabled: false,
  filter_type: "profile_field",
  space_id: null,
  profile_field_id: 34,
  sort_key: 0,
} satisfies components["schemas"]["filter_kit_control"];

const baseFilter = {
  type: "standard",
  key: "synthetic",
  label: "Synthetic filter",
  icon: null,
  allow_multiple: false,
  pinned: false,
  visible_by_default: true,
  filter_group: "profile",
} satisfies components["schemas"]["BaseFilterInputType"];
const configurations = [
  {
    ...baseFilter,
    input_type: "string",
    payload: { filter_types: ["contains", "not_exist"], additional_params: null },
  },
  { ...baseFilter, input_type: "boolean", payload: null },
  {
    ...baseFilter,
    input_type: "radio",
    payload: {
      options: [
        { key: "Member", value: 1 },
        { key: "Other", value: "other" },
      ],
    },
  },
  {
    ...baseFilter,
    input_type: "array",
    payload: {
      filter_types: ["is", "exist"],
      mode: "popover",
      options: [{ text: "Synthetic", value: 12, group: null }],
      additional_params: { future: { list: [1, false, null] } },
    },
  },
  {
    ...baseFilter,
    input_type: "near_me",
    payload: {
      location_search_options: { key: "location", source: "mapbox_v6" },
      require_user_to_provide_more_precise_location: true,
      near_me_location_filter_values: null,
      community_member_profile_field: null,
    },
  },
  {
    ...baseFilter,
    input_type: "preset",
    payload: {
      preset_params: { filters: [{ key: "role", value: "Member" }], future: { enabled: true } },
    },
  },
  {
    ...baseFilter,
    input_type: "location",
    payload: { location_search_options: { key: "location", source: "mapbox_v6" }, mode: "inline" },
  },
  { ...baseFilter, input_type: "search", payload: {} },
  {
    ...baseFilter,
    input_type: "number",
    payload: {
      filter_types: ["is_not"],
      number_options: { id: 1, format: "percentage", decimal: null, position: null, text: null },
    },
  },
  {
    ...baseFilter,
    input_type: "async_search",
    payload: { filter_types: ["is"], mode: "popover", url: "https://example.test/options" },
  },
  { ...baseFilter, input_type: "days_ago", payload: { filter_types: ["lt", "eq", "gt"] } },
  {
    ...baseFilter,
    input_type: "number_range",
    payload: { filter_types: ["between"], min: 0, max: null },
  },
] satisfies components["schemas"]["Configuration"][];

function capture(body: unknown = {}, status = 200) {
  const requests: Request[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.clone());
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { [HEADER_CONTENT_TYPE]: "application/json", [HEADER_REQUEST_ID]: "workflow-1" },
    });
  });
  const admin = createAdmin({ token: "fixture", fetcher, retries: { retries: 0 } });
  return { admin, fetcher, requests };
}

function requestAt(requests: Request[], index: number): Request {
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
  response: object;
  status?: number;
  call: (admin: AdminApi) => Promise<unknown>;
};

// All automation and configuration mutations are synthetic and mocked at fetch.
const operations: Operation[] = [
  {
    name: "list workflows",
    method: "GET",
    path: "/workflows",
    query: {
      query: "Welcome & learn/",
      status: "all",
      workflow_type: "dynamic",
      page: "2",
      per_page: "5",
    },
    response: { records: [{ ...workflow, name: null }], page: 2, has_next_page: false },
    call: (a) =>
      a.workflows.list({
        query: "Welcome & learn/",
        status: "all",
        workflow_type: "dynamic",
        page: 2,
        per_page: 5,
      }),
  },
  {
    name: "get workflow",
    method: "GET",
    path: `/workflows/${workflowId}`,
    response: {
      ...workflow,
      trigger: { trigger_type: "member_joined_community", config: { future_field: [1, true] } },
      actions: [
        {
          id: "step",
          workflow_id: workflowId,
          action_type: "synthetic",
          api_params: { future: { enabled: true } },
          community_segment_id: null,
          list_position: 1,
          position: 9,
        },
      ],
    },
    call: (a) => a.workflows.get(workflowId),
  },
  {
    name: "activate workflow",
    method: "PUT",
    path: `/workflows/${workflowId}/activate`,
    response: workflow,
    call: (a) => a.workflows.activate(workflowId),
  },
  {
    name: "deactivate workflow",
    method: "PUT",
    path: `/workflows/${workflowId}/deactivate`,
    response: { ...workflow, status: "inactive" },
    call: (a) => a.workflows.deactivate(workflowId),
  },
  {
    name: "duplicate workflow",
    method: "POST",
    path: `/workflows/${workflowId}/duplicate`,
    response: { ...workflow, id: "new-workflow", status: "draft" },
    status: 201,
    call: (a) => a.workflows.duplicate(workflowId),
  },
  {
    name: "get configuration",
    method: "GET",
    path: "/filter_kit_configuration",
    query: { context: "member_space", space_id: "56" },
    response: { filter_configurations: [], enabled: false },
    call: (a) => a.filterKit.configuration({ context: "member_space", space_id: 56 }),
  },
  {
    name: "list controls",
    method: "GET",
    path: "/filter_kit_controls",
    query: {
      member_directory_only: "true",
      enabled: "false",
      key: "profile_field",
      profile_field_id: "34",
      page: "1",
      per_page: "10",
    },
    response: { records: [control], count: 1, page: 1 },
    call: (a) =>
      a.filterKit.controls.list({
        member_directory_only: true,
        enabled: false,
        key: "profile_field",
        profile_field_id: 34,
        page: 1,
        per_page: 10,
      }),
  },
  {
    name: "create control",
    method: "POST",
    path: "/filter_kit_controls",
    body: { key: "profile_field", enabled: false, profile_field_id: 34, space_id: 56, sort_key: 0 },
    response: control,
    status: 201,
    call: (a) =>
      a.filterKit.controls.create({
        key: "profile_field",
        enabled: false,
        profile_field_id: 34,
        space_id: 56,
        sort_key: 0,
      }),
  },
  {
    name: "get control",
    method: "GET",
    path: "/filter_kit_controls/12",
    response: control,
    call: (a) => a.filterKit.controls.get(12),
  },
  {
    name: "update control",
    method: "PATCH",
    path: "/filter_kit_controls/12",
    body: { enabled: false, sort_key: 0 },
    response: control,
    call: (a) => a.filterKit.controls.update(12, { enabled: false, sort_key: 0 }),
  },
  {
    name: "delete control",
    method: "DELETE",
    path: "/filter_kit_controls/12",
    response: { success: true, message: "Filter control removed successfully." },
    call: (a) => a.filterKit.controls.delete(12),
  },
];

describe("Admin workflows and directory filters", () => {
  it.each(operations)("serializes and preserves $name", async (operation) => {
    const { admin, requests, fetcher } = capture(operation.response, operation.status);
    expect(await operation.call(admin)).toEqual(operation.response);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = requestAt(requests, 0);
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

  it("does not replace an omitted workflow status with all", async () => {
    const { admin, requests } = capture({ records: [] });
    await admin.workflows.list();
    await admin.workflows.list({ status: "archived", workflow_type: "scheduled" });
    expect(new URL(requestAt(requests, 0).url).search).toBe("");
    expect(Object.fromEntries(new URL(requestAt(requests, 1).url).searchParams)).toEqual({
      status: "archived",
      workflow_type: "scheduled",
    });
  });

  it("serializes directory and space scopes without adding defaults", async () => {
    const { admin, requests } = capture({ filter_configurations: [] });
    await admin.filterKit.configuration({ context: "members" });
    await admin.filterKit.controls.list({ space_id: 56, member_directory_only: false });
    await admin.filterKit.controls.list();
    expect(new URL(requestAt(requests, 0).url).search).toBe("?context=members");
    expect(Object.fromEntries(new URL(requestAt(requests, 1).url).searchParams)).toEqual({
      space_id: "56",
      member_directory_only: "false",
    });
    expect(new URL(requestAt(requests, 2).url).search).toBe("");
  });

  it("keeps optional update bodies omitted, empty, or partial as supplied", async () => {
    const { admin, requests } = capture(control);
    await admin.filterKit.controls.update(12);
    await admin.filterKit.controls.update(12, {});
    await admin.filterKit.controls.update(12, {
      key: "profile_field",
      profile_field_id: 34,
      space_id: 56,
    });
    expect(await requestAt(requests, 0).text()).toBe("");
    expect(await requestAt(requests, 1).text()).toBe("");
    expect(await requestAt(requests, 2).json()).toEqual({
      key: "profile_field",
      profile_field_id: 34,
      space_id: 56,
    });
  });

  it("encodes path strings and passes metadata separately", async () => {
    const { admin, requests } = capture(workflow);
    const controller = new AbortController();
    await admin.workflows.get("synthetic/id ?#", {
      headers: { "x-fixture": "workflow" },
      credentials: "include",
      signal: controller.signal,
    });
    expect(new URL(requestAt(requests, 0).url).pathname).toBe(
      "/api/admin/v2/workflows/synthetic%2Fid%20%3F%23",
    );
    expect(requestAt(requests, 0).headers.get("x-fixture")).toBe("workflow");
    expect(requestAt(requests, 0).credentials).toBe("include");
    expect(await requestAt(requests, 0).text()).toBe("");
  });

  // The current spec declares JSON success, not 204. This tests shared empty-response
  // tolerance without promising that any of these Circle operations returns 204.
  it.each(
    operations.filter((operation) => operation.method !== "GET"),
  )("tolerates an empty 204 for $name", async (operation) => {
    const { admin } = capture(undefined, 204);
    expect(await operation.call(admin)).toBeUndefined();
  });

  for (const status of [401, 403, 422]) {
    const applicable =
      status === 422
        ? operations.filter(
            (operation) => operation.method !== "GET" && operation.method !== "DELETE",
          )
        : operations;
    it.each(applicable)(`preserves HTTP ${status} context for $name`, async (operation) => {
      const body = {
        success: false,
        message: "Synthetic permission/validation failure",
        error_details: { field: "fixture" },
      };
      const { admin, fetcher } = capture(body, status);
      const error = await operation.call(admin).catch((value: unknown) => value);
      expect(error).toBeInstanceOf(CircleHttpError);
      expect(error).toMatchObject({
        status,
        method: operation.method,
        requestId: "workflow-1",
        parsedJson: body,
        bodyText: JSON.stringify(body),
      });
      expect((error as CircleHttpError).url).toContain(`/api/admin/v2${operation.path}`);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  }

  it("retains invalid context and missing-record errors", async () => {
    const invalid = capture({ message: "Invalid context" }, 400);
    await expect(
      invalid.admin.filterKit.configuration({ context: "member_space" }),
    ).rejects.toMatchObject({ status: 400, parsedJson: { message: "Invalid context" } });
    const missing = capture({ message: "Missing record" }, 404);
    await expect(missing.admin.workflows.get(workflowId)).rejects.toMatchObject({ status: 404 });
    await expect(missing.admin.filterKit.controls.get(12)).rejects.toMatchObject({ status: 404 });
    await expect(missing.admin.filterKit.controls.delete(12)).rejects.toMatchObject({
      status: 404,
    });
  });

  it.each(
    operations.filter((operation) => operation.method !== "GET"),
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

  it("retains a network failure cause without retrying duplicate", async () => {
    const cause = new TypeError("Synthetic transport failure");
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw cause;
    });
    const admin = createAdmin({ token: "fixture", fetcher });
    const error = await admin.workflows.duplicate(workflowId).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(CircleNetworkError);
    expect(error).toMatchObject({ cause });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("preserves raw clients and the existing member search independently of controls", async () => {
    const { admin, requests } = capture({ records: [] });
    await admin.raw.GET("/api/admin/v2/workflows", { params: { query: { status: "all" } } });
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      expect(new URL(request.url).pathname).toBe("/api/headless/v1/search/community_members");
      expect(await request.json()).toEqual({
        filters: [{ key: "name", filter_type: "contains", value: "Synthetic" }],
        per_page: 10,
      });
      return new Response('{"records":[]}');
    });
    await createHeadless({ accessToken: "fixture", fetcher }).communityMembers.search({
      filters: [{ key: "name", filter_type: "contains", value: "Synthetic" }],
      per_page: 10,
    });
    expect(requests).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(
    configurations,
  )("preserves the $input_type configuration payload", async (configuration) => {
    const body = {
      filter_configurations: [{ ...configuration, filter_kit_control: null }],
      enabled: true,
      base_search_params: {
        status: "active",
        exclude_empty_name: false,
        order: { future_sort: { direction: "asc", context: [1, null] } },
        filters: [
          { id: "scope", key: "space", value: "56" },
          { id: "visible", key: "visible", value: true },
        ],
      },
    } satisfies components["schemas"]["FilterResponse"];
    const { admin, fetcher } = capture(body);
    expect(await admin.filterKit.configuration({ context: "members" })).toEqual(body);
    // A URL in an async-search payload is data, not a request the SDK executes.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("preserves empty workflow graphs and default controls with nullable IDs", async () => {
    const { admin } = capture({ ...workflow, trigger: null, actions: [] });
    expect(await admin.workflows.get(workflowId)).toMatchObject({ trigger: null, actions: [] });
    const defaults = capture({
      ...control,
      id: null,
      profile_field_id: null,
      sort_key: null,
      space: null,
      profile_field: null,
    });
    expect(await defaults.admin.filterKit.controls.get(12)).toMatchObject({
      id: null,
      sort_key: null,
    });
  });

  it("returns exact generated response contracts", () => {
    expectTypeOf<(typeof configurations)[number]["input_type"]>().toEqualTypeOf<
      components["schemas"]["Configuration"]["input_type"]
    >();
    expectTypeOf<ReturnType<AdminApi["workflows"]["list"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/workflows"]["get"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["workflows"]["get"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/workflows/{id}"]["get"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["workflows"]["activate"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/workflows/{id}/activate"]["put"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["workflows"]["deactivate"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/workflows/{id}/deactivate"]["put"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["workflows"]["duplicate"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/workflows/{id}/duplicate"]["post"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["filterKit"]["configuration"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/filter_kit_configuration"]["get"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["filterKit"]["controls"]["list"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/filter_kit_controls"]["get"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["filterKit"]["controls"]["create"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/filter_kit_controls"]["post"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["filterKit"]["controls"]["get"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/filter_kit_controls/{id}"]["get"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["filterKit"]["controls"]["update"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/filter_kit_controls/{id}"]["patch"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["filterKit"]["controls"]["delete"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/filter_kit_controls/{id}"]["delete"]>>
    >();
  });
});
