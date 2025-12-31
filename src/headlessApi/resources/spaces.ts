import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSpacesResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/spaces", "get">) =>
      request.get("/api/headless/v1/spaces", options),
    get: (id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}", "get">) =>
      request.get("/api/headless/v1/spaces/{id}", {
        ...options,
        path: { id },
      }),
    join: (id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}/join", "post">) =>
      request.post("/api/headless/v1/spaces/{id}/join", {
        ...options,
        path: { id },
      }),
    leave: (id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}/leave", "post">) =>
      request.post("/api/headless/v1/spaces/{id}/leave", {
        ...options,
        path: { id },
      }),
    home: (options?: RequestOptions<"/api/headless/v1/spaces/home", "get">) =>
      request.get("/api/headless/v1/spaces/home", options),
    topics: (
      spaceId: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/topics", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/topics", {
        ...options,
        path: { space_id: spaceId },
      }),
    bookmarks: (
      spaceId: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/bookmarks", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/bookmarks", {
        ...options,
        path: { space_id: spaceId },
      }),
    notificationDetails: (
      options?: RequestOptions<"/api/headless/v1/space_notification_details", "get">,
    ) => request.get("/api/headless/v1/space_notification_details", options),
  };
}
