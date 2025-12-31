import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createEmbedsResource(request: AdminRequester) {
  return {
    /**
     * Create an embed.
     * @param options Body fields (flat) plus request metadata.
     * @returns Created embed response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/embeds", "post">) =>
      request.post("/api/admin/v2/embeds", options),
    /**
     * Get an embed by SGID.
     * @param sgid Embed SGID.
     * @param options Query params (flat) plus request metadata.
     * @returns Embed response.
     */
    get: (sgid: string, options?: RequestOptions<"/api/admin/v2/embeds/{sgid}", "get">) =>
      request.get("/api/admin/v2/embeds/{sgid}", {
        ...options,
        path: { sgid },
      }),
  };
}
