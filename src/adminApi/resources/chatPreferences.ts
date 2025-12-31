import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createChatPreferencesResource(request: AdminRequester) {
  return {
    /**
     * Update chat preferences.
     * @param options Body fields (flat) plus request metadata.
     * @returns Update response.
     */
    update: (options: RequestOptionsWithBody<"/api/admin/v2/chat_preferences", "put">) =>
      request.put("/api/admin/v2/chat_preferences", options),
  };
}
