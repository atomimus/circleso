import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createAccessGroupsResource(request: AdminRequester) {
  return {
    /**
     * List access groups.
     * @param options Query params (flat) plus request metadata.
     * @returns Access group list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/access_groups", "get">) =>
      request.get("/api/admin/v2/access_groups", options),
    /**
     * Create an access group.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created access group response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/access_groups", "post">) =>
      request.post("/api/admin/v2/access_groups", options),
    /**
     * Update an access group.
     * @param id Access group ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated access group response.
     */
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/access_groups/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/access_groups/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Archive an access group.
     * @param id Access group ID.
     * @param options Request metadata.
     * @returns Archive response.
     */
    archive: (id: number, options?: RequestOptions<"/api/admin/v2/access_groups/{id}", "delete">) =>
      request.delete("/api/admin/v2/access_groups/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Unarchive an access group.
     * @param id Access group ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Unarchive response.
     */
    unarchive: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/access_groups/{id}/unarchive", "patch">,
    ) =>
      request.patch("/api/admin/v2/access_groups/{id}/unarchive", {
        ...options,
        path: { id },
      }),
    members: {
      /**
       * List access group members.
       * @param accessGroupId Access group ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Access group members response.
       */
      list: (
        accessGroupId: number,
        options?: RequestOptions<
          "/api/admin/v2/access_groups/{access_group_id}/community_members",
          "get"
        >,
      ) =>
        request.get("/api/admin/v2/access_groups/{access_group_id}/community_members", {
          ...options,
          path: { access_group_id: accessGroupId },
        }),
      /**
       * Add members to an access group.
       * @param accessGroupId Access group ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Add member response.
       */
      add: (
        accessGroupId: number,
        options: RequestOptionsWithBody<
          "/api/admin/v2/access_groups/{access_group_id}/community_members",
          "post"
        >,
      ) =>
        request.post("/api/admin/v2/access_groups/{access_group_id}/community_members", {
          ...options,
          path: { access_group_id: accessGroupId },
        }),
      /**
       * Remove members from an access group.
       * @param accessGroupId Access group ID.
       * @param options Request metadata.
       * @returns Remove member response.
       */
      remove: (
        accessGroupId: number,
        options: RequestOptions<
          "/api/admin/v2/access_groups/{access_group_id}/community_members",
          "delete"
        >,
      ) =>
        request.delete("/api/admin/v2/access_groups/{access_group_id}/community_members", {
          ...options,
          path: { access_group_id: accessGroupId },
        }),
      /**
       * Get an access group member.
       * @param accessGroupId Access group ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Access group member response.
       */
      get: (
        accessGroupId: number,
        options: RequestOptions<
          "/api/admin/v2/access_groups/{access_group_id}/community_member",
          "get"
        >,
      ) =>
        request.get("/api/admin/v2/access_groups/{access_group_id}/community_member", {
          ...options,
          path: { access_group_id: accessGroupId },
        }),
    },
  };
}
