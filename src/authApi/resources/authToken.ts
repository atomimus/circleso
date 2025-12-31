import type { AuthRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createAuthTokenResource(request: AuthRequester) {
  return {
    create: (options: RequestOptionsWithBody<"/api/v1/headless/auth_token", "post">) =>
      request.post("/api/v1/headless/auth_token", options),
  };
}
