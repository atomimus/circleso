import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityMembersResource(request: HeadlessRequester) {
  return {
    /**
     * List community members.
     * @param options Query params (flat) plus request metadata.
     * @returns Community member list response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/community_members", "get">) =>
      request.get("/api/headless/v1/community_members", options),
    /**
     * Get the current community member.
     * @param options Query params (flat) plus request metadata.
     * @returns Current member response.
     */
    current: (options?: RequestOptions<"/api/headless/v1/community_member", "get">) =>
      request.get("/api/headless/v1/community_member", options),
    /**
     * Deactivate the current community member.
     * @param options Request metadata.
     * @returns Deactivate response.
     */
    deactivate: (
      options?: RequestOptions<"/api/headless/v1/community_member/deactivate", "delete">,
    ) => request.delete("/api/headless/v1/community_member/deactivate", options),
    /**
     * List posts for a community member.
     * @param communityMemberId Community member ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Member posts response.
     */
    posts: (
      communityMemberId: number,
      options?: RequestOptions<
        "/api/headless/v1/community_members/{community_member_id}/posts",
        "get"
      >,
    ) =>
      request.get("/api/headless/v1/community_members/{community_member_id}/posts", {
        ...options,
        path: { community_member_id: communityMemberId },
      }),
    /**
     * List comments for a community member.
     * @param communityMemberId Community member ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Member comments response.
     */
    comments: (
      communityMemberId: number,
      options?: RequestOptions<
        "/api/headless/v1/community_members/{community_member_id}/comments",
        "get"
      >,
    ) =>
      request.get("/api/headless/v1/community_members/{community_member_id}/comments", {
        ...options,
        path: { community_member_id: communityMemberId },
      }),
    /**
     * List spaces for a community member.
     * @param communityMemberId Community member ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Member spaces response.
     */
    spaces: (
      communityMemberId: number,
      options?: RequestOptions<
        "/api/headless/v1/community_members/{community_member_id}/spaces",
        "get"
      >,
    ) =>
      request.get("/api/headless/v1/community_members/{community_member_id}/spaces", {
        ...options,
        path: { community_member_id: communityMemberId },
      }),
    /**
     * Get public profile for a community member.
     * @param communityMemberId Community member ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Public profile response.
     */
    publicProfile: (
      communityMemberId: number,
      options?: RequestOptions<
        "/api/headless/v1/community_members/{community_member_id}/public_profile",
        "get"
      >,
    ) =>
      request.get("/api/headless/v1/community_members/{community_member_id}/public_profile", {
        ...options,
        path: { community_member_id: communityMemberId },
      }),
    /**
     * Update the current member profile.
     * @param options Body fields (flat) plus request metadata.
     * @returns Update profile response.
     */
    updateProfile: (options: RequestOptionsWithBody<"/api/headless/v1/profile", "put">) =>
      request.put("/api/headless/v1/profile", options),
    /**
     * Confirm the signup profile.
     * @param options Body fields (flat) plus request metadata.
     * @returns Confirm profile response.
     */
    confirmProfile: (options: RequestOptionsWithBody<"/api/headless/v1/signup/profile", "put">) =>
      request.put("/api/headless/v1/signup/profile", options),
    /**
     * Search community members.
     * @param options Body fields (flat) plus request metadata.
     * @returns Search response.
     */
    search: (
      options: RequestOptionsWithBody<"/api/headless/v1/search/community_members", "post">,
    ) => request.post("/api/headless/v1/search/community_members", options),
  };
}
