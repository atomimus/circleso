import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSearchResource(request: AdminRequester) {
  return {
    advanced: (options?: RequestOptions<"/api/admin/v2/advanced_search", "get">) =>
      request.get("/api/admin/v2/advanced_search", options),
  };
}
