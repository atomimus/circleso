import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpaceGroupsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/space_groups", "get">) =>
      request.get("/api/admin/v2/space_groups", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/space_groups", "post">) =>
      request.post("/api/admin/v2/space_groups", options),
    get: (id: number, options?: RequestOptions<"/api/admin/v2/space_groups/{id}", "get">) =>
      request.get("/api/admin/v2/space_groups/{id}", {
        ...options,
        path: { id },
      }),
    update: (
      id: number,
      options: RequestOptionsWithBody<"/api/admin/v2/space_groups/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/space_groups/{id}", {
        ...options,
        path: { id },
      }),
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/space_groups/{id}", "delete">) =>
      request.delete("/api/admin/v2/space_groups/{id}", {
        ...options,
        path: { id },
      }),
  };
}
