import type { HeadlessRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createInvitationLinksResource(request: HeadlessRequester) {
  return {
    /**
     * Join via an invitation link.
     * @param token Invitation token.
     * @param options Body fields (flat) plus request metadata.
     * @returns Join response.
     */
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
