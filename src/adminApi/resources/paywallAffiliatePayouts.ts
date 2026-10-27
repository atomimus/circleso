import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createPaywallAffiliatePayoutsResource(request: AdminRequester) {
  return {
    /** Move due payouts to processing; omit community_member_ids to affect all due payouts. */
    start: (options?: RequestOptions<"/api/admin/v2/paywall_affiliate_payouts/start", "post">) =>
      request.post("/api/admin/v2/paywall_affiliate_payouts/start", options),
    /** Mark processing payouts paid; omit community_member_ids to affect all processing payouts. */
    markPaid: (
      options?: RequestOptions<"/api/admin/v2/paywall_affiliate_payouts/mark_paid", "post">,
    ) => request.post("/api/admin/v2/paywall_affiliate_payouts/mark_paid", options),
    /** Queue processing payouts CSV export and return task JSON. Optional ID scopes allow max 20. */
    export: (options?: RequestOptions<"/api/admin/v2/paywall_affiliate_payouts/export", "post">) =>
      request.post("/api/admin/v2/paywall_affiliate_payouts/export", options),
  };
}
