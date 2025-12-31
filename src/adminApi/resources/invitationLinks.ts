import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createInvitationLinksResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/invitation_links", "get">) =>
      request.get("/api/admin/v2/invitation_links", options),
    delete: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/invitation_links/{id}", "delete">,
    ) =>
      request.delete("/api/admin/v2/invitation_links/{id}", {
        ...options,
        path: { id },
      }),
    revoke: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/invitation_links/{id}/revoke", "patch">,
    ) =>
      request.patch("/api/admin/v2/invitation_links/{id}/revoke", {
        ...options,
        path: { id },
      }),
  };
}
