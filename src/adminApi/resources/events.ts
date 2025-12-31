import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createEventsResource(request: AdminRequester) {
  return {
    events: {
      list: (options?: RequestOptions<"/api/admin/v2/events", "get">) =>
        request.get("/api/admin/v2/events", options),
      create: (options: RequestOptionsWithBody<"/api/admin/v2/events", "post">) =>
        request.post("/api/admin/v2/events", options),
      get: (id: number, options?: RequestOptions<"/api/admin/v2/events/{id}", "get">) =>
        request.get("/api/admin/v2/events/{id}", {
          ...options,
          path: { id },
        }),
      update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/events/{id}", "put">) =>
        request.put("/api/admin/v2/events/{id}", {
          ...options,
          path: { id },
        }),
      delete: (id: number, options?: RequestOptions<"/api/admin/v2/events/{id}", "delete">) =>
        request.delete("/api/admin/v2/events/{id}", {
          ...options,
          path: { id },
        }),
      duplicate: (
        spaceId: number,
        id: number,
        options: RequestOptionsWithBody<
          "/api/admin/v2/spaces/{space_id}/events/{id}/duplicate",
          "post"
        >,
      ) =>
        request.post("/api/admin/v2/spaces/{space_id}/events/{id}/duplicate", {
          ...options,
          path: { space_id: spaceId, id },
        }),
    },
    attendees: {
      list: (options?: RequestOptions<"/api/admin/v2/event_attendees", "get">) =>
        request.get("/api/admin/v2/event_attendees", options),
      create: (options: RequestOptionsWithBody<"/api/admin/v2/event_attendees", "post">) =>
        request.post("/api/admin/v2/event_attendees", options),
      delete: (options: RequestOptionsWithBody<"/api/admin/v2/event_attendees", "delete">) =>
        request.delete("/api/admin/v2/event_attendees", options),
    },
  };
}
