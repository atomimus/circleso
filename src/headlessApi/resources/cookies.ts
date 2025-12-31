import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createCookiesResource(request: HeadlessRequester) {
  return {
    /**
     * Create cookies for headless access.
     * @param options Body fields (flat) plus request metadata.
     * @returns Cookie response.
     */
    create: (options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "post">) =>
      request.post("/api/headless/v1/cookies", options),
    /**
     * Delete headless cookies.
     * @param options Body fields (flat) plus request metadata.
     * @returns Delete cookie response.
     */
    delete: (options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "delete">) =>
      request.delete("/api/headless/v1/cookies", options),
  };
}
