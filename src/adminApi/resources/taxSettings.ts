import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createTaxSettingsResource(request: AdminRequester) {
  return {
    /** Read Stripe Tax settings, refreshed by Circle from Stripe. Resolution failures return 400. */
    get: (options?: RequestOptions<"/api/admin/v2/tax_setting", "get">) =>
      request.get("/api/admin/v2/tax_setting", options),
    /** Update nested tax_setting fields. Collection also requires active Stripe Tax at the processor. */
    update: (options?: RequestOptions<"/api/admin/v2/tax_setting", "put">) =>
      request.put("/api/admin/v2/tax_setting", options),
  };
}
