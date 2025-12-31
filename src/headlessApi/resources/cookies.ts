import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createCookiesResource(request: HeadlessRequester) {
  return {
    create: (options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "post">) =>
      request.post("/api/headless/v1/cookies", options),
    delete: (options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "delete">) =>
      request.delete("/api/headless/v1/cookies", options),
  };
}
