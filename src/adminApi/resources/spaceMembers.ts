import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpaceMembersResource(request: AdminRequester) {
  return {
    /**
     * List space members.
     * @param options Query params (flat) plus request metadata.
     * @returns Space member list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/space_members", "get">) =>
      request.get("/api/admin/v2/space_members", options),
    /**
     * Add members to a space.
     * @param options Body fields (flat) plus request metadata.
     * @returns Add member response.
     */
    add: (options: RequestOptionsWithBody<"/api/admin/v2/space_members", "post">) =>
      request.post("/api/admin/v2/space_members", options),
    /**
     * Remove members from a space.
     * @param options Query params (flat) plus request metadata.
     * @returns Remove member response.
     */
    remove: (options?: RequestOptions<"/api/admin/v2/space_members", "delete">) =>
      request.delete("/api/admin/v2/space_members", options),
    /**
     * Get a space member.
     * @param options Query params (flat) plus request metadata.
     * @returns Space member response.
     */
    get: (options?: RequestOptions<"/api/admin/v2/space_member", "get">) =>
      request.get("/api/admin/v2/space_member", options),
  };
}
