import type { HeadlessRequester } from "../request";
import type { PathParams, RequestOptions, RequestOptionsWithBody } from "../types";

type NotificationPreferenceMedium = PathParams<
  "/api/headless/v1/notification_preferences/{medium}",
  "get"
>["medium"];

export function createNotificationPreferencesResource(request: HeadlessRequester) {
  return {
    get: (
      medium: NotificationPreferenceMedium,
      options?: RequestOptions<"/api/headless/v1/notification_preferences/{medium}", "get">,
    ) =>
      request.get("/api/headless/v1/notification_preferences/{medium}", {
        ...options,
        path: { medium },
      }),
    update: (
      medium: NotificationPreferenceMedium,
      options: RequestOptionsWithBody<"/api/headless/v1/notification_preferences/{medium}", "put">,
    ) =>
      request.put("/api/headless/v1/notification_preferences/{medium}", {
        ...options,
        path: { medium },
      }),
    getForSpaceMember: (
      id: number,
      options?: RequestOptions<
        "/api/headless/v1/notification_preferences/space_members/{id}",
        "get"
      >,
    ) =>
      request.get("/api/headless/v1/notification_preferences/space_members/{id}", {
        ...options,
        path: { id },
      }),
    updateForSpaces: (
      medium: NotificationPreferenceMedium,
      options: RequestOptionsWithBody<
        "/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces",
        "put"
      >,
    ) =>
      request.put(
        "/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces",
        {
          ...options,
          path: { notification_preference_medium: medium },
        },
      ),
    updateForSpace: (
      medium: NotificationPreferenceMedium,
      id: number,
      options: RequestOptionsWithBody<
        "/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces/{id}",
        "put"
      >,
    ) =>
      request.put(
        "/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces/{id}",
        {
          ...options,
          path: { notification_preference_medium: medium, id },
        },
      ),
  };
}
