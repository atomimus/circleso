import { DEFAULT_COMMUNITY_HOST } from "../core/constants";
import { CircleConfigError } from "../core/errors";
import type { RetryConfig } from "../core/http";
import { createBearerAuthMiddleware } from "../core/middleware/bearerAuth";
import type { LoggerHooks } from "../core/middleware/logger";
import type { paths as HeadlessAuthPaths } from "../generated/headless-auth-v1";
import { createOpenApiClient, type DualClient } from "./shared";

export type HeadlessAuthClient = DualClient<HeadlessAuthPaths>;

export type HeadlessAuthClientConfig = {
  baseUrl?: string;
  communityHost?: string;
  token: string;
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
};

export function createHeadlessAuthClient(config: HeadlessAuthClientConfig): HeadlessAuthClient {
  if (!config.token) {
    throw new CircleConfigError("auth token is required.");
  }

  const communityHost = config.communityHost ?? DEFAULT_COMMUNITY_HOST;
  const baseUrl = config.baseUrl ?? `https://${communityHost}`;
  const middleware = [createBearerAuthMiddleware({ token: config.token })];

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
