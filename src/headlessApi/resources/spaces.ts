import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createSpacesResource(request: HeadlessRequester) {
  return {
    /**
     * List spaces.
     * @param options Query params (flat) plus request metadata.
     * @returns Space list response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/spaces", "get">) =>
      request.get("/api/headless/v1/spaces", options),
    /**
     * Get a space by ID.
     * @param id Space ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Space response.
     */
    get: (id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}", "get">) =>
      request.get("/api/headless/v1/spaces/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Join a space.
     * @param id Space ID.
     * @param options Request metadata.
     * @returns Join response.
     */
    join: (id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}/join", "post">) =>
      request.post("/api/headless/v1/spaces/{id}/join", {
        ...options,
        path: { id },
      }),
    /**
     * Leave a space.
     * @param id Space ID.
     * @param options Request metadata.
     * @returns Leave response.
     */
    leave: (id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}/leave", "post">) =>
      request.post("/api/headless/v1/spaces/{id}/leave", {
        ...options,
        path: { id },
      }),
    /**
     * List home spaces.
     * @param options Query params (flat) plus request metadata.
     * @returns Home spaces response.
     */
    home: (options?: RequestOptions<"/api/headless/v1/spaces/home", "get">) =>
      request.get("/api/headless/v1/spaces/home", options),
    /**
     * List space topics.
     * @param spaceId Space ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Space topics response.
     */
    topics: (
      spaceId: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/topics", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/topics", {
        ...options,
        path: { space_id: spaceId },
      }),
    /**
     * List space bookmarks.
     * @param spaceId Space ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Space bookmarks response.
     */
    bookmarks: (
      spaceId: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/bookmarks", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/bookmarks", {
        ...options,
        path: { space_id: spaceId },
      }),
    /**
     * Get space notification details.
     * @param options Query params (flat) plus request metadata.
     * @returns Notification details response.
     */
    notificationDetails: (
      options?: RequestOptions<"/api/headless/v1/space_notification_details", "get">,
    ) => request.get("/api/headless/v1/space_notification_details", options),
  };
}
