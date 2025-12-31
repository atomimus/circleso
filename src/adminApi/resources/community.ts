import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityResource(request: AdminRequester) {
  return {
    /**
     * Get community settings.
     * @param options Query params (flat) plus request metadata.
     * @returns Community response.
     */
    get: (options?: RequestOptions<"/api/admin/v2/community", "get">) =>
      request.get("/api/admin/v2/community", options),
    /**
     * Update community settings.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated community response.
     */
    update: (options: RequestOptionsWithBody<"/api/admin/v2/community", "put">) =>
      request.put("/api/admin/v2/community", options),
  };
}
