import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommentsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/comments", "get">) =>
      request.get("/api/admin/v2/comments", options),
    get: (id: string, options?: RequestOptions<"/api/admin/v2/comments/{id}", "get">) =>
      request.get("/api/admin/v2/comments/{id}", {
        ...options,
        path: { id },
      }),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/comments", "post">) =>
      request.post("/api/admin/v2/comments", options),
    delete: (id: string, options?: RequestOptions<"/api/admin/v2/comments/{id}", "delete">) =>
      request.delete("/api/admin/v2/comments/{id}", {
        ...options,
        path: { id },
      }),
  };
}
