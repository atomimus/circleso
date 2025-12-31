import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpaceGroupMembersResource(request: AdminRequester) {
  return {
    /**
     * List space group members.
     * @param options Query params (flat) plus request metadata.
     * @returns Space group members response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/space_group_members", "get">) =>
      request.get("/api/admin/v2/space_group_members", options),
    /**
     * Add members to a space group.
     * @param options Body fields (flat) plus request metadata.
     * @returns Add member response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/space_group_members", "post">) =>
      request.post("/api/admin/v2/space_group_members", options),
    /**
     * Remove members from a space group.
     * @param options Request metadata.
     * @returns Remove member response.
     */
    delete: (options?: RequestOptions<"/api/admin/v2/space_group_members", "delete">) =>
      request.delete("/api/admin/v2/space_group_members", options),
    /**
     * Get a space group member.
     * @param options Query params (flat) plus request metadata.
     * @returns Space group member response.
     */
    get: (options?: RequestOptions<"/api/admin/v2/space_group_member", "get">) =>
      request.get("/api/admin/v2/space_group_member", options),
  };
}
