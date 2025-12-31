import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createMemberTagsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/member_tags", "get">) =>
      request.get("/api/admin/v2/member_tags", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/member_tags", "post">) =>
      request.post("/api/admin/v2/member_tags", options),
    get: (id: number, options?: RequestOptions<"/api/admin/v2/member_tags/{id}", "get">) =>
      request.get("/api/admin/v2/member_tags/{id}", {
        ...options,
        path: { id },
      }),
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/member_tags/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/member_tags/{id}", {
        ...options,
        path: { id },
      }),
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/member_tags/{id}", "delete">) =>
      request.delete("/api/admin/v2/member_tags/{id}", {
        ...options,
        path: { id },
      }),
  };
}
