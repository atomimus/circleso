import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createFlaggedContentsResource(request: HeadlessRequester) {
  return {
    create: (options?: RequestOptionsWithBody<"/api/headless/v1/flagged_contents", "post">) =>
      request.post("/api/headless/v1/flagged_contents", options),
  };
}
