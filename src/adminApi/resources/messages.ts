import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createMessagesResource(request: AdminRequester) {
  return {
    /**
     * Create a message.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created message response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/messages", "post">) =>
      request.post("/api/admin/v2/messages", options),
  };
}
