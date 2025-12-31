import type { AuthRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createRefreshTokenResource(request: AuthRequester) {
  return {
    revoke: (options: RequestOptionsWithBody<"/api/v1/headless/refresh_token/revoke", "post">) =>
      request.post("/api/v1/headless/refresh_token/revoke", options),
  };
}
