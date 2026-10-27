import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityMemberSubscriptionsResource(request: AdminRequester) {
  return {
    /** List community member subscriptions using flat filters and page/per_page. */
    list: (options?: RequestOptions<"/api/admin/v2/community_member_subscriptions", "get">) =>
      request.get("/api/admin/v2/community_member_subscriptions", options),
    /** Queue a filtered CSV export emailed to the requesting admin; returns task JSON. */
    export: (
      options?: RequestOptions<"/api/admin/v2/community_member_subscriptions/export", "post">,
    ) => request.post("/api/admin/v2/community_member_subscriptions/export", options),
    /**
     * Cancel by subscription ID with ends_at: "now" or "at_period_end".
     * Immediate cancellation may specify refund_type: "prorated" or "full".
     */
    cancel: (
      id: number,
      options: RequestOptionsWithBody<
        "/api/admin/v2/community_member_subscriptions/{id}/cancel",
        "post"
      >,
    ) =>
      request.post("/api/admin/v2/community_member_subscriptions/{id}/cancel", {
        ...options,
        path: { id },
      }),
    /** Resume a subscription scheduled to cancel at the end of its billing period. */
    resume: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/community_member_subscriptions/{id}/resume", "post">,
    ) =>
      request.post("/api/admin/v2/community_member_subscriptions/{id}/resume", {
        ...options,
        path: { id },
      }),
    /**
     * Change a billing date or extend a genuine trial by subscription ID.
     * operation: "change_billing_date" requires billing_date (calendar YYYY-MM-DD);
     * operation: "extend_trial" requires positive integer days_to_extend.
     * Circle ignores the opposite field and checks operation eligibility before
     * mobile/input validation, returning 401 for ineligible operations.
     */
    changeBillingDate: (
      id: number,
      options: RequestOptionsWithBody<
        "/api/admin/v2/community_member_subscriptions/{id}/billing_date",
        "patch"
      >,
    ) =>
      request.patch("/api/admin/v2/community_member_subscriptions/{id}/billing_date", {
        ...options,
        path: { id },
      }),
  };
}
