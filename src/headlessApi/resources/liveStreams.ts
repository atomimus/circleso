import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createLiveStreamsResource(request: HeadlessRequester) {
  return {
    /**
     * Create a live stream room.
     * @param options Body fields (flat) plus request metadata.
     * @returns Live stream room response.
     */
    createRoom: (options?: RequestOptionsWithBody<"/api/headless/v1/live_streams/rooms", "post">) =>
      request.post("/api/headless/v1/live_streams/rooms", options),
  };
}
