import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createPageProfileFieldsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/page_profile_fields", "get">) =>
      request.get("/api/admin/v2/page_profile_fields", options),
  };
}
