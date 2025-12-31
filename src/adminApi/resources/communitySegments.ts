import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunitySegmentsResource(request: AdminRequester) {
  return {
    /**
     * List community segments.
     * @param options Query params (flat) plus request metadata.
     * @returns Community segment list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/community_segments", "get">) =>
      request.get("/api/admin/v2/community_segments", options),
    /**
     * Create a community segment.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created segment response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/community_segments", "post">) =>
      request.post("/api/admin/v2/community_segments", options),
    /**
     * Update a community segment.
     * @param id Segment ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated segment response.
     */
    update: (
      id: string,
      options: RequestOptionsWithBody<"/api/admin/v2/community_segments/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/community_segments/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a community segment.
     * @param id Segment ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/community_segments/{id}", "delete">,
    ) =>
      request.delete("/api/admin/v2/community_segments/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Duplicate a community segment.
     * @param id Segment ID.
     * @param options Request metadata.
     * @returns Duplicate response.
     */
    duplicate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/community_segments/{id}/duplicate", "post">,
    ) =>
      request.post("/api/admin/v2/community_segments/{id}/duplicate", {
        ...options,
        path: { id },
      }),
  };
}
