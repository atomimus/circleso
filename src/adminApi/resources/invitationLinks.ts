import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createInvitationLinksResource(request: AdminRequester) {
  return {
    /**
     * List invitation links.
     * @param options Query params (flat) plus request metadata.
     * @returns Invitation links response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/invitation_links", "get">) =>
      request.get("/api/admin/v2/invitation_links", options),
    /**
     * Delete an invitation link.
     * @param id Invitation link ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/invitation_links/{id}", "delete">,
    ) =>
      request.delete("/api/admin/v2/invitation_links/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Revoke an invitation link.
     * @param id Invitation link ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Revoke response.
     */
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
