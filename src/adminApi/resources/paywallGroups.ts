import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createPaywallGroupsResource(request: AdminRequester) {
  return {
    /** Create a subscription group using a name and numeric Circle currency ID. */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/paywall_groups", "post">) =>
      request.post("/api/admin/v2/paywall_groups", options),
    /** Rename a subscription group; currency changes require a group with no paywalls. */
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/paywall_groups/{id}", "put">,
    ) => request.put("/api/admin/v2/paywall_groups/{id}", { ...options, path: { id } }),
  };
}
