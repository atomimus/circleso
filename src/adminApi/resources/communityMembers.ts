import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityMembersResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/community_members", "get">) =>
      request.get("/api/admin/v2/community_members", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/community_members", "post">) =>
      request.post("/api/admin/v2/community_members", options),
    get: (id: string, options?: RequestOptions<"/api/admin/v2/community_members/{id}", "get">) =>
      request.get("/api/admin/v2/community_members/{id}", {
        ...options,
        path: { id },
      }),
    update: (
      id: string,
      options: RequestOptionsWithBody<"/api/admin/v2/community_members/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/community_members/{id}", {
        ...options,
        path: { id },
      }),
    deactivate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/community_members/{id}", "delete">,
    ) =>
      request.delete("/api/admin/v2/community_members/{id}", {
        ...options,
        path: { id },
      }),
    delete: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/community_members/{id}/delete_member", "put">,
    ) =>
      request.put("/api/admin/v2/community_members/{id}/delete_member", {
        ...options,
        path: { id },
      }),
    ban: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/community_members/{id}/ban_member", "put">,
    ) =>
      request.put("/api/admin/v2/community_members/{id}/ban_member", {
        ...options,
        path: { id },
      }),
    search: (options?: RequestOptions<"/api/admin/v2/community_members/search", "get">) =>
      request.get("/api/admin/v2/community_members/search", options),
    accessGroups: {
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
      list: (options?: RequestOptions<"/api/admin/v2/community_member_spaces", "get">) =>
        request.get("/api/admin/v2/community_member_spaces", options),
    },
  };
}
