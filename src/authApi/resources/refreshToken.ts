import type { AuthRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createRefreshTokenResource(request: AuthRequester) {
  return {
    /**
     * Revoke a headless refresh token.
     * @param options Body fields (flat) plus request metadata.
     * @returns Revoke response.
     */
    revoke: (options: RequestOptionsWithBody<"/api/v1/headless/refresh_token/revoke", "post">) =>
      request.post("/api/v1/headless/refresh_token/revoke", options),
  };
}
