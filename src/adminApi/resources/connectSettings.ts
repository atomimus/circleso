import type { AdminRequester } from "../request";
import type { RequestOptions } from "../types";

export function createConnectSettingsResource(request: AdminRequester) {
  return {
    /** Read live Connect, member_directory and messaging settings for the authenticated community. */
    get: (options?: RequestOptions<"/api/admin/v2/settings/connect", "get">) =>
      request.get("/api/admin/v2/settings/connect", options),
    /** Partially update nested sections; only supplied fields change. The upstream body is optional. */
    update: (options?: RequestOptions<"/api/admin/v2/settings/connect", "patch">) =>
      request.patch("/api/admin/v2/settings/connect", options),
  };
}
