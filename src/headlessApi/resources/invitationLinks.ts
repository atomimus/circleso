import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createInvitationLinksResource(request: HeadlessRequester) {
  return {
    join: (
      token: string,
      options?: RequestOptionsWithBody<"/api/headless/v1/invitation_links/{token}/join", "post">,
    ) =>
      request.post("/api/headless/v1/invitation_links/{token}/join", {
        ...options,
        path: { token },
      }),
  };
}
