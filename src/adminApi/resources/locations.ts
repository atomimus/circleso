import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createLocationsResource(request: AdminRequester) {
  return {
    /** Resolve a required free-text query into geocoded candidates; this does not update a profile. */
    search: (options: RequestOptions<"/api/admin/v2/locations/search", "get">) =>
      request.get("/api/admin/v2/locations/search", options),
  };
}
