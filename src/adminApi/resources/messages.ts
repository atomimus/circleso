import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createMessagesResource(request: AdminRequester) {
  return {
    create: (options: RequestOptionsWithBody<"/api/admin/v2/messages", "post">) =>
      request.post("/api/admin/v2/messages", options),
  };
}
