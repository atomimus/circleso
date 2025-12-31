import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createProfileFieldsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/profile_fields", "get">) =>
      request.get("/api/admin/v2/profile_fields", options),
    archive: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/profile_fields/{id}/archive", "put">,
    ) =>
      request.put("/api/admin/v2/profile_fields/{id}/archive", {
        ...options,
        path: { id },
      }),
    unarchive: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/profile_fields/{id}/unarchive", "put">,
    ) =>
      request.put("/api/admin/v2/profile_fields/{id}/unarchive", {
        ...options,
        path: { id },
      }),
  };
}
