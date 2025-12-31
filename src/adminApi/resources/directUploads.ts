import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createDirectUploadsResource(request: AdminRequester) {
  return {
    /**
     * Create a direct upload.
     * @param options Body fields (flat) plus request metadata.
     * @returns Direct upload response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/direct_uploads", "post">) =>
      request.post("/api/admin/v2/direct_uploads", options),
  };
}
