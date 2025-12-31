import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createPageProfileFieldsResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/page_profile_fields", "get">) =>
      request.get("/api/headless/v1/page_profile_fields", options),
  };
}
