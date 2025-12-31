import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createFlaggedContentsResource(request: HeadlessRequester) {
  return {
    /**
     * Create a flagged content entry.
     * @param options Body fields (flat) plus request metadata.
     * @returns Flagged content response.
     */
    create: (options?: RequestOptionsWithBody<"/api/headless/v1/flagged_contents", "post">) =>
      request.post("/api/headless/v1/flagged_contents", options),
  };
}
