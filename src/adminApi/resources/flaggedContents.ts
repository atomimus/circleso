import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createFlaggedContentsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/flagged_contents", "get">) =>
      request.get("/api/admin/v2/flagged_contents", options),
    report: (options: RequestOptionsWithBody<"/api/admin/v2/flagged_contents", "post">) =>
      request.post("/api/admin/v2/flagged_contents", options),
  };
}
