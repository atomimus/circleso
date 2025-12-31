import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createBookmarksResource(request: HeadlessRequester) {
  return {
    /**
     * List bookmarks.
     * @param options Query params (flat) plus request metadata.
     * @returns Bookmark list response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/bookmarks", "get">) =>
      request.get("/api/headless/v1/bookmarks", options),
    /**
     * Create a bookmark.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created bookmark response.
     */
    create: (options: RequestOptionsWithBody<"/api/headless/v1/bookmarks", "post">) =>
      request.post("/api/headless/v1/bookmarks", options),
    /**
     * Delete a bookmark.
     * @param id Bookmark ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: number, options?: RequestOptions<"/api/headless/v1/bookmarks/{id}", "delete">) =>
      request.delete("/api/headless/v1/bookmarks/{id}", {
        ...options,
        path: { id },
      }),
  };
}
