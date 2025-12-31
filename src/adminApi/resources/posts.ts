import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createPostsResource(request: AdminRequester) {
  return {
    list: (options?: RequestOptions<"/api/admin/v2/posts", "get">) =>
      request.get("/api/admin/v2/posts", options),
    create: (options: RequestOptionsWithBody<"/api/admin/v2/posts", "post">) =>
      request.post("/api/admin/v2/posts", options),
    get: (id: number, options?: RequestOptions<"/api/admin/v2/posts/{id}", "get">) =>
      request.get("/api/admin/v2/posts/{id}", {
        ...options,
        path: { id },
      }),
    update: (id: string, options: RequestOptionsWithBody<"/api/admin/v2/posts/{id}", "put">) =>
      request.put("/api/admin/v2/posts/{id}", {
        ...options,
        path: { id },
      }),
    delete: (id: string, options?: RequestOptions<"/api/admin/v2/posts/{id}", "delete">) =>
      request.delete("/api/admin/v2/posts/{id}", {
        ...options,
        path: { id },
      }),
    summary: (
      postId: number,
      options?: RequestOptions<"/api/admin/v2/posts/{post_id}/summary", "get">,
    ) =>
      request.get("/api/admin/v2/posts/{post_id}/summary", {
        ...options,
        path: { post_id: postId },
      }),
    followers: {
      remove: (
        postId: number,
        options?: RequestOptions<"/api/admin/v2/posts/{post_id}/post_followers", "delete">,
      ) =>
        request.delete("/api/admin/v2/posts/{post_id}/post_followers", {
          ...options,
          path: { post_id: postId },
        }),
    },
    images: {
      create: (
        spaceId: number,
        options: RequestOptionsWithBody<"/api/admin/v2/spaces/{space_id}/images/posts", "post">,
      ) =>
        request.post("/api/admin/v2/spaces/{space_id}/images/posts", {
          ...options,
          path: { space_id: spaceId },
        }),
      delete: (
        spaceId: number,
        id: number,
        options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/images/posts/{id}", "delete">,
      ) =>
        request.delete("/api/admin/v2/spaces/{space_id}/images/posts/{id}", {
          ...options,
          path: { space_id: spaceId, id },
        }),
      duplicate: (
        spaceId: number,
        id: number,
        options: RequestOptionsWithBody<
          "/api/admin/v2/spaces/{space_id}/images/posts/{id}/duplicate",
          "post"
        >,
      ) =>
        request.post("/api/admin/v2/spaces/{space_id}/images/posts/{id}/duplicate", {
          ...options,
          path: { space_id: spaceId, id },
        }),
    },
  };
}
