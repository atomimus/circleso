import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createSpacesResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/spaces", "get">) =>
      request.get("/api/admin/v2/spaces", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/spaces", "post">) =>
      request.post("/api/admin/v2/spaces", options),
    get: (id: number, options?: RequestOptions<"/api/admin/v2/spaces/{id}", "get">) =>
      request.get("/api/admin/v2/spaces/{id}", {
        ...options,
        path: { id },
      }),
    update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/spaces/{id}", "put">) =>
      request.put("/api/admin/v2/spaces/{id}", {
        ...options,
        path: { id },
      }),
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/spaces/{id}", "delete">) =>
      request.delete("/api/admin/v2/spaces/{id}", {
        ...options,
        path: { id },
      }),
    aiSummary: (
      spaceId: number,
      options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/ai_summaries", "get">,
    ) =>
      request.get("/api/admin/v2/spaces/{space_id}/ai_summaries", {
        ...options,
        path: { space_id: spaceId },
      }),
  };
}
