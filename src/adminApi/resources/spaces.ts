import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpacesResource(request: AdminRequester) {
  return {
    /**
     * List spaces.
     * @param options Query params (flat) plus request metadata.
     * @returns Space list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/spaces", "get">) =>
      request.get("/api/admin/v2/spaces", options),
    /**
     * Create a space.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created space response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/spaces", "post">) =>
      request.post("/api/admin/v2/spaces", options),
    /**
     * Get a space by ID.
     * @param id Space ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Space response.
     */
    get: (id: number, options?: RequestOptions<"/api/admin/v2/spaces/{id}", "get">) =>
      request.get("/api/admin/v2/spaces/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Update a space.
     * @param id Space ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated space response.
     */
    update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/spaces/{id}", "put">) =>
      request.put("/api/admin/v2/spaces/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a space.
     * @param id Space ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/spaces/{id}", "delete">) =>
      request.delete("/api/admin/v2/spaces/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Get AI summaries for a space.
     * @param spaceId Space ID.
     * @param options Query params (flat) plus request metadata.
     * @returns AI summaries response.
     */
    aiSummary: (
      spaceId: number,
      options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/ai_summaries", "get">,
    ) =>
      request.get("/api/admin/v2/spaces/{space_id}/ai_summaries", {
        ...options,
        path: { space_id: spaceId },
      }),
  };
}
