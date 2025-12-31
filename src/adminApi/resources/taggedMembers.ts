import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createTaggedMembersResource(request: AdminRequester) {
  return {
    /**
     * List tagged members.
     * @param options Query params (flat) plus request metadata.
     * @returns Tagged members response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/tagged_members", "get">) =>
      request.get("/api/admin/v2/tagged_members", options),
    /**
     * Create a tagged member.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created tagged member response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/tagged_members", "post">) =>
      request.post("/api/admin/v2/tagged_members", options),
    /**
     * Delete tagged members.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (options?: RequestOptions<"/api/admin/v2/tagged_members", "delete">) =>
      request.delete("/api/admin/v2/tagged_members", options),
    /**
     * Get a tagged member by ID.
     * @param id Tagged member ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Tagged member response.
     */
    get: (id: string, options?: RequestOptions<"/api/admin/v2/tagged_members/{id}", "get">) =>
      request.get("/api/admin/v2/tagged_members/{id}", {
        ...options,
        path: { id },
      }),
  };
}
