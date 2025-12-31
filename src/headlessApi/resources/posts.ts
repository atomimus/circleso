import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createPostsResource(request: HeadlessRequester) {
  return {
    list: (
      spaceId: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/posts", {
        ...options,
        path: { space_id: spaceId },
      }),
    create: (
      spaceId: number,
      options: RequestOptionsWithBody<"/api/headless/v1/spaces/{space_id}/posts", "post">,
    ) =>
      request.post("/api/headless/v1/spaces/{space_id}/posts", {
        ...options,
        path: { space_id: spaceId },
      }),
    get: (
      spaceId: number,
      id: number,
      options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts/{id}", "get">,
    ) =>
      request.get("/api/headless/v1/spaces/{space_id}/posts/{id}", {
        ...options,
        path: { space_id: spaceId, id },
      }),
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
      create: (
        spaceId: number,
        options: RequestOptionsWithBody<"/api/headless/v1/spaces/{space_id}/images/posts", "post">,
      ) =>
        request.post("/api/headless/v1/spaces/{space_id}/images/posts", {
          ...options,
          path: { space_id: spaceId },
        }),
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
      follow: (
        postId: number,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers", "post">,
      ) =>
        request.post("/api/headless/v1/posts/{post_id}/post_followers", {
          ...options,
          path: { post_id: postId },
        }),
      unfollow: (
        postId: string,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers", "delete">,
      ) =>
        request.delete("/api/headless/v1/posts/{post_id}/post_followers", {
          ...options,
          path: { post_id: postId },
        }),
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
      list: (
        postId: string,
        options?: RequestOptions<"/api/headless/v1/posts/{post_id}/user_likes", "get">,
      ) =>
        request.get("/api/headless/v1/posts/{post_id}/user_likes", {
          ...options,
          path: { post_id: postId },
        }),
      create: (
        postId: string,
        options?: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/user_likes", "post">,
      ) =>
        request.post("/api/headless/v1/posts/{post_id}/user_likes", {
          ...options,
          path: { post_id: postId },
        }),
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
