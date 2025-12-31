import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createPostsResource(request: HeadlessRequester) {
  return {
    /**
     * List posts in a space.
     * @param spaceId Space ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Post list response.
     */
    list: (
      spaceId: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/posts", {
        ...options,
        path: { space_id: spaceId },
      }),
    /**
     * Create a post in a space.
     * @param spaceId Space ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created post response.
     */
    create: (
      spaceId: number,
      options: RequestOptionsWithBody<"/api/headless/v1/spaces/{space_id}/posts", "post">,
    ) =>
      request.post("/api/headless/v1/spaces/{space_id}/posts", {
        ...options,
        path: { space_id: spaceId },
      }),
    /**
     * Get a post by ID.
     * @param spaceId Space ID.
     * @param id Post ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Post response.
     */
    get: (
      spaceId: number,
      id: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts/{id}", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/posts/{id}", {
        ...options,
        path: { space_id: spaceId, id },
      }),
    /**
     * Delete a post.
     * @param spaceId Space ID.
     * @param id Post ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (
      spaceId: number,
      id: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts/{id}", "delete">,
    ) =>
      request.delete("/api/headless/v1/spaces/{space_id}/posts/{id}", {
        ...options,
        path: { space_id: spaceId, id },
      }),
    images: {
      /**
       * Create a post image.
       * @param spaceId Space ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Create image response.
       */
      create: (
        spaceId: number,
        options: RequestOptionsWithBody<"/api/headless/v1/spaces/{space_id}/images/posts", "post">,
      ) =>
        request.post("/api/headless/v1/spaces/{space_id}/images/posts", {
          ...options,
          path: { space_id: spaceId },
        }),
      /**
       * Update a post image.
       * @param spaceId Space ID.
       * @param id Image ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Update image response.
       */
      update: (
        spaceId: number,
        id: number,
        options: RequestOptionsWithBody<
          "/api/headless/v1/spaces/{space_id}/images/posts/{id}",
          "put"
        >,
      ) =>
        request.put("/api/headless/v1/spaces/{space_id}/images/posts/{id}", {
          ...options,
          path: { space_id: spaceId, id },
        }),
    },
    followers: {
      /**
       * Follow a post.
       * @param postId Post ID.
       * @param options Request metadata.
       * @returns Follow response.
       */
      follow: (
        postId: number,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers", "post">,
      ) =>
        request.post("/api/headless/v1/posts/{post_id}/post_followers", {
          ...options,
          path: { post_id: postId },
        }),
      /**
       * Unfollow a post.
       * @param postId Post ID.
       * @param options Request metadata.
       * @returns Unfollow response.
       */
      unfollow: (
        postId: string,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers", "delete">,
      ) =>
        request.delete("/api/headless/v1/posts/{post_id}/post_followers", {
          ...options,
          path: { post_id: postId },
        }),
      /**
       * Remove a post follower.
       * @param postId Post ID.
       * @param id Follower ID.
       * @param options Request metadata.
       * @returns Remove follower response.
       */
      remove: (
        postId: number,
        id: number,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers/{id}", "delete">,
      ) =>
        request.delete("/api/headless/v1/posts/{post_id}/post_followers/{id}", {
          ...options,
          path: { post_id: postId, id },
        }),
    },
    likes: {
      /**
       * List post likes.
       * @param postId Post ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Post likes response.
       */
      list: (
        postId: string,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/user_likes", "get">,
      ) =>
        request.get("/api/headless/v1/posts/{post_id}/user_likes", {
          ...options,
          path: { post_id: postId },
        }),
      /**
       * Like a post.
       * @param postId Post ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Like response.
       */
      create: (
        postId: string,
        options?: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/user_likes", "post">,
      ) =>
        request.post("/api/headless/v1/posts/{post_id}/user_likes", {
          ...options,
          path: { post_id: postId },
        }),
      /**
       * Remove a post like.
       * @param postId Post ID.
       * @param options Request metadata.
       * @returns Unlike response.
       */
      delete: (
        postId: string,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/user_likes", "delete">,
      ) =>
        request.delete("/api/headless/v1/posts/{post_id}/user_likes", {
          ...options,
          path: { post_id: postId },
        }),
    },
  };
}
