import type { Middleware } from "openapi-fetch";
import { CircleConfigError } from "../errors";
import { HEADER_AUTHORIZATION } from "../headers";

export type BearerTokenProvider = string | (() => string | undefined | Promise<string | undefined>);

export type BearerAuthConfig = {
  token: BearerTokenProvider;
};

export function createBearerAuthMiddleware(config: BearerAuthConfig): Middleware {
  if (!config.token) {
    throw new CircleConfigError("token is required for bearer authentication.");
  }

  return {
    async onRequest({ request }) {
      const token = await resolveToken(config.token);
      if (!token) {
        throw new CircleConfigError("token is required for bearer authentication.");
      }

      const headers = new Headers(request.headers);
      headers.set(HEADER_AUTHORIZATION, `Bearer ${token}`);
      return new Request(request, { headers });
    },
  };
}

async function resolveToken(token: BearerTokenProvider) {
  if (typeof token === "function") {
    return token();
  }
  return token;
}
