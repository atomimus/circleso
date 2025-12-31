import { DEFAULT_COMMUNITY_HOST } from "../core/constants";
import { CircleConfigError } from "../core/errors";
import type { RetryConfig } from "../core/http";
import { createAdminAuthMiddleware } from "../core/middleware/adminAuth";
import type { LoggerHooks } from "../core/middleware/logger";
import type { paths as AdminPaths } from "../generated/admin-v2";
import { createOpenApiClient, type DualClient } from "./shared";

export type AdminClient = DualClient<AdminPaths>;

export type AdminClientConfig = {
  baseUrl?: string;
  token: string;
  communityHost?: string;
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
};

export function createAdminClient(config: AdminClientConfig): AdminClient {
  if (!config.token) {
    throw new CircleConfigError("admin token is required.");
  }
  const communityHost = config.communityHost ?? DEFAULT_COMMUNITY_HOST;

  const baseUrl = config.baseUrl ?? `https://${communityHost}`;
  const middleware = [createAdminAuthMiddleware({ token: config.token, host: communityHost })];

  const runtimeConfig = {
    baseUrl,
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    ...(config.retries !== undefined ? { retries: config.retries } : {}),
    ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
    ...(config.logger !== undefined ? { logger: config.logger } : {}),
    ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
  };

  return createOpenApiClient<AdminPaths>(runtimeConfig, middleware);
}
