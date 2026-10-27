import { requireToken, resolveBaseUrl, validateConfigObject } from "./config";
import { CircleConfigError } from "./errors";

export type SessionCookiesUrlOptions = {
  /** Trusted, configured community HTTPS origin, never an untrusted request parameter. */
  communityUrl: string;
  /** Member access token. Never supply an application or refresh token. */
  accessToken: string;
};

/** Build Circle's documented session redirect URL. The returned URL contains a secret. */
export function createSessionCookiesUrl(options: SessionCookiesUrlOptions): string {
  try {
    validateConfigObject(options);
    const { communityUrl, accessToken } = options;
    const origin = new URL(resolveBaseUrl(communityUrl));
    if (origin.protocol !== "https:" || !/^https:\/\/[^/?#]+\/?$/i.test(communityUrl)) {
      throw new CircleConfigError(
        "communityUrl must be a trusted HTTPS origin without a path, query or fragment.",
      );
    }
    origin.pathname = "/session/cookies";
    origin.searchParams.set("access_token", requireToken(accessToken, "accessToken"));
    return origin.toString();
  } catch (cause) {
    if (cause instanceof CircleConfigError) throw cause;
    throw new CircleConfigError("Cannot build the session cookies URL.", cause);
  }
}
