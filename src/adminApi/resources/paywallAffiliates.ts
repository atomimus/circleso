import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createPaywallAffiliatesResource(request: AdminRequester) {
  return {
    /** List affiliates with page/per_page and a nested deepObject filters object. */
    list: (options?: RequestOptions<"/api/admin/v2/paywall_affiliates", "get">) =>
      request.get("/api/admin/v2/paywall_affiliates", options),
    /**
     * Invite up to 20 existing community member IDs. Results are grouped by outcome
     * (invited, reinvited, already_active, failed), rather than input order.
     */
    invite: (options: RequestOptionsWithBody<"/api/admin/v2/paywall_affiliates/invite", "post">) =>
      request.post("/api/admin/v2/paywall_affiliates/invite", options),
    /**
     * Update by affiliate ID. Circle permits disabling invited/enrolled affiliates,
     * or restoring a disabled affiliate to its previous invited/enrolled state.
     */
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/paywall_affiliates/{id}", "patch">,
    ) => request.patch("/api/admin/v2/paywall_affiliates/{id}", { ...options, path: { id } }),
  };
}
