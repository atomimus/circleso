import type { Middleware } from "openapi-fetch";
import { DEFAULT_COMMUNITY_HOST } from "../constants";
import { CircleConfigError } from "../errors";
import { HEADER_AUTHORIZATION } from "../headers";
import { createHostHeaderMiddleware } from "./hostHeader";

export type AdminAuthConfig = {
  token: string;
  host?: string;
};

export function createAdminAuthMiddleware(config: AdminAuthConfig): Middleware {
  const token = config.token?.trim();
  if (!token) {
    throw new CircleConfigError("token is required for admin authentication.");
  }

  const host = config.host?.trim() || DEFAULT_COMMUNITY_HOST;
  const hostMiddleware = createHostHeaderMiddleware({ host });

  return {
    async onRequest(context) {
      const headers = new Headers(context.request.headers);
      headers.set(HEADER_AUTHORIZATION, `Token ${token}`);
      const request = new Request(context.request, { headers });

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
