import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSearchResource(request: AdminRequester) {
  return {
    /**
     * Run advanced search.
     * @param options Query params (flat) plus request metadata.
     * @returns Search response.
     */
    advanced: (options?: RequestOptions<"/api/admin/v2/advanced_search", "get">) =>
      request.get("/api/admin/v2/advanced_search", options),
  };
}
