import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSpaceMembersResource(request: HeadlessRequester) {
  return {
    markAsRead: (
      id: number,
      options?: RequestOptions<"/api/headless/v1/space_members/{id}/mark_as_read", "post">,
    ) =>
      request.post("/api/headless/v1/space_members/{id}/mark_as_read", {
        ...options,
        path: { id },
      }),
  };
}
