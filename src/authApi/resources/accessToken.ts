import type { AuthRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createAccessTokenResource(request: AuthRequester) {
  return {
    refresh: (options: RequestOptionsWithBody<"/api/v1/headless/access_token/refresh", "patch">) =>
      request.patch("/api/v1/headless/access_token/refresh", options),
    revoke: (options: RequestOptionsWithBody<"/api/v1/headless/access_token/revoke", "post">) =>
      request.post("/api/v1/headless/access_token/revoke", options),
  };
}
