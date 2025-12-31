import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommentsResource(request: AdminRequester) {
  return {
    /**
     * List comments.
     * @param options Query params (flat) plus request metadata.
     * @returns Comment list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/comments", "get">) =>
      request.get("/api/admin/v2/comments", options),
    /**
     * Get a comment by ID.
     * @param id Comment ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Comment response.
     */
    get: (id: string, options?: RequestOptions<"/api/admin/v2/comments/{id}", "get">) =>
      request.get("/api/admin/v2/comments/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Create a comment.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created comment response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/comments", "post">) =>
      request.post("/api/admin/v2/comments", options),
    /**
     * Delete a comment.
     * @param id Comment ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: string, options?: RequestOptions<"/api/admin/v2/comments/{id}", "delete">) =>
      request.delete("/api/admin/v2/comments/{id}", {
        ...options,
        path: { id },
      }),
  };
}
