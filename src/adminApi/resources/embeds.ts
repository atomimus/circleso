import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createEmbedsResource(request: AdminRequester) {
  return {
    create: (options: RequestOptionsWithBody<"/api/admin/v2/embeds", "post">) =>
      request.post("/api/admin/v2/embeds", options),
    get: (sgid: string, options?: RequestOptions<"/api/admin/v2/embeds/{sgid}", "get">) =>
      request.get("/api/admin/v2/embeds/{sgid}", {
        ...options,
        path: { sgid },
      }),
  };
}
