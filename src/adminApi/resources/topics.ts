import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createTopicsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/topics", "get">) =>
      request.get("/api/admin/v2/topics", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/topics", "post">) =>
      request.post("/api/admin/v2/topics", options),
    get: (id: number, options?: RequestOptions<"/api/admin/v2/topics/{id}", "get">) =>
      request.get("/api/admin/v2/topics/{id}", {
        ...options,
        path: { id },
      }),
    update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/topics/{id}", "put">) =>
      request.put("/api/admin/v2/topics/{id}", {
        ...options,
        path: { id },
      }),
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/topics/{id}", "delete">) =>
      request.delete("/api/admin/v2/topics/{id}", {
        ...options,
        path: { id },
      }),
  };
}
