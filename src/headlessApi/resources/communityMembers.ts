import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityMembersResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/community_members", "get">) =>
      request.get("/api/headless/v1/community_members", options),
    current: (options?: RequestOptions<"/api/headless/v1/community_member", "get">) =>
      request.get("/api/headless/v1/community_member", options),
    deactivate: (
      options?: RequestOptions<"/api/headless/v1/community_member/deactivate", "delete">,
    ) => request.delete("/api/headless/v1/community_member/deactivate", options),
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
    updateProfile: (options: RequestOptionsWithBody<"/api/headless/v1/profile", "put">) =>
      request.put("/api/headless/v1/profile", options),
    confirmProfile: (options: RequestOptionsWithBody<"/api/headless/v1/signup/profile", "put">) =>
      request.put("/api/headless/v1/signup/profile", options),
    search: (
      options: RequestOptionsWithBody<"/api/headless/v1/search/community_members", "post">,
    ) => request.post("/api/headless/v1/search/community_members", options),
  };
}
