import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpaceGroupMembersResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/space_group_members", "get">) =>
      request.get("/api/admin/v2/space_group_members", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/space_group_members", "post">) =>
      request.post("/api/admin/v2/space_group_members", options),
    delete: (options?: RequestOptions<"/api/admin/v2/space_group_members", "delete">) =>
      request.delete("/api/admin/v2/space_group_members", options),
    get: (options?: RequestOptions<"/api/admin/v2/space_group_member", "get">) =>
      request.get("/api/admin/v2/space_group_member", options),
  };
}
