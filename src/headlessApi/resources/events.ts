import type { HeadlessRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createEventsResource(request: HeadlessRequester) {
  return {
    /**
     * List community events.
     * @param options Query params (flat) plus request metadata.
     * @returns Community event list response.
     */
    list: (options?: RequestOptions<"/api/headless/v1/community_events", "get">) =>
      request.get("/api/headless/v1/community_events", options),
    attendees: {
      /**
       * List event attendees.
       * @param eventId Event ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Event attendees response.
       */
      list: (
        eventId: number,
        options?: RequestOptions<"/api/headless/v1/events/{event_id}/event_attendees", "get">,
      ) =>
        request.get("/api/headless/v1/events/{event_id}/event_attendees", {
          ...options,
          path: { event_id: eventId },
        }),
      /**
       * Create an event attendee.
       * @param eventId Event ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created attendee response.
       */
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
      /**
       * Delete an event attendee.
       * @param eventId Event ID.
       * @param options Request metadata.
       * @returns Delete attendee response.
       */
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
      /**
       * List recurring events for an event.
       * @param spaceId Space ID.
       * @param eventId Event ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Recurring events response.
       */
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
      /**
       * RSVP to recurring events.
       * @param spaceId Space ID.
       * @param eventId Event ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns RSVP response.
       */
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
