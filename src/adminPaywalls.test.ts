import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { type AdminApi, createAdmin } from "./adminApi";
import { CircleConfigError, CircleHttpError, CircleNetworkError } from "./core/errors";
import {
  HEADER_AUTHORIZATION,
  HEADER_CONTENT_TYPE,
  HEADER_HOST,
  HEADER_REQUEST_ID,
} from "./core/headers";
import type { components, paths } from "./generated/admin-v2";
import type { OperationResponse } from "./requestTypes";

function capture(body: unknown = {}, status = 200) {
  const requests: Request[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.clone());
    return new Response(JSON.stringify(body), {
      status,
      headers: { [HEADER_CONTENT_TYPE]: "application/json", [HEADER_REQUEST_ID]: "paywall-1" },
    });
  });
  const admin = createAdmin({ token: "fixture", fetcher, retries: { retries: 0 } });
  return { admin, fetcher, requests };
}

type Mutation = {
  name: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: object;
  response: object;
  status?: number;
  call: (admin: AdminApi) => Promise<unknown>;
};

// Synthetic fixtures only: every destructive, financial and customer-access request is mocked.
const mutations: Mutation[] = [
  {
    name: "delete paywall",
    method: "DELETE",
    path: "/paywalls/11",
    response: { success: true, message: "Paywall was deleted." },
    call: (a) => a.paywalls.delete(11),
  },
  {
    name: "archive",
    method: "PUT",
    path: "/paywalls/11/archive",
    response: { success: true, message: "Paywall was archived." },
    call: (a) => a.paywalls.archive(11),
  },
  {
    name: "publish",
    method: "PUT",
    path: "/paywalls/11/publish",
    response: { success: true, message: "Paywall was published." },
    call: (a) => a.paywalls.publish(11),
  },
  {
    name: "unarchive",
    method: "PUT",
    path: "/paywalls/11/unarchive",
    response: { success: true, message: "Paywall was unarchived." },
    call: (a) => a.paywalls.unarchive(11),
  },
  {
    name: "sync member access",
    method: "POST",
    path: "/paywalls/11/member_access_syncs",
    response: { id: 91, status: "pending", created_at: "2026-10-27T00:00:00Z" },
    status: 201,
    call: (a) => a.paywalls.syncMemberAccess(11),
  },
  {
    name: "create group",
    method: "POST",
    path: "/paywall_groups",
    body: { name: "Synthetic group", currency_id: 1 },
    response: { id: 12, name: "Synthetic group", currency_id: 1 },
    status: 201,
    call: (a) => a.paywallGroups.create({ name: "Synthetic group", currency_id: 1 }),
  },
  {
    name: "update group",
    method: "PUT",
    path: "/paywall_groups/12",
    body: { name: "Renamed group", currency_id: 2 },
    response: { id: 12, name: "Renamed group", currency_id: 2 },
    call: (a) => a.paywallGroups.update(12, { name: "Renamed group", currency_id: 2 }),
  },
  {
    name: "delete coupon",
    method: "DELETE",
    path: "/paywall_coupons/13",
    response: { success: true, message: "Coupon deleted" },
    call: (a) => a.paywallCoupons.delete(13),
  },
  {
    name: "invite affiliates",
    method: "POST",
    path: "/paywall_affiliates/invite",
    body: { existing_member_ids: [21, 22] },
    response: {
      results: [
        { community_member_id: 22, status: "invited" },
        { community_member_id: 21, status: "failed", error: "Synthetic failure" },
      ],
      summary: { invited: 1, reinvited: 0, already_active: 0, failed: 1 },
    },
    call: (a) => a.paywallAffiliates.invite({ existing_member_ids: [21, 22] }),
  },
  {
    name: "update affiliate",
    method: "PATCH",
    path: "/paywall_affiliates/14",
    body: { status: "disabled" },
    response: { id: 14, status: "disabled", enrolled_at: null, invited_at: null },
    call: (a) => a.paywallAffiliates.update(14, { status: "disabled" }),
  },
  {
    name: "start payouts",
    method: "POST",
    path: "/paywall_affiliate_payouts/start",
    body: { community_member_ids: [21, 22] },
    response: { processing: 2 },
    call: (a) => a.paywallAffiliatePayouts.start({ community_member_ids: [21, 22] }),
  },
  {
    name: "mark payouts paid",
    method: "POST",
    path: "/paywall_affiliate_payouts/mark_paid",
    body: { community_member_ids: [21, 22] },
    response: { expected: 2, processed: 1 },
    call: (a) => a.paywallAffiliatePayouts.markPaid({ community_member_ids: [21, 22] }),
  },
  {
    name: "export payouts",
    method: "POST",
    path: "/paywall_affiliate_payouts/export",
    body: { community_member_ids: [21, 22] },
    response: { id: 92, relation: "Paywalls::Affiliates::Payout", community_member_ids: [21, 22] },
    status: 201,
    call: (a) => a.paywallAffiliatePayouts.export({ community_member_ids: [21, 22] }),
  },
];

describe.each(mutations)("Admin $name", (mutation) => {
  it("uses the documented method, numeric ID, JSON nesting and response", async () => {
    const { admin, fetcher, requests } = capture(mutation.response, mutation.status);
    expect(await mutation.call(admin)).toEqual(mutation.response);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = requests[0];
    expect(request?.url).toBe(`https://app.circle.so/api/admin/v2${mutation.path}`);
    expect(request?.method).toBe(mutation.method);
    expect(request?.headers.get(HEADER_AUTHORIZATION)).toBe("Token fixture");
    expect(request?.headers.get(HEADER_HOST)).toBe("app.circle.so");
    if (mutation.body) {
      expect(await request?.json()).toEqual(mutation.body);
      expect(request?.headers.get(HEADER_CONTENT_TYPE)).toBe("application/json");
    } else {
      expect(await request?.text()).toBe("");
      expect(request?.headers.has(HEADER_CONTENT_TYPE)).toBe(false);
    }
  });

  it.each([401, 403, 422])("preserves HTTP %i context and parsed error details", async (status) => {
    const body = {
      success: false,
      message: "Synthetic service rejection",
      error_details: "fixture",
    };
    const { admin } = capture(body, status);
    const result = mutation.call(admin);
    await expect(result).rejects.toBeInstanceOf(CircleHttpError);
    await expect(result).rejects.toMatchObject({
      status,
      method: mutation.method,
      requestId: "paywall-1",
      parsedJson: body,
      url: `https://app.circle.so/api/admin/v2${mutation.path}`,
    });
  });

  it.each([429, 503, "network"] as const)("uses shared retry policy for %s", async (failure) => {
    const cause = new TypeError("Synthetic transport failure");
    const bodies: string[] = [];
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      bodies.push(await request.text());
      if (failure === "network") throw cause;
      return new Response(JSON.stringify({ message: "Synthetic retry failure" }), {
        status: failure,
        headers: { "retry-after": "0", [HEADER_CONTENT_TYPE]: "application/json" },
      });
    });
    const admin = createAdmin({
      token: "fixture",
      fetcher,
      retries: { retries: 2, baseDelayMs: 0, maxDelayMs: 0 },
    });
    const result = mutation.call(admin);
    await expect(result).rejects.toBeInstanceOf(
      failure === "network" ? CircleNetworkError : CircleHttpError,
    );
    if (failure === "network") await expect(result).rejects.toMatchObject({ cause });
    const attempts = mutation.method === "PUT" || mutation.method === "DELETE" ? 3 : 1;
    expect(fetcher).toHaveBeenCalledTimes(attempts);
    expect(bodies).toEqual(
      Array(attempts).fill(mutation.body ? JSON.stringify(mutation.body) : ""),
    );
  });
});

describe("Admin paywall and affiliate contracts", () => {
  it("searches with comma strings, pagination and typed nullable paywall fields", async () => {
    const body = {
      records: [{ id: 11, name: null, currency: null, paywall_group_id: null }],
      has_next_page: false,
    };
    const { admin, requests } = capture(body);
    const data = await admin.paywalls.search({
      name: "a & b",
      status: "draft,active",
      currency: "usd,eur",
      paywall_id: "11,12",
      exclude_paywall_id: "13",
      subscription_group_id: "1,2",
      exclude_subscription_group_id: "3",
      sort: "title",
      direction: "asc",
      page: 2,
      per_page: 10,
    });
    expect(data).toEqual(body);
    expectTypeOf(data).toEqualTypeOf<components["schemas"]["paywalls_list"] | undefined>();
    const request = requests[0];
    expect(request?.method).toBe("GET");
    expect(new URL(request?.url ?? "").pathname).toBe("/api/admin/v2/paywalls/search");
    expect(Object.fromEntries(new URL(request?.url ?? "").searchParams)).toEqual({
      name: "a & b",
      status: "draft,active",
      currency: "usd,eur",
      paywall_id: "11,12",
      exclude_paywall_id: "13",
      subscription_group_id: "1,2",
      exclude_subscription_group_id: "3",
      sort: "title",
      direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(await request?.text()).toBe("");
  });

  it("lists affiliates with deepObject filters, metadata and generated response types", async () => {
    const body = {
      records: [{ id: 14, invited_at: null, enrolled_at: null }],
      has_next_page: false,
    };
    const { admin, requests } = capture(body);
    const data = await admin.paywallAffiliates.list({
      page: 1,
      per_page: 20,
      filters: {
        status: "enrolled",
        campaign_id: 0,
        name_or_email: "fixture@example.test",
        code: "a&b",
      },
      headers: { "x-fixture": "list" },
      credentials: "omit",
      signal: new AbortController().signal,
    });
    expect(data).toEqual(body);
    expectTypeOf(data).toEqualTypeOf<
      components["schemas"]["paywall_affiliates_list"] | undefined
    >();
    const request = requests[0];
    expect(request?.method).toBe("GET");
    expect(new URL(request?.url ?? "").pathname).toBe("/api/admin/v2/paywall_affiliates");
    expect(Object.fromEntries(new URL(request?.url ?? "").searchParams)).toEqual({
      page: "1",
      per_page: "20",
      "filters[status]": "enrolled",
      "filters[campaign_id]": "0",
      "filters[name_or_email]": "fixture@example.test",
      "filters[code]": "a&b",
    });
    expect(request?.headers.get("x-fixture")).toBe("list");
    expect(request?.credentials).toBe("omit");
    expect(await request?.text()).toBe("");
  });

  it("supports unfiltered empty pages and optional payout scopes without adding a body", async () => {
    const { admin, requests } = capture({ records: [], has_next_page: false });
    await admin.paywalls.search();
    await admin.paywallAffiliates.list();
    await admin.paywallAffiliatePayouts.start();
    await admin.paywallAffiliatePayouts.markPaid({ headers: { "x-fixture": "all" } });
    await admin.paywallAffiliatePayouts.export({});
    expect(requests.map((r) => new URL(r.url).search)).toEqual(["", "", "", "", ""]);
    for (const request of requests) {
      expect(await request.text()).toBe("");
      expect(request.headers.has(HEADER_CONTENT_TYPE)).toBe(false);
    }
  });

  it("preserves explicit empty arrays and required empty JSON updates", async () => {
    const { admin, requests } = capture();
    await admin.paywallAffiliatePayouts.start({ community_member_ids: [] });
    await admin.paywallAffiliatePayouts.markPaid({ community_member_ids: [] });
    await admin.paywallAffiliatePayouts.export({ community_member_ids: [] });
    await admin.paywallGroups.update(12, {});
    await admin.paywallAffiliates.update(14, {});
    expect(await Promise.all(requests.map((r) => r.json()))).toEqual([
      { community_member_ids: [] },
      { community_member_ids: [] },
      { community_member_ids: [] },
      {},
      {},
    ]);
  });

  it("returns the scheduled job without polling and preserves generated response types", async () => {
    const { admin, fetcher } = capture(
      { id: 91, status: "pending", created_at: "2026-10-27T00:00:00Z" },
      201,
    );
    const sync = await admin.paywalls.syncMemberAccess(11);
    expectTypeOf(sync).toEqualTypeOf<
      components["schemas"]["paywall_member_access_sync"] | undefined
    >();
    expect(sync?.status).toBe("pending");
    expect(fetcher).toHaveBeenCalledTimes(1);
    // Return types must remain the exact generated contracts, including optional/nullable fields.
    expectTypeOf<ReturnType<AdminApi["paywallGroups"]["create"]>>().toEqualTypeOf<
      Promise<components["schemas"]["paywall_group"] | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywallGroups"]["update"]>>().toEqualTypeOf<
      Promise<components["schemas"]["paywall_group"] | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywallAffiliates"]["update"]>>().toEqualTypeOf<
      Promise<components["schemas"]["paywall_affiliate"] | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywallAffiliatePayouts"]["export"]>>().toEqualTypeOf<
      Promise<components["schemas"]["paywall_affiliate_payout_export"] | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywallAffiliates"]["invite"]>>().toEqualTypeOf<
      Promise<OperationResponse<paths["/api/admin/v2/paywall_affiliates/invite"]["post"]>>
    >();
    expectTypeOf<ReturnType<AdminApi["paywallAffiliatePayouts"]["start"]>>().toEqualTypeOf<
      Promise<{ processing: number } | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywallAffiliatePayouts"]["markPaid"]>>().toEqualTypeOf<
      Promise<{ expected: number; processed: number } | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywallCoupons"]["delete"]>>().toEqualTypeOf<
      Promise<{ success?: boolean; message?: string } | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywalls"]["delete"]>>().toEqualTypeOf<
      Promise<{ success: boolean; message: string } | undefined>
    >();
    expectTypeOf<ReturnType<AdminApi["paywalls"]["archive"]>>().toEqualTypeOf<
      ReturnType<AdminApi["paywalls"]["delete"]>
    >();
    expectTypeOf<ReturnType<AdminApi["paywalls"]["publish"]>>().toEqualTypeOf<
      ReturnType<AdminApi["paywalls"]["delete"]>
    >();
    expectTypeOf<ReturnType<AdminApi["paywalls"]["unarchive"]>>().toEqualTypeOf<
      ReturnType<AdminApi["paywalls"]["delete"]>
    >();
  });

  it("preserves not-found coupon errors with a single attempt when retries are disabled", async () => {
    const body = {
      success: false,
      message: "Synthetic missing coupon",
      error_details: { message: "Missing record: paywall coupon" },
    };
    const { admin, fetcher } = capture(body, 404);
    await expect(admin.paywallCoupons.delete(13)).rejects.toMatchObject({
      status: 404,
      method: "DELETE",
      parsedJson: body,
      requestId: "paywall-1",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects invented fields without sending a mutation", async () => {
    const { admin, fetcher } = capture();
    await expect(
      admin.paywallGroups.create({
        name: "Synthetic group",
        currency_id: 1,
        // @ts-expect-error there is no documented paywall replacement list on groups
        paywall_ids: [11],
      }),
    ).rejects.toBeInstanceOf(CircleConfigError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps raw access and invitation-link replacement arrays intact", async () => {
    const { admin, requests } = capture({ success: true });
    await admin.raw.GET("/api/admin/v2/paywalls/search");
    const paywall = { paywall_id: 11, paywall_price_id: 111, paywall_trial_days: 7 };
    await admin.invitationLinks.update(15, { access_group_ids: [], paywall });
    expect(await requests[1]?.json()).toEqual({ access_group_ids: [], paywall });
  });
});
