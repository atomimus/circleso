import type { Middleware } from "openapi-fetch";
import { resolveCommunityHost, validateConfigObject } from "../config";
import { CircleConfigError } from "../errors";
import { HEADER_HOST } from "../headers";
import { BodySourceRequest } from "../requestBody";
import { requireServerRuntime } from "../runtime";

export type HostHeaderConfig = {
  host: string;
};

export function createHostHeaderMiddleware(config: HostHeaderConfig): Middleware {
  validateConfigObject(config);
  if (config.host === undefined)
    throw new CircleConfigError("host is required to set the Host header.");
  const host = resolveCommunityHost(config.host);
  requireServerRuntime(
    "Admin API requires 'host' header; use server-side runtime or proxy. Browsers and workers cannot set Host; use createHeadless with member access tokens for browser calls.",
  );

  return {
    onRequest({ request }) {
      const headers = new Headers(request.headers);
      headers.set(HEADER_HOST, host);
      return new BodySourceRequest(request, { headers });
    },
  };
}
