import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommentsResource(request: HeadlessRequester) {
  return {
    /**
     * List comments for a post.
     * @param postId Post ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Comment list response.
     */
    list: (
      postId: number,
      options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments", "get">,
    ) =>
      request.get("/api/headless/v1/posts/{post_id}/comments", {
        ...options,
        path: { post_id: postId },
      }),
    /**
     * Create a comment for a post.
     * @param postId Post ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created comment response.
     */
    create: (
      postId: number,
      options: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/comments", "post">,
    ) =>
      request.post("/api/headless/v1/posts/{post_id}/comments", {
        ...options,
        path: { post_id: postId },
      }),
    /**
     * Get a comment by ID.
     * @param postId Post ID.
     * @param id Comment ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Comment response.
     */
    get: (
      postId: number,
      id: number,
      options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments/{id}", "get">,
    ) =>
      request.get("/api/headless/v1/posts/{post_id}/comments/{id}", {
        ...options,
        path: { post_id: postId, id },
      }),
    /**
     * Update a comment.
     * @param postId Post ID.
     * @param id Comment ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Updated comment response.
     */
    update: (
      postId: number,
      id: number,
      options: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/comments/{id}", "patch">,
    ) =>
      request.patch("/api/headless/v1/posts/{post_id}/comments/{id}", {
        ...options,
        path: { post_id: postId, id },
      }),
    /**
     * Delete a comment.
     * @param postId Post ID.
     * @param id Comment ID.
     * @param options Request metadata.
     * @returns Delete response.
     */
    delete: (
      postId: number,
      id: number,
      options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments/{id}", "delete">,
    ) =>
      request.delete("/api/headless/v1/posts/{post_id}/comments/{id}", {
        ...options,
        path: { post_id: postId, id },
      }),
    replies: {
      /**
       * List replies for a comment.
       * @param commentId Comment ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Reply list response.
       */
      list: (
        commentId: number,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies", "get">,
      ) =>
        request.get("/api/headless/v1/comments/{comment_id}/replies", {
          ...options,
          path: { comment_id: commentId },
        }),
      /**
       * Create a reply to a comment.
       * @param commentId Comment ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created reply response.
       */
      create: (
        commentId: string,
        options: RequestOptionsWithBody<"/api/headless/v1/comments/{comment_id}/replies", "post">,
      ) =>
        request.post("/api/headless/v1/comments/{comment_id}/replies", {
          ...options,
          path: { comment_id: commentId },
        }),
      /**
       * Get a reply by ID.
       * @param commentId Comment ID.
       * @param id Reply ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Reply response.
       */
      get: (
        commentId: string,
        id: string,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies/{id}", "get">,
      ) =>
        request.get("/api/headless/v1/comments/{comment_id}/replies/{id}", {
          ...options,
          path: { comment_id: commentId, id },
        }),
      /**
       * Update a reply.
       * @param commentId Comment ID.
       * @param id Reply ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Updated reply response.
       */
      update: (
        commentId: number,
        id: number,
        options: RequestOptionsWithBody<
          "/api/headless/v1/comments/{comment_id}/replies/{id}",
          "patch"
        >,
      ) =>
        request.patch("/api/headless/v1/comments/{comment_id}/replies/{id}", {
          ...options,
          path: { comment_id: commentId, id },
        }),
      /**
       * Delete a reply.
       * @param commentId Comment ID.
       * @param id Reply ID.
       * @param options Request metadata.
       * @returns Delete reply response.
       */
      delete: (
        commentId: string,
        id: string,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies/{id}", "delete">,
      ) =>
        request.delete("/api/headless/v1/comments/{comment_id}/replies/{id}", {
          ...options,
          path: { comment_id: commentId, id },
        }),
    },
    likes: {
      /**
       * List likes for a comment.
       * @param commentId Comment ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Likes response.
       */
      list: (
        commentId: number | string,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/user_likes", "get">,
      ) =>
        request.get("/api/headless/v1/comments/{comment_id}/user_likes", {
          ...options,
          path: { comment_id: commentId },
        }),
      /**
       * Like a comment.
       * @param commentId Comment ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Like response.
       */
      create: (
        commentId: number | string,
        options?: RequestOptionsWithBody<
          "/api/headless/v1/comments/{comment_id}/user_likes",
          "post"
        >,
      ) =>
        request.post("/api/headless/v1/comments/{comment_id}/user_likes", {
          ...options,
          path: { comment_id: commentId },
        }),
      /**
       * Remove a comment like.
       * @param commentId Comment ID.
       * @param options Request metadata.
       * @returns Unlike response.
       */
      delete: (
        commentId: number | string,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/user_likes", "delete">,
      ) =>
        request.delete("/api/headless/v1/comments/{comment_id}/user_likes", {
          ...options,
          path: { comment_id: commentId },
        }),
    },
  };
}
