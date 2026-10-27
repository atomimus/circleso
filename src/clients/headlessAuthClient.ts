import {
  requireToken,
  resolveBaseUrl,
  resolveCommunityHost,
  validateConfigObject,
} from "../core/config";
import type { RetryConfig } from "../core/http";
import { createBearerAuthMiddleware } from "../core/middleware/bearerAuth";
import type { LoggerHooks } from "../core/middleware/logger";
import { requireServerRuntime } from "../core/runtime";
import type { paths as HeadlessAuthPaths } from "../generated/headless-auth-v1";
import { createOpenApiClient, type DualClient } from "./shared";

export type HeadlessAuthClient = DualClient<HeadlessAuthPaths>;

export type HeadlessAuthClientConfig = {
  baseUrl?: string;
  communityHost?: string;
  /** Server-only Headless Auth application token, not a member access or refresh token. */
  token: string;
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
};

export function createHeadlessAuthClient(config: HeadlessAuthClientConfig): HeadlessAuthClient {
  validateConfigObject(config);
  const token = requireToken(config.token, "auth.token (Headless Auth application token)");
  requireServerRuntime(
    "Headless Auth uses a secret application token. Keep createAuth/createHeadlessAuthClient on your server; use createHeadless with member access tokens in browsers and workers.",
  );

  resolveCommunityHost(config.communityHost);
  const baseUrl = resolveBaseUrl(config.baseUrl);
  const middleware = [createBearerAuthMiddleware({ token })];

  const runtimeConfig = {
    baseUrl,
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    ...(config.retries !== undefined ? { retries: config.retries } : {}),
    ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
    ...(config.logger !== undefined ? { logger: config.logger } : {}),
    ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
  };

  return createOpenApiClient<HeadlessAuthPaths>(runtimeConfig, middleware);
}
