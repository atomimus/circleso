import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createChatRoomsResource(request: HeadlessRequester) {
  return {
    /**
     * List chat rooms.
     * @param options Query params (flat) plus request metadata.
     * @returns Chat room list response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/messages", "get">) =>
      request.get("/api/headless/v1/messages", options),
    /**
     * Create a chat room.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created chat room response.
     */
    create: (options: RequestOptionsWithBody<"/api/headless/v1/messages", "post">) =>
      request.post("/api/headless/v1/messages", options),
    /**
     * Get a chat room by UUID.
     * @param uuid Chat room UUID.
     * @param options Query params (flat) plus request metadata.
     * @returns Chat room response.
     */
    get: (uuid: string, options?: RequestOptions<"/api/headless/v1/messages/{uuid}", "get">) =>
      request.get("/api/headless/v1/messages/{uuid}", {
        ...options,
        path: { uuid },
      }),
    /**
     * Mark all messages in a chat room as read.
     * @param uuid Chat room UUID.
     * @param options Request metadata.
     * @returns Mark-as-read response.
     */
    markAllAsRead: (
      uuid: string,
      options?: RequestOptions<"/api/headless/v1/messages/{uuid}/mark_all_as_read", "post">,
    ) =>
      request.post("/api/headless/v1/messages/{uuid}/mark_all_as_read", {
        ...options,
        path: { uuid },
      }),
    /**
     * List unread chat rooms.
     * @param options Query params (flat) plus request metadata.
     * @returns Unread chat rooms response.
     */
    unread: (options?: RequestOptions<"/api/headless/v1/messages/unread_chat_rooms", "get">) =>
      request.get("/api/headless/v1/messages/unread_chat_rooms", options),
    messages: {
      /**
       * List chat room messages.
       * @param chatRoomUuid Chat room UUID.
       * @param options Query params (flat) plus request metadata.
       * @returns Chat room messages response.
       */
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
      /**
       * Create a chat room message.
       * @param chatRoomUuid Chat room UUID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created message response.
       */
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
      /**
       * Get a chat room message by ID.
       * @param chatRoomUuid Chat room UUID.
       * @param id Message ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Message response.
       */
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
      /**
       * Update a chat room message.
       * @param chatRoomUuid Chat room UUID.
       * @param id Message ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Updated message response.
       */
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
      /**
       * Delete a chat room message.
       * @param chatRoomUuid Chat room UUID.
       * @param id Message ID.
       * @param options Request metadata.
       * @returns Delete response.
       */
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
      /**
       * List chat room participants.
       * @param chatRoomUuid Chat room UUID.
       * @param options Query params (flat) plus request metadata.
       * @returns Participants response.
       */
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
      /**
       * Update a chat room participant.
       * @param chatRoomUuid Chat room UUID.
       * @param id Participant ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Updated participant response.
       */
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
      /**
       * Create a reaction.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created reaction response.
       */
      create: (options: RequestOptionsWithBody<"/api/headless/v1/reactions", "post">) =>
        request.post("/api/headless/v1/reactions", options),
      /**
       * Delete a reaction.
       * @param options Query params (flat) plus request metadata.
       * @returns Delete reaction response.
       */
      delete: (options?: RequestOptions<"/api/headless/v1/reactions", "delete">) =>
        request.delete("/api/headless/v1/reactions", options),
    },
  };
}
