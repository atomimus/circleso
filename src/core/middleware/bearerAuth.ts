import type { Middleware } from "openapi-fetch";
import { requireToken, validateConfigObject, validateTimeout } from "../config";
import { CircleConfigError, CircleSdkError } from "../errors";
import { HEADER_AUTHORIZATION } from "../headers";
import { createHttpLifetime } from "../httpLifetime";
import { BodySourceRequest } from "../requestBody";

export type BearerTokenProvider = string | (() => string | undefined | Promise<string | undefined>);

export type BearerAuthConfig = {
  token: BearerTokenProvider;
  timeoutMs?: number;
};

export function createBearerAuthMiddleware(config: BearerAuthConfig): Middleware {
  validateConfigObject(config);
  validateTimeout(config.timeoutMs);
  if (typeof config.token !== "function") requireToken(config.token, "bearer token");

  return {
    async onRequest({ request }) {
      const lifetime = createHttpLifetime([request.signal], config.timeoutMs);
      try {
        lifetime.throwIfAborted();
        let token: string | undefined;
        try {
          token = await lifetime.wait(Promise.resolve(resolveToken(config.token)));
        } catch (cause) {
          lifetime.throwIfAborted();
          if (cause instanceof CircleSdkError) throw cause;
          throw new CircleConfigError("Could not read the bearer token.", cause);
        }
        token = requireToken(token, "bearer token");
        const headers = new Headers(request.headers);
        headers.set(HEADER_AUTHORIZATION, `Bearer ${token}`);
        return new BodySourceRequest(request, { headers });
      } catch (cause) {
        if (lifetime.signal.aborted) {
          Object.assign(lifetime.signal.reason, { url: request.url, method: request.method });
        }
        throw cause;
      } finally {
        lifetime.cleanup();
      }
    },
  };
}

async function resolveToken(token: BearerTokenProvider) {
  if (typeof token === "function") {
    return token();
  }
  return token;
}
