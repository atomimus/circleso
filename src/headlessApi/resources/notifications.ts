import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createNotificationsResource(request: HeadlessRequester) {
  return {
    /**
     * List notifications.
     * @param options Query params (flat) plus request metadata.
     * @returns Notification list response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/notifications", "get">) =>
      request.get("/api/headless/v1/notifications", options),
    /**
     * Mark all notifications as read.
     * @param options Request metadata.
     * @returns Mark-all-as-read response.
     */
    markAllAsRead: (
      options?: RequestOptions<"/api/headless/v1/notifications/mark_all_as_read", "post">,
    ) => request.post("/api/headless/v1/notifications/mark_all_as_read", options),
    /**
     * Mark a notification as read.
     * @param id Notification ID.
     * @param options Request metadata.
     * @returns Mark-as-read response.
     */
    markAsRead: (
      id: number,
      options?: RequestOptions<"/api/headless/v1/notifications/{id}/mark_as_read", "post">,
    ) =>
      request.post("/api/headless/v1/notifications/{id}/mark_as_read", {
        ...options,
        path: { id },
      }),
    /**
     * Archive a notification.
     * @param id Notification ID.
     * @param options Request metadata.
     * @returns Archive response.
     */
    archive: (
      id: number,
      options?: RequestOptions<"/api/headless/v1/notifications/{id}/archive", "post">,
    ) =>
      request.post("/api/headless/v1/notifications/{id}/archive", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a notification.
     * @param id Notification ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (
      id: number,
      options?: RequestOptions<"/api/headless/v1/notifications/{id}", "delete">,
    ) =>
      request.delete("/api/headless/v1/notifications/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Get count of new notifications.
     * @param options Query params (flat) plus request metadata.
     * @returns New notifications count response.
     */
    newCount: (
      options?: RequestOptions<"/api/headless/v1/notifications/new_notifications_count", "get">,
    ) => request.get("/api/headless/v1/notifications/new_notifications_count", options),
    /**
     * Reset the new notifications count.
     * @param options Request metadata.
     * @returns Reset response.
     */
    resetNewCount: (
      options?: RequestOptions<
        "/api/headless/v1/notifications/reset_new_notifications_count",
        "post"
      >,
    ) => request.post("/api/headless/v1/notifications/reset_new_notifications_count", options),
  };
}
