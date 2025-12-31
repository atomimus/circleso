import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createFormsResource(request: AdminRequester) {
  return {
    /**
     * List forms.
     * @param options Query params (flat) plus request metadata.
     * @returns Form list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/forms", "get">) =>
      request.get("/api/admin/v2/forms", options),
    /**
     * Get a form by ID.
     * @param id Form ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Form response.
     */
    get: (id: number, options?: RequestOptions<"/api/admin/v2/forms/{id}", "get">) =>
      request.get("/api/admin/v2/forms/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Update a form.
     * @param id Form ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated form response.
     */
    update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/forms/{id}", "put">) =>
      request.put("/api/admin/v2/forms/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a form.
     * @param id Form ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/forms/{id}", "delete">) =>
      request.delete("/api/admin/v2/forms/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Duplicate a form.
     * @param id Form ID.
     * @param options Request metadata.
     * @returns Duplicate response.
     */
    duplicate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/forms/{id}/duplicate", "post">,
    ) =>
      request.post("/api/admin/v2/forms/{id}/duplicate", {
        ...options,
        path: { id },
      }),
  };
}
