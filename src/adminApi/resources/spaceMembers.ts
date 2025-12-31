import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpaceMembersResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/space_members", "get">) =>
      request.get("/api/admin/v2/space_members", options),
    add: (options: RequestOptionsWithBody<"/api/admin/v2/space_members", "post">) =>
      request.post("/api/admin/v2/space_members", options),
    remove: (options?: RequestOptions<"/api/admin/v2/space_members", "delete">) =>
      request.delete("/api/admin/v2/space_members", options),
    get: (options?: RequestOptions<"/api/admin/v2/space_member", "get">) =>
      request.get("/api/admin/v2/space_member", options),
  };
}
