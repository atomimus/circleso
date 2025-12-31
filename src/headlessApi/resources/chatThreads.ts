import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createChatThreadsResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/chat_threads", "get">) =>
      request.get("/api/headless/v1/chat_threads", options),
    get: (id: string, options?: RequestOptions<"/api/headless/v1/chat_threads/{id}", "get">) =>
      request.get("/api/headless/v1/chat_threads/{id}", {
        ...options,
        path: { id },
      }),
    unread: (
      options?: RequestOptions<"/api/headless/v1/chat_threads/unread_chat_threads", "get">,
    ) => request.get("/api/headless/v1/chat_threads/unread_chat_threads", options),
  };
}
