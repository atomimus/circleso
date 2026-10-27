import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityMemberChargesResource(request: AdminRequester) {
  return {
    /** List community member charges using flat filters and page/per_page. */
    list: (options?: RequestOptions<"/api/admin/v2/community_member_charges", "get">) =>
      request.get("/api/admin/v2/community_member_charges", options),
    /** Queue a filtered CSV export emailed to the requesting admin; returns task JSON. */
    export: (options?: RequestOptions<"/api/admin/v2/community_member_charges/export", "post">) =>
      request.post("/api/admin/v2/community_member_charges/export", options),
    /**
     * Refund a charge by ID. reason_details is required (maximum 255 characters).
     * amount is in currency subunits; omit it for a full refund.
     */
    refund: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/community_member_charges/{id}/refund", "post">,
    ) =>
      request.post("/api/admin/v2/community_member_charges/{id}/refund", {
        ...options,
        path: { id },
      }),
  };
}
