import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createAccessGroupsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/access_groups", "get">) =>
      request.get("/api/admin/v2/access_groups", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/access_groups", "post">) =>
      request.post("/api/admin/v2/access_groups", options),
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/access_groups/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/access_groups/{id}", {
        ...options,
        path: { id },
      }),
    archive: (id: number, options?: RequestOptions<"/api/admin/v2/access_groups/{id}", "delete">) =>
      request.delete("/api/admin/v2/access_groups/{id}", {
        ...options,
        path: { id },
      }),
    unarchive: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/access_groups/{id}/unarchive", "patch">,
    ) =>
      request.patch("/api/admin/v2/access_groups/{id}/unarchive", {
        ...options,
        path: { id },
      }),
    members: {
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
      remove: (
        accessGroupId: number,
        options?: RequestOptions<
          "/api/admin/v2/access_groups/{access_group_id}/community_members",
          "delete"
        >,
      ) =>
        request.delete("/api/admin/v2/access_groups/{access_group_id}/community_members", {
          ...options,
          path: { access_group_id: accessGroupId },
        }),
      get: (
        accessGroupId: number,
        options?: RequestOptions<
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
