import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createPostsResource(request: AdminRequester) {
  return {
    /**
     * List posts.
     * @param options Query params (flat) plus request metadata.
     * @returns Post list response.
     */
    list: (options?: RequestOptions<"/api/admin/v2/posts", "get">) =>
      request.get("/api/admin/v2/posts", options),
    /**
     * Create a post.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created post response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/posts", "post">) =>
      request.post("/api/admin/v2/posts", options),
    /**
     * Get a post by ID.
     * @param id Post ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Post response.
     */
    get: (id: number, options?: RequestOptions<"/api/admin/v2/posts/{id}", "get">) =>
      request.get("/api/admin/v2/posts/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Update a post.
     * @param id Post ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated post response.
     */
    update: (id: string, options: RequestOptionsWithBody<"/api/admin/v2/posts/{id}", "put">) =>
      request.put("/api/admin/v2/posts/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Delete a post.
     * @param id Post ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (id: string, options?: RequestOptions<"/api/admin/v2/posts/{id}", "delete">) =>
      request.delete("/api/admin/v2/posts/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * Get a post summary.
     * @param postId Post ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Summary response.
     */
    summary: (
      postId: number,
      options?: RequestOptions<"/api/admin/v2/posts/{post_id}/summary", "get">,
    ) =>
      request.get("/api/admin/v2/posts/{post_id}/summary", {
        ...options,
        path: { post_id: postId },
      }),
    followers: {
      /**
       * Remove post followers.
       * @param postId Post ID.
       * @param options Request metadata.
       * @returns Remove follower response.
       */
      remove: (
        postId: number,
        options: RequestOptions<"/api/admin/v2/posts/{post_id}/post_followers", "delete">,
      ) =>
        request.delete("/api/admin/v2/posts/{post_id}/post_followers", {
          ...options,
          path: { post_id: postId },
        }),
    },
    images: {
      /**
       * Create a post image in a space.
       * @param spaceId Space ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Create image response.
       */
      create: (
        spaceId: number,
        options: RequestOptionsWithBody<"/api/admin/v2/spaces/{space_id}/images/posts", "post">,
      ) =>
        request.post("/api/admin/v2/spaces/{space_id}/images/posts", {
          ...options,
          path: { space_id: spaceId },
        }),
      /**
       * Delete a post image in a space.
       * @param spaceId Space ID.
       * @param id Image ID.
       * @param options Request metadata.
       * @returns Delete image response.
       */
      delete: (
        spaceId: number,
        id: number,
        options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/images/posts/{id}", "delete">,
      ) =>
        request.delete("/api/admin/v2/spaces/{space_id}/images/posts/{id}", {
          ...options,
          path: { space_id: spaceId, id },
        }),
      /**
       * Duplicate a post image in a space.
       * @param spaceId Space ID.
       * @param id Image ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Duplicate image response.
       */
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
