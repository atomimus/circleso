import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createDirectUploadsResource(request: HeadlessRequester) {
  return {
    create: (options?: RequestOptionsWithBody<"/api/headless/v1/direct_uploads", "post">) =>
      request.post("/api/headless/v1/direct_uploads", options),
  };
}
