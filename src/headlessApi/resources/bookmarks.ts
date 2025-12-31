import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createBookmarksResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/bookmarks", "get">) =>
      request.get("/api/headless/v1/bookmarks", options),
    create: (options: RequestOptionsWithBody<"/api/headless/v1/bookmarks", "post">) =>
      request.post("/api/headless/v1/bookmarks", options),
    delete: (id: number, options?: RequestOptions<"/api/headless/v1/bookmarks/{id}", "delete">) =>
      request.delete("/api/headless/v1/bookmarks/{id}", {
        ...options,
        path: { id },
      }),
  };
}
