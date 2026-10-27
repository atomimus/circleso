import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { type AdminApi, createAdmin } from "./adminApi";
import { CircleConfigError, CircleHttpError, CircleNetworkError } from "./core/errors";
import {
  HEADER_AUTHORIZATION,
  HEADER_CONTENT_TYPE,
  HEADER_HOST,
  HEADER_REQUEST_ID,
} from "./core/headers";
import type { components } from "./generated/admin-v2";

function capture(body: unknown = {}, status = 200) {
  const requests: Request[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.clone());
    return new Response(JSON.stringify(body), {
      status,
      headers: { [HEADER_CONTENT_TYPE]: "application/json", [HEADER_REQUEST_ID]: "finance-1" },
    });
  });
  const admin = createAdmin({ token: "fixture", fetcher });
  return { admin, fetcher, requests };
}

describe("Admin charge and subscription resources", () => {
  it("lists charges with flat filters, pagination and nullable response fields", async () => {
    const body = {
      records: [{ id: 17, amount: 100, community_member_email: null }],
      has_next_page: false,
    };
    const { admin, requests } = capture(body);
    const data = await admin.communityMemberCharges.list({
      page: 2,
      per_page: 10,
      query: "a & b",
      paywall_ids: "1,2",
      amount_gte: 0,
      status: "paid,refunded",
      sort: "amount",
      direction: "asc",
    });
    expect(data).toEqual(body);
    expectTypeOf(data).toEqualTypeOf<
      components["schemas"]["community_member_charges_list"] | undefined
    >();
    const request = requests[0];
    expect(request?.method).toBe("GET");
    expect(new URL(request?.url ?? "").pathname).toBe("/api/admin/v2/community_member_charges");
    expect(Object.fromEntries(new URL(request?.url ?? "").searchParams)).toEqual({
      page: "2",
      per_page: "10",
      query: "a & b",
      paywall_ids: "1,2",
      amount_gte: "0",
      status: "paid,refunded",
      sort: "amount",
      direction: "asc",
    });
    expect(request?.headers.get(HEADER_AUTHORIZATION)).toBe("Token fixture");
    expect(request?.headers.get(HEADER_HOST)).toBe("app.circle.so");
    expect(await request?.text()).toBe("");
  });

  it("lists subscriptions preserving false, zero, comma filters and an empty page", async () => {
    const body = { records: [], has_next_page: false, count: 0 };
    const { admin, requests } = capture(body);
    const data = await admin.communityMemberSubscriptions.list({
      scheduled_to_cancel: false,
      total_amount_paid_gte: 0,
      status: "active,trial",
      billing_interval: "month",
    });
    expect(data).toEqual(body);
    expectTypeOf(data).toEqualTypeOf<
      components["schemas"]["community_member_subscriptions_list"] | undefined
    >();
    expect(requests[0]?.method).toBe("GET");
    const url = new URL(requests[0]?.url ?? "");
    expect(url.pathname).toBe("/api/admin/v2/community_member_subscriptions");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      scheduled_to_cancel: "false",
      total_amount_paid_gte: "0",
      status: "active,trial",
      billing_interval: "month",
    });
  });

  it("allows unfiltered lists and exports, returning export task JSON", async () => {
    const task = { id: 23, fields: ["processor_id"], filters: {} };
    const { admin, requests } = capture(task, 201);
    await admin.communityMemberCharges.list();
    await admin.communityMemberSubscriptions.list();
    const charges = await admin.communityMemberCharges.export();
    const subscriptions = await admin.communityMemberSubscriptions.export();
    expect(charges).toEqual(task);
    expect(subscriptions).toEqual(task);
    expectTypeOf(charges).toEqualTypeOf<
      components["schemas"]["community_member_charge_export"] | undefined
    >();
    expectTypeOf(subscriptions).toEqualTypeOf<
      components["schemas"]["community_member_subscription_export"] | undefined
    >();
    expect(requests.map((r) => new URL(r.url).search)).toEqual(["", "", "", ""]);
  });

  it("sends both export POST filters in query, without a CSV body", async () => {
    const { admin, requests } = capture({ id: 23 }, 201);
    await admin.communityMemberCharges.export({
      currency: "usd,eur",
      amount_gte: 0,
      fields: "processor_id,amount",
      timezone: "Africa/Cairo",
    });
    await admin.communityMemberSubscriptions.export({
      scheduled_to_cancel: false,
      fields: "processor_id,status",
      timezone: "Etc/UTC",
    });
    expect(requests.map((r) => new URL(r.url).pathname)).toEqual([
      "/api/admin/v2/community_member_charges/export",
      "/api/admin/v2/community_member_subscriptions/export",
    ]);
    expect(Object.fromEntries(new URL(requests[0]?.url ?? "").searchParams)).toEqual({
      currency: "usd,eur",
      amount_gte: "0",
      fields: "processor_id,amount",
      timezone: "Africa/Cairo",
    });
    expect(Object.fromEntries(new URL(requests[1]?.url ?? "").searchParams)).toEqual({
      scheduled_to_cancel: "false",
      fields: "processor_id,status",
      timezone: "Etc/UTC",
    });
    for (const request of requests) {
      expect(request.method).toBe("POST");
      expect(await request.text()).toBe("");
      expect(request.headers.has(HEADER_CONTENT_TYPE)).toBe(false);
    }
  });

  it("refunds full or partial amounts with a required reason and numeric charge ID", async () => {
    const body = {
      id: 17,
      amount_refunded: 100,
      refund_reason: null,
      subscription_processor_id: null,
    };
    const { admin, requests } = capture(body);
    const data = await admin.communityMemberCharges.refund(17, {
      reason_details: "Synthetic full refund",
    });
    await admin.communityMemberCharges.refund(18, {
      amount: 25,
      reason_details: "Synthetic partial refund",
    });
    expect(data).toEqual(body);
    expectTypeOf(data).toEqualTypeOf<
      components["schemas"]["community_member_charge"] | undefined
    >();
    expect(requests.map((r) => [r.method, new URL(r.url).pathname])).toEqual([
      ["POST", "/api/admin/v2/community_member_charges/17/refund"],
      ["POST", "/api/admin/v2/community_member_charges/18/refund"],
    ]);
    expect(await requests[0]?.json()).toEqual({ reason_details: "Synthetic full refund" });
    expect(await requests[1]?.json()).toEqual({
      amount: 25,
      reason_details: "Synthetic partial refund",
    });
  });

  it("cancels now with refund options or at period end, and resumes without a body", async () => {
    const body = { id: 19, ends_at: null, renews_at: null, trial_ends_at: null, paywall_id: null };
    const { admin, requests } = capture(body);
    const canceled = await admin.communityMemberSubscriptions.cancel(19, {
      ends_at: "now",
      refund_type: "prorated",
    });
    await admin.communityMemberSubscriptions.cancel(20, { ends_at: "at_period_end" });
    const resumed = await admin.communityMemberSubscriptions.resume(21, {
      headers: { "x-fixture": "resume" },
    });
    expect(canceled).toEqual(body);
    expect(resumed).toEqual(body);
    expectTypeOf(resumed).toEqualTypeOf<
      components["schemas"]["community_member_subscription"] | undefined
    >();
    expect(requests.map((r) => [r.method, new URL(r.url).pathname, new URL(r.url).search])).toEqual(
      [
        ["POST", "/api/admin/v2/community_member_subscriptions/19/cancel", ""],
        ["POST", "/api/admin/v2/community_member_subscriptions/20/cancel", ""],
        ["POST", "/api/admin/v2/community_member_subscriptions/21/resume", ""],
      ],
    );
    expect(await requests[0]?.json()).toEqual({ ends_at: "now", refund_type: "prorated" });
    expect(await requests[1]?.json()).toEqual({ ends_at: "at_period_end" });
    expect(await requests[2]?.text()).toBe("");
    expect(requests[2]?.headers.get("x-fixture")).toBe("resume");
    expect(requests[2]?.headers.has(HEADER_CONTENT_TYPE)).toBe(false);
  });

  it("PATCHes calendar dates and trial extensions through the same operation", async () => {
    const { admin, requests } = capture({ id: 19, trial_ends_at: null });
    const changed = await admin.communityMemberSubscriptions.changeBillingDate(19, {
      operation: "change_billing_date",
      billing_date: "2026-11-15",
    });
    await admin.communityMemberSubscriptions.changeBillingDate(20, {
      operation: "extend_trial",
      days_to_extend: 7,
    });
    expectTypeOf(changed).toEqualTypeOf<
      components["schemas"]["community_member_subscription"] | undefined
    >();
    expect(requests.map((r) => [r.method, new URL(r.url).pathname])).toEqual([
      ["PATCH", "/api/admin/v2/community_member_subscriptions/19/billing_date"],
      ["PATCH", "/api/admin/v2/community_member_subscriptions/20/billing_date"],
    ]);
    expect(await requests[0]?.json()).toEqual({
      operation: "change_billing_date",
      billing_date: "2026-11-15",
    });
    expect(await requests[1]?.json()).toEqual({ operation: "extend_trial", days_to_extend: 7 });
    for (const request of requests)
      expect(request.headers.get(HEADER_CONTENT_TYPE)).toBe("application/json");
  });

  it("rejects unknown wire fields before invoking fetch", async () => {
    const { admin, fetcher } = capture();
    await expect(
      admin.communityMemberCharges.refund(1, {
        reason_details: "Synthetic",
        // @ts-expect-error no undocumented idempotency field is introduced
        idempotency_key: "fixture",
      }),
    ).rejects.toBeInstanceOf(CircleConfigError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 422])("preserves billing failure context for HTTP %i", async (status) => {
    const body = { success: false, message: "Synthetic service rejection", error_details: {} };
    const { admin, fetcher, requests } = capture(body, status);
    await expect(
      admin.communityMemberSubscriptions.changeBillingDate(19, { operation: "extend_trial" }),
    ).rejects.toMatchObject({
      name: "CircleHttpError",
      status,
      method: "PATCH",
      requestId: "finance-1",
      parsedJson: body,
      url: "https://app.circle.so/api/admin/v2/community_member_subscriptions/19/billing_date",
    });
    // Conditional inputs/eligibility are checked by Circle; preserve its error precedence.
    expect(await requests[0]?.json()).toEqual({ operation: "extend_trial" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

const writes: [string, (admin: AdminApi) => Promise<unknown>][] = [
  ["charge export", (admin) => admin.communityMemberCharges.export()],
  [
    "refund",
    (admin) => admin.communityMemberCharges.refund(17, { reason_details: "Synthetic refund" }),
  ],
  ["subscription export", (admin) => admin.communityMemberSubscriptions.export()],
  [
    "cancel",
    (admin) =>
      admin.communityMemberSubscriptions.cancel(19, { ends_at: "now", refund_type: "full" }),
  ],
  ["resume", (admin) => admin.communityMemberSubscriptions.resume(19)],
  [
    "billing date",
    (admin) =>
      admin.communityMemberSubscriptions.changeBillingDate(19, {
        operation: "change_billing_date",
        billing_date: "2026-11-15",
      }),
  ],
  [
    "trial extension",
    (admin) =>
      admin.communityMemberSubscriptions.changeBillingDate(19, {
        operation: "extend_trial",
        days_to_extend: 7,
      }),
  ],
];

describe.each(writes)("safe defaults for %s", (_name, write) => {
  it.each([429, 503, "network"] as const)("does not retry %s", async (failure) => {
    const cause = new TypeError("Synthetic transport failure");
    const fetcher = vi.fn<typeof fetch>(async () => {
      if (failure === "network") throw cause;
      return new Response(JSON.stringify({ message: "Synthetic failure" }), {
        status: failure,
        headers: { "retry-after": "0", [HEADER_CONTENT_TYPE]: "application/json" },
      });
    });
    const admin = createAdmin({
      token: "fixture",
      fetcher,
      retries: { retries: 2, baseDelayMs: 0, maxDelayMs: 0 },
    });
    const result = write(admin);
    await expect(result).rejects.toBeInstanceOf(
      failure === "network" ? CircleNetworkError : CircleHttpError,
    );
    if (failure === "network") await expect(result).rejects.toMatchObject({ cause });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
