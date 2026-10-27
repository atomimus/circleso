import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createPaymentMethodPreferencesResource(request: AdminRequester) {
  return {
    /** Read payment-method preferences and Stripe capability states as an array. */
    get: (options?: RequestOptions<"/api/admin/v2/payment_method_setting", "get">) =>
      request.get("/api/admin/v2/payment_method_setting", options),
  };
}
