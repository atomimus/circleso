import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommunityResource(request: AdminRequester) {
  return {
    get: (options?: RequestOptions<"/api/admin/v2/community", "get">) =>
      request.get("/api/admin/v2/community", options),
    update: (options: RequestOptionsWithBody<"/api/admin/v2/community", "put">) =>
      request.put("/api/admin/v2/community", options),
  };
}
