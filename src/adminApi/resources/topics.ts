import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createTopicsResource(request: AdminRequester) {
  return {
    /**
     * List topics.
     * @param options Query params (flat) plus request metadata.
     * @returns Topic list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/topics", "get">) =>
      request.get("/api/admin/v2/topics", options),
    /**
     * Create a topic.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created topic response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/topics", "post">) =>
      request.post("/api/admin/v2/topics", options),
    /**
     * Get a topic by ID.
     * @param id Topic ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Topic response.
     */
    get: (id: number, options?: RequestOptions<"/api/admin/v2/topics/{id}", "get">) =>
      request.get("/api/admin/v2/topics/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Update a topic.
     * @param id Topic ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated topic response.
     */
    update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/topics/{id}", "put">) =>
      request.put("/api/admin/v2/topics/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a topic.
     * @param id Topic ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/topics/{id}", "delete">) =>
      request.delete("/api/admin/v2/topics/{id}", {
        ...options,
        path: { id },
      }),
  };
}
