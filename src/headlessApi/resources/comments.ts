import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createCommentsResource(request: HeadlessRequester) {
  return {
    list: (
      postId: number,
      options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments", "get">,
    ) =>
      request.get("/api/headless/v1/posts/{post_id}/comments", {
        ...options,
        path: { post_id: postId },
      }),
    create: (
      postId: number,
      options: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/comments", "post">,
    ) =>
      request.post("/api/headless/v1/posts/{post_id}/comments", {
        ...options,
        path: { post_id: postId },
      }),
    get: (
      postId: number,
      id: number,
      options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments/{id}", "get">,
    ) =>
      request.get("/api/headless/v1/posts/{post_id}/comments/{id}", {
        ...options,
        path: { post_id: postId, id },
      }),
    update: (
      postId: number,
      id: number,
      options: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/comments/{id}", "patch">,
    ) =>
      request.patch("/api/headless/v1/posts/{post_id}/comments/{id}", {
        ...options,
        path: { post_id: postId, id },
      }),
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
      list: (
        commentId: number,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies", "get">,
      ) =>
        request.get("/api/headless/v1/comments/{comment_id}/replies", {
          ...options,
          path: { comment_id: commentId },
        }),
      create: (
        commentId: string,
        options: RequestOptionsWithBody<"/api/headless/v1/comments/{comment_id}/replies", "post">,
      ) =>
        request.post("/api/headless/v1/comments/{comment_id}/replies", {
          ...options,
          path: { comment_id: commentId },
        }),
      get: (
        commentId: string,
        id: string,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies/{id}", "get">,
      ) =>
        request.get("/api/headless/v1/comments/{comment_id}/replies/{id}", {
          ...options,
          path: { comment_id: commentId, id },
        }),
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
      list: (
        commentId: number | string,
        options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/user_likes", "get">,
      ) =>
        request.get("/api/headless/v1/comments/{comment_id}/user_likes", {
          ...options,
          path: { comment_id: commentId },
        }),
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
