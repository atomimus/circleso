import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSearchResource(request: HeadlessRequester) {
  return {
    query: (options?: RequestOptions<"/api/headless/v1/search", "get">) =>
      request.get("/api/headless/v1/search", options),
    advanced: (options?: RequestOptions<"/api/headless/v1/advanced_search", "get">) =>
      request.get("/api/headless/v1/advanced_search", options),
  };
}
