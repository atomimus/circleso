import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createFormsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/forms", "get">) =>
      request.get("/api/admin/v2/forms", options),
    get: (id: number, options?: RequestOptions<"/api/admin/v2/forms/{id}", "get">) =>
      request.get("/api/admin/v2/forms/{id}", {
        ...options,
        path: { id },
      }),
    update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/forms/{id}", "put">) =>
      request.put("/api/admin/v2/forms/{id}", {
        ...options,
        path: { id },
      }),
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/forms/{id}", "delete">) =>
      request.delete("/api/admin/v2/forms/{id}", {
        ...options,
        path: { id },
      }),
    duplicate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/forms/{id}/duplicate", "post">,
    ) =>
      request.post("/api/admin/v2/forms/{id}/duplicate", {
        ...options,
        path: { id },
      }),
  };
}
