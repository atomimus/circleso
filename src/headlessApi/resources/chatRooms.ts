import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createChatRoomsResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/messages", "get">) =>
      request.get("/api/headless/v1/messages", options),
    create: (options: RequestOptionsWithBody<"/api/headless/v1/messages", "post">) =>
      request.post("/api/headless/v1/messages", options),
    get: (uuid: string, options?: RequestOptions<"/api/headless/v1/messages/{uuid}", "get">) =>
      request.get("/api/headless/v1/messages/{uuid}", {
        ...options,
        path: { uuid },
      }),
    markAllAsRead: (
      uuid: string,
      options?: RequestOptions<"/api/headless/v1/messages/{uuid}/mark_all_as_read", "post">,
    ) =>
      request.post("/api/headless/v1/messages/{uuid}/mark_all_as_read", {
        ...options,
        path: { uuid },
      }),
    unread: (options?: RequestOptions<"/api/headless/v1/messages/unread_chat_rooms", "get">) =>
      request.get("/api/headless/v1/messages/unread_chat_rooms", options),
    messages: {
      list: (
        chatRoomUuid: string,
        options?: RequestOptions<
          "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages",
          "get"
        >,
      ) =>
        request.get("/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages", {
          ...options,
          path: { chat_room_uuid: chatRoomUuid },
        }),
      create: (
        chatRoomUuid: string,
        options: RequestOptionsWithBody<
          "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages",
          "post"
        >,
      ) =>
        request.post("/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages", {
          ...options,
          path: { chat_room_uuid: chatRoomUuid },
        }),
      get: (
        chatRoomUuid: string,
        id: string,
        options?: RequestOptions<
          "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}",
          "get"
        >,
      ) =>
        request.get("/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}", {
          ...options,
          path: { chat_room_uuid: chatRoomUuid, id },
        }),
      update: (
        chatRoomUuid: string,
        id: string,
        options: RequestOptionsWithBody<
          "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}",
          "put"
        >,
      ) =>
        request.put("/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}", {
          ...options,
          path: { chat_room_uuid: chatRoomUuid, id },
        }),
      delete: (
        chatRoomUuid: string,
        id: string,
        options?: RequestOptions<
          "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}",
          "delete"
        >,
      ) =>
        request.delete("/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}", {
          ...options,
          path: { chat_room_uuid: chatRoomUuid, id },
        }),
    },
    participants: {
      list: (
        chatRoomUuid: string,
        options?: RequestOptions<
          "/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants",
          "get"
        >,
      ) =>
        request.get("/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants", {
          ...options,
          path: { chat_room_uuid: chatRoomUuid },
        }),
      update: (
        chatRoomUuid: string,
        id: string,
        options: RequestOptionsWithBody<
          "/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants/{id}",
          "put"
        >,
      ) =>
        request.put("/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants/{id}", {
          ...options,
          path: { chat_room_uuid: chatRoomUuid, id },
        }),
    },
    reactions: {
      create: (options: RequestOptionsWithBody<"/api/headless/v1/reactions", "post">) =>
        request.post("/api/headless/v1/reactions", options),
      delete: (options?: RequestOptions<"/api/headless/v1/reactions", "delete">) =>
        request.delete("/api/headless/v1/reactions", options),
    },
  };
}
