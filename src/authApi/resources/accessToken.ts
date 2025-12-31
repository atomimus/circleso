import type { AuthRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createAccessTokenResource(request: AuthRequester) {
  return {
    /**
     * Refresh a headless access token.
     * @param options Body fields (flat) plus request metadata.
     * @returns Refresh response.
     */
    refresh: (options: RequestOptionsWithBody<"/api/v1/headless/access_token/refresh", "patch">) =>
      request.patch("/api/v1/headless/access_token/refresh", options),
    /**
     * Revoke a headless access token.
     * @param options Body fields (flat) plus request metadata.
     * @returns Revoke response.
     */
    revoke: (options: RequestOptionsWithBody<"/api/v1/headless/access_token/revoke", "post">) =>
      request.post("/api/v1/headless/access_token/revoke", options),
  };
}
