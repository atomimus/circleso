import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createLiveRoomsResource(request: AdminRequester) {
  return {
    /** Read a page of the community's live rooms. */
    list: (options?: RequestOptions<"/api/admin/v2/live/rooms", "get">) =>
      request.get("/api/admin/v2/live/rooms", options),
    /** Read JSON containing raw VTT strings by numeric room ID. An empty array may mean not ready. */
    transcripts: (
      roomId: number,
      options?: RequestOptions<"/api/admin/v2/live/rooms/{room_id}/transcripts", "get">,
    ) =>
      request.get("/api/admin/v2/live/rooms/{room_id}/transcripts", {
        ...options,
        path: { room_id: roomId },
      }),
  };
}
