import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createMemberTagsResource(request: AdminRequester) {
  return {
    /**
     * List member tags.
     * @param options Query params (flat) plus request metadata.
     * @returns Member tag list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/member_tags", "get">) =>
      request.get("/api/admin/v2/member_tags", options),
    /**
     * Create a member tag.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created member tag response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/member_tags", "post">) =>
      request.post("/api/admin/v2/member_tags", options),
    /**
     * Get a member tag by ID.
     * @param id Member tag ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Member tag response.
     */
    get: (id: number, options?: RequestOptions<"/api/admin/v2/member_tags/{id}", "get">) =>
      request.get("/api/admin/v2/member_tags/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Update a member tag.
     * @param id Member tag ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated member tag response.
     */
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/member_tags/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/member_tags/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a member tag.
     * @param id Member tag ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/member_tags/{id}", "delete">) =>
      request.delete("/api/admin/v2/member_tags/{id}", {
        ...options,
        path: { id },
      }),
  };
}
