import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createEventsResource(request: HeadlessRequester) {
  return {
    list: (options?: RequestOptions<"/api/headless/v1/community_events", "get">) =>
      request.get("/api/headless/v1/community_events", options),
    attendees: {
      list: (
        eventId: number,
        options?: RequestOptions<"/api/headless/v1/events/{event_id}/event_attendees", "get">,
      ) =>
        request.get("/api/headless/v1/events/{event_id}/event_attendees", {
          ...options,
          path: { event_id: eventId },
        }),
      create: (
        eventId: number,
        options?: RequestOptionsWithBody<
          "/api/headless/v1/events/{event_id}/event_attendees",
          "post"
        >,
      ) =>
        request.post("/api/headless/v1/events/{event_id}/event_attendees", {
          ...options,
          path: { event_id: eventId },
        }),
      delete: (
        eventId: number,
        options?: RequestOptions<"/api/headless/v1/events/{event_id}/event_attendees", "delete">,
      ) =>
        request.delete("/api/headless/v1/events/{event_id}/event_attendees", {
          ...options,
          path: { event_id: eventId },
        }),
    },
    recurring: {
      list: (
        spaceId: number,
        eventId: number,
        options?: RequestOptions<
          "/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events",
          "get"
        >,
      ) =>
        request.get("/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events", {
          ...options,
          path: { space_id: spaceId, event_id: eventId },
        }),
      rsvp: (
        spaceId: number,
        eventId: number,
        options: RequestOptionsWithBody<
          "/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events/rsvp",
          "put"
        >,
      ) =>
        request.put("/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events/rsvp", {
          ...options,
          path: { space_id: spaceId, event_id: eventId },
        }),
    },
  };
}
