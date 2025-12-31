import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSearchResource(request: HeadlessRequester) {
  return {
    /**
     * Search across headless resources.
     * @param options Query params (flat) plus request metadata.
     * @returns Search response.
     */
    query: (options?: RequestOptions<"/api/headless/v1/search", "get">) =>
      request.get("/api/headless/v1/search", options),
    /**
     * Run advanced search.
     * @param options Query params (flat) plus request metadata.
     * @returns Advanced search response.
     */
    advanced: (options?: RequestOptions<"/api/headless/v1/advanced_search", "get">) =>
      request.get("/api/headless/v1/advanced_search", options),
  };
}
