import type { AuthRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createAuthTokenResource(request: AuthRequester) {
  return {
    /**
     * Create a headless auth token.
     * @param options Body fields (flat) plus request metadata.
     * @returns Auth token response.
     */
    create: (options: RequestOptionsWithBody<"/api/v1/headless/auth_token", "post">) =>
      request.post("/api/v1/headless/auth_token", options),
  };
}
