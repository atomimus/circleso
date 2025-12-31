import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createDirectUploadsResource(request: HeadlessRequester) {
  return {
    /**
     * Create a direct upload.
     * @param options Body fields (flat) plus request metadata.
     * @returns Direct upload response.
     */
    create: (options?: RequestOptionsWithBody<"/api/headless/v1/direct_uploads", "post">) =>
      request.post("/api/headless/v1/direct_uploads", options),
  };
}
