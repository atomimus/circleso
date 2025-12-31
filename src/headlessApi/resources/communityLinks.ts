import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createCommunityLinksResource(request: HeadlessRequester) {
  return {
    /**
     * List community links.
     * @param options Query params (flat) plus request metadata.
     * @returns Community links response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/community_links", "get">) =>
      request.get("/api/headless/v1/community_links", options),
  };
}
