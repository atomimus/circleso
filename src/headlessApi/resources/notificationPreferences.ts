import type { HeadlessRequester } from "../request";
import type { PathParams, RequestOptions, RequestOptionsWithBody } from "../types";

type NotificationPreferenceMedium = PathParams<
  "/api/headless/v1/notification_preferences/{medium}",
  "get"
>["medium"];

export function createNotificationPreferencesResource(request: HeadlessRequester) {
  return {
    /**
     * Get notification preferences by medium.
     * @param medium Notification medium.
     * @param options Query params (flat) plus request metadata.
     * @returns Notification preferences response.
     */
    get: (
      medium: NotificationPreferenceMedium,
      options?: RequestOptions<"/api/headless/v1/notification_preferences/{medium}", "get">,
    ) =>
      request.get("/api/headless/v1/notification_preferences/{medium}", {
        ...options,
        path: { medium },
      }),
    /**
     * Update notification preferences by medium.
     * @param medium Notification medium.
     * @param options Body fields (flat) plus request metadata.
     * @returns Update response.
     */
    update: (
      medium: NotificationPreferenceMedium,
      options: RequestOptionsWithBody<"/api/headless/v1/notification_preferences/{medium}", "put">,
    ) =>
      request.put("/api/headless/v1/notification_preferences/{medium}", {
        ...options,
        path: { medium },
      }),
    /**
     * Get notification preferences for a space member.
     * @param id Space member ID.
     * @param options Query params (flat) plus request metadata.
     * @returns Space member notification preferences response.
     */
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
    /**
     * Update notification preferences for all spaces.
     * @param medium Notification medium.
     * @param options Body fields (flat) plus request metadata.
     * @returns Update response.
     */
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
    /**
     * Update notification preferences for a space.
     * @param medium Notification medium.
     * @param id Space ID.
     * @param options Body fields (flat) plus request metadata.
     * @returns Update response.
     */
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
