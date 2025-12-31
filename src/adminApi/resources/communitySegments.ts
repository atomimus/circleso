import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunitySegmentsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/community_segments", "get">) =>
      request.get("/api/admin/v2/community_segments", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/community_segments", "post">) =>
      request.post("/api/admin/v2/community_segments", options),
    update: (
      id: string,
      options: RequestOptionsWithBody<"/api/admin/v2/community_segments/{id}", "put">,
    ) =>
      request.put("/api/admin/v2/community_segments/{id}", {
        ...options,
        path: { id },
      }),
    delete: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/community_segments/{id}", "delete">,
    ) =>
      request.delete("/api/admin/v2/community_segments/{id}", {
        ...options,
        path: { id },
      }),
    duplicate: (
      id: string,
      options?: RequestOptions<"/api/admin/v2/community_segments/{id}/duplicate", "post">,
    ) =>
      request.post("/api/admin/v2/community_segments/{id}/duplicate", {
        ...options,
        path: { id },
      }),
  };
}
