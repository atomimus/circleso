import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityMembersResource(request: AdminRequester) {
  return {
    /**
     * List community members.
     * @param options Query params (flat) plus request metadata.
     * @returns Community member list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/community_members", "get">) =>
      request.get("/api/admin/v2/community_members", options),
    /**
     * Create a community member.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created community member response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/community_members", "post">) =>
      request.post("/api/admin/v2/community_members", options),
    /**
     * Get a community member by ID.
     * @param id Community member ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Community member response.
     */
    get: (id: string, options?: RequestOptions<"/api/admin/v2/community_members/{id}", "get">) =>
      request.get("/api/admin/v2/community_members/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Update a community member.
     * @param id Community member ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated community member response.
     */
    update: (
      id: string,
      options: RequestOptionsWithBody<"/api/admin/v2/community_members/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/community_members/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Deactivate a community member.
     * @param id Community member ID.
     * @param options Request metadata.
     * @returns Deactivate response.
     */
    deactivate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/community_members/{id}", "delete">,
    ) =>
      request.delete("/api/admin/v2/community_members/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a community member.
     * @param id Community member ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/community_members/{id}/delete_member", "put">,
    ) =>
      request.put("/api/admin/v2/community_members/{id}/delete_member", {
        ...options,
        path: { id },
      }),
    /**
     * Ban a community member.
     * @param id Community member ID.
     * @param options Request metadata.
     * @returns Ban response.
     */
    ban: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/community_members/{id}/ban_member", "put">,
    ) =>
      request.put("/api/admin/v2/community_members/{id}/ban_member", {
        ...options,
        path: { id },
      }),
    /**
     * Search community members.
     * @param options Query params (flat) plus request metadata.
     * @returns Search response.
     */
    search: (options?: RequestOptions<"/api/admin/v2/community_members/search", "get">) =>
      request.get("/api/admin/v2/community_members/search", options),
    accessGroups: {
      /**
       * List access groups for a community member.
       * @param communityMemberId Community member ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Access group list response.
       */
      list: (
        communityMemberId: number,
        options?: RequestOptions<
          "/api/admin/v2/community_members/{community_member_id}/access_groups",
          "get"
        >,
      ) =>
        request.get("/api/admin/v2/community_members/{community_member_id}/access_groups", {
          ...options,
          path: { community_member_id: communityMemberId },
        }),
    },
    spaces: {
      /**
       * List community member spaces.
       * @param options Query params (flat) plus request metadata.
       * @returns Community member spaces response.
       */
      list: (options?: RequestOptions<"/api/admin/v2/community_member_spaces", "get">) =>
        request.get("/api/admin/v2/community_member_spaces", options),
    },
  };
}
