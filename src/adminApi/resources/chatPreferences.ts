import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createChatPreferencesResource(request: AdminRequester) {
  return {
    update: (options: RequestOptionsWithBody<"/api/admin/v2/chat_preferences", "put">) =>
      request.put("/api/admin/v2/chat_preferences", options),
  };
}
