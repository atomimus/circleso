import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createChatRoomMessageImportsResource(request: AdminRequester) {
  return {
    /**
     * Import a historical chat-space message without notifications. Circle adds missing membership.
     * sent_at is required and must not be in the future. The missing upstream response schema is unknown.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/chat_room_message_imports", "post">) =>
      request.post("/api/admin/v2/chat_room_message_imports", options),
  };
}
