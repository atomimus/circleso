import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSpaceMembersResource(request: HeadlessRequester) {
  return {
    /**
     * Mark a space member as read.
     * @param id Space member ID.
     * @param options Request metadata.
     * @returns Mark-as-read response.
     */
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
