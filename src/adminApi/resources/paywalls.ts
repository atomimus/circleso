import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createPaywallsResource(request: AdminRequester) {
  return {
    /** Search using flat page/per_page and comma-separated status, currency and ID filters. */
    search: (options?: RequestOptions<"/api/admin/v2/paywalls/search", "get">) =>
      request.get("/api/admin/v2/paywalls/search", options),
    /** Permanently delete a paywall. Circle rejects paywalls with real transactions. */
    delete: (id: number, options?: RequestOptions<"/api/admin/v2/paywalls/{id}", "delete">) =>
      request.delete("/api/admin/v2/paywalls/{id}", { ...options, path: { id } }),
    /**
     * Archive an active paywall. Permanently discards kept upsell offers where it is
     * host or target, including their prices and customization attachments.
     */
    archive: (id: number, options?: RequestOptions<"/api/admin/v2/paywalls/{id}/archive", "put">) =>
      request.put("/api/admin/v2/paywalls/{id}/archive", { ...options, path: { id } }),
    /** Publish a draft or archived paywall; an already-active paywall returns 422. */
    publish: (id: number, options?: RequestOptions<"/api/admin/v2/paywalls/{id}/publish", "put">) =>
      request.put("/api/admin/v2/paywalls/{id}/publish", { ...options, path: { id } }),
    /** Republish an archived paywall. Previously discarded upsell offers stay discarded. */
    unarchive: (
      id: number,
      options?: RequestOptions<"/api/admin/v2/paywalls/{id}/unarchive", "put">,
    ) => request.put("/api/admin/v2/paywalls/{id}/unarchive", { ...options, path: { id } }),
    /**
     * Schedule legacy paywall subscriber access recomputation; returns a scheduled job,
     * not completed access changes. Access-group-enabled paywalls return 422.
     * Repeat calls within about five minutes or while running can return the same job.
     */
    syncMemberAccess: (
      paywallId: number,
      options?: RequestOptions<"/api/admin/v2/paywalls/{paywall_id}/member_access_syncs", "post">,
    ) =>
      request.post("/api/admin/v2/paywalls/{paywall_id}/member_access_syncs", {
        ...options,
        path: { paywall_id: paywallId },
      }),
  };
}
