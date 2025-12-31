import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createLiveStreamsResource(request: HeadlessRequester) {
  return {
    createRoom: (options?: RequestOptionsWithBody<"/api/headless/v1/live_streams/rooms", "post">) =>
      request.post("/api/headless/v1/live_streams/rooms", options),
  };
}
