import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createPaywallCouponsResource(request: AdminRequester) {
  return {
    /** Delete a coupon, removing its Stripe-side coupon and invalidating referencing offers. */
    delete: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/paywall_coupons/{id}", "delete">,
    ) => request.delete("/api/admin/v2/paywall_coupons/{id}", { ...options, path: { id } }),
  };
}
