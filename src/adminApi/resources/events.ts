import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createEventsResource(request: AdminRequester) {
  return {
    events: {
      /**
       * List events.
       * @param options Query params (flat) plus request metadata.
       * @returns Event list response.
       */
      list: (options?: RequestOptions<"/api/admin/v2/events", "get">) =>
        request.get("/api/admin/v2/events", options),
      /**
       * Create an event.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created event response.
       */
      create: (options: RequestOptionsWithBody<"/api/admin/v2/events", "post">) =>
        request.post("/api/admin/v2/events", options),
      /**
       * Get an event by ID.
       * @param id Event ID.
       * @param options Query params (flat) plus request metadata.
       * @returns Event response.
       */
      get: (id: number, options?: RequestOptions<"/api/admin/v2/events/{id}", "get">) =>
        request.get("/api/admin/v2/events/{id}", {
          ...options,
          path: { id },
        }),
      /**
       * Update an event.
       * @param id Event ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Updated event response.
       */
      update: (id: number, options: RequestOptionsWithBody<"/api/admin/v2/events/{id}", "put">) =>
        request.put("/api/admin/v2/events/{id}", {
          ...options,
          path: { id },
        }),
      /**
       * Delete an event.
       * @param id Event ID.
       * @param options Request metadata.
       * @returns Delete response.
       */
      delete: (id: number, options: RequestOptions<"/api/admin/v2/events/{id}", "delete">) =>
        request.delete("/api/admin/v2/events/{id}", {
          ...options,
          path: { id },
        }),
      /**
       * Duplicate an event.
       * @param spaceId Space ID.
       * @param id Event ID.
       * @param options Body fields (flat) plus request metadata.
       * @returns Duplicate response.
       */
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
      /**
       * List event attendees.
       * @param options Query params (flat) plus request metadata.
       * @returns Event attendee list response.
       */
      list: (options?: RequestOptions<"/api/admin/v2/event_attendees", "get">) =>
        request.get("/api/admin/v2/event_attendees", options),
      /**
       * Create an event attendee.
       * @param options Body fields (flat) plus request metadata.
       * @returns Created attendee response.
       */
      create: (options: RequestOptionsWithBody<"/api/admin/v2/event_attendees", "post">) =>
        request.post("/api/admin/v2/event_attendees", options),
      /**
       * Delete an event attendee.
       * @param options Body fields (flat) plus request metadata.
       * @returns Delete attendee response.
       */
      delete: (options: RequestOptionsWithBody<"/api/admin/v2/event_attendees", "delete">) =>
        request.delete("/api/admin/v2/event_attendees", options),
    },
  };
}
