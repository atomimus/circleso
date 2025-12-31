import type { HeadlessRequester } from "../request";
import type { RequestOptions } from "../types";

export function createHomeResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/home", "get">) =>
      request.get("/api/headless/v1/home", options),
  };
}
