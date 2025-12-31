import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpaceGroupsResource(request: AdminRequester) {
  return {
    /**
     * List space groups.
     * @param options Query params (flat) plus request metadata.
     * @returns Space group list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/space_groups", "get">) =>
      request.get("/api/admin/v2/space_groups", options),
    /**
     * Create a space group.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created space group response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/space_groups", "post">) =>
      request.post("/api/admin/v2/space_groups", options),
    /**
     * Get a space group by ID.
     * @param id Space group ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Space group response.
     */
    get: (id: number, options?: RequestOptions<"/api/admin/v2/space_groups/{id}", "get">) =>
      request.get("/api/admin/v2/space_groups/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Update a space group.
     * @param id Space group ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated space group response.
     */
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/space_groups/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/space_groups/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a space group.
     * @param id Space group ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/space_groups/{id}", "delete">) =>
      request.delete("/api/admin/v2/space_groups/{id}", {
        ...options,
        path: { id },
      }),
  };
}
