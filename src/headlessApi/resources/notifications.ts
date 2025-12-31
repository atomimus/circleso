import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createNotificationsResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/notifications", "get">) =>
      request.get("/api/headless/v1/notifications", options),
    markAllAsRead: (
      options?: RequestOptions<"/api/headless/v1/notifications/mark_all_as_read", "post">,
    ) => request.post("/api/headless/v1/notifications/mark_all_as_read", options),
    markAsRead: (
      id: number,
      options?: RequestOptions<"/api/headless/v1/notifications/{id}/mark_as_read", "post">,
    ) =>
      request.post("/api/headless/v1/notifications/{id}/mark_as_read", {
        ...options,
        path: { id },
      }),
    archive: (
      id: number,
      options?: RequestOptions<"/api/headless/v1/notifications/{id}/archive", "post">,
    ) =>
      request.post("/api/headless/v1/notifications/{id}/archive", {
        ...options,
        path: { id },
      }),
    delete: (
      id: number,
      options?: RequestOptions<"/api/headless/v1/notifications/{id}", "delete">,
    ) =>
      request.delete("/api/headless/v1/notifications/{id}", {
        ...options,
        path: { id },
      }),
    newCount: (
      options?: RequestOptions<"/api/headless/v1/notifications/new_notifications_count", "get">,
    ) => request.get("/api/headless/v1/notifications/new_notifications_count", options),
    resetNewCount: (
      options?: RequestOptions<
        "/api/headless/v1/notifications/reset_new_notifications_count",
        "post"
      >,
    ) => request.post("/api/headless/v1/notifications/reset_new_notifications_count", options),
  };
}
