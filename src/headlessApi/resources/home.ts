import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createHomeResource(request: HeadlessRequester) {
  return {
    /**
     * Fetch home feed.
     * @param options Query params (flat) plus request metadata.
     * @returns Home feed response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/home", "get">) =>
      request.get("/api/headless/v1/home", options),
  };
}
