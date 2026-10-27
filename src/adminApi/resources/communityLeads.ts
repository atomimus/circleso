import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityLeadsResource(request: AdminRequester) {
  return {
    /** Create a non-member contact without login/access. Existing member or lead emails return 422. */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/community_leads", "post">) =>
      request.post("/api/admin/v2/community_leads", options),
    /** Soft-delete a non-member contact by numeric ID; full members return 404. */
    delete: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/community_leads/{id}", "delete">,
    ) => request.delete("/api/admin/v2/community_leads/{id}", { ...options, path: { id } }),
  };
}
