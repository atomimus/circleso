import type { AdminRequester } from "../request";
import type { RequestOptions, RequestOptionsWithBody } from "../types";

export function createFilterKitResource(request: AdminRequester) {
  return {
    /** Resolved filters members see. context is required; member_space also requires space_id at Circle. */
    configuration: (options: RequestOptions<"/api/admin/v2/filter_kit_configuration", "get">) =>
      request.get("/api/admin/v2/filter_kit_configuration", options),
    controls: {
      /** List saved directory/space customizations, ordered by sort key. */
      list: (options?: RequestOptions<"/api/admin/v2/filter_kit_controls", "get">) =>
        request.get("/api/admin/v2/filter_kit_controls", options),
      /** Save one visibility/order customization. Omit space_id for the directory. */
      create: (options: RequestOptionsWithBody<"/api/admin/v2/filter_kit_controls", "post">) =>
        request.post("/api/admin/v2/filter_kit_controls", options),
      /** Get one saved control by its numeric ID. */
      get: (
        id: number,
        options?: RequestOptions<"/api/admin/v2/filter_kit_controls/{id}", "get">,
      ) => request.get("/api/admin/v2/filter_kit_controls/{id}", { ...options, path: { id } }),
      /** Update one saved control; enabled:false hides it. The upstream body is optional. */
      update: (
        id: number,
        options?: RequestOptions<"/api/admin/v2/filter_kit_controls/{id}", "patch">,
      ) => request.patch("/api/admin/v2/filter_kit_controls/{id}", { ...options, path: { id } }),
      /** Delete one saved customization; inspect resolved configuration for current visibility. */
      delete: (
        id: number,
        options?: RequestOptions<"/api/admin/v2/filter_kit_controls/{id}", "delete">,
      ) => request.delete("/api/admin/v2/filter_kit_controls/{id}", { ...options, path: { id } }),
    },
  };
}
