import type { Middleware } from "openapi-fetch";
import { requireToken, resolveCommunityHost, validateConfigObject } from "../config";
import { HEADER_AUTHORIZATION } from "../headers";
import { BodySourceRequest } from "../requestBody";
import { createHostHeaderMiddleware } from "./hostHeader";

export type AdminAuthConfig = {
  token: string;
  host?: string;
};

export function createAdminAuthMiddleware(config: AdminAuthConfig): Middleware {
  validateConfigObject(config);
  const token = requireToken(config.token, "admin token");

  const host = resolveCommunityHost(config.host);
  const hostMiddleware = createHostHeaderMiddleware({ host });

  return {
    async onRequest(context) {
      const headers = new Headers(context.request.headers);
      headers.set(HEADER_AUTHORIZATION, `Token ${token}`);
      const request = new BodySourceRequest(context.request, { headers });

      const next = await hostMiddleware.onRequest?.({ ...context, request });
      if (next instanceof Request) {
        return next;
      }
      if (next instanceof Response) {
        return next;
      }
      return request;
    },
  };
}
