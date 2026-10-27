import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createProfileFieldsResource(request: AdminRequester) {
  return {
    /**
     * List profile fields.
     * @param options Query params (flat) plus request metadata.
     * @returns Profile fields response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/profile_fields", "get">) =>
      request.get("/api/admin/v2/profile_fields", options),
    /**
     * Create a profile field.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created profile field response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/profile_fields", "post">) =>
      request.post("/api/admin/v2/profile_fields", options),
    /**
     * Update a profile field.
     * @param id Profile field ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated profile field response.
     */
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/profile_fields/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/profile_fields/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete an archived profile field.
     * @param id Profile field ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/profile_fields/{id}", "delete">) =>
      request.delete("/api/admin/v2/profile_fields/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Archive a profile field.
     * @param id Profile field ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Archive response.
     */
    archive: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/profile_fields/{id}/archive", "put">,
    ) =>
      request.put("/api/admin/v2/profile_fields/{id}/archive", {
        ...options,
        path: { id },
      }),
    /**
     * Unarchive a profile field.
     * @param id Profile field ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Unarchive response.
     */
    unarchive: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/profile_fields/{id}/unarchive", "put">,
    ) =>
      request.put("/api/admin/v2/profile_fields/{id}/unarchive", {
        ...options,
        path: { id },
      }),
  };
}
