import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createTaggedMembersResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/tagged_members", "get">) =>
      request.get("/api/admin/v2/tagged_members", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/tagged_members", "post">) =>
      request.post("/api/admin/v2/tagged_members", options),
    delete: (options?: RequestOptions<"/api/admin/v2/tagged_members", "delete">) =>
      request.delete("/api/admin/v2/tagged_members", options),
    get: (id: string, options?: RequestOptions<"/api/admin/v2/tagged_members/{id}", "get">) =>
      request.get("/api/admin/v2/tagged_members/{id}", {
        ...options,
        path: { id },
      }),
  };
}
