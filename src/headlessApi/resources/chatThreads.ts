import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createChatThreadsResource(request: HeadlessRequester) {
  return {
    /**
     * List chat threads.
     * @param options Query params (flat) plus request metadata.
     * @returns Chat thread list response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/chat_threads", "get">) =>
      request.get("/api/headless/v1/chat_threads", options),
    /**
     * Get a chat thread by ID.
     * @param id Chat thread ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Chat thread response.
     */
    get: (id: string, options?: RequestOptions<"/api/headless/v1/chat_threads/{id}", "get">) =>
      request.get("/api/headless/v1/chat_threads/{id}", {
        ...options,
        path: { id },
      }),
    /**
     * List unread chat threads.
     * @param options Query params (flat) plus request metadata.
     * @returns Unread chat threads response.
     */
    unread: (
      options?: RequestOptions<"/api/headless/v1/chat_threads/unread_chat_threads", "get">,
    ) => request.get("/api/headless/v1/chat_threads/unread_chat_threads", options),
  };
}
