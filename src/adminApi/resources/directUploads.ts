import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createDirectUploadsResource(request: AdminRequester) {
  return {
    create: (options: RequestOptionsWithBody<"/api/admin/v2/direct_uploads", "post">) =>
      request.post("/api/admin/v2/direct_uploads", options),
  };
}
