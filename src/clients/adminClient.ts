import {
  requireToken,
  resolveBaseUrl,
  resolveCommunityHost,
  validateConfigObject,
} from "../core/config";
import { CircleConfigError } from "../core/errors";
import type { RetryConfig } from "../core/http";
import { createAdminAuthMiddleware } from "../core/middleware/adminAuth";
import { createAdminQueryMiddleware } from "../core/middleware/adminQuery";
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
  validateConfigObject(config);
  const token = requireToken(config.token, "admin.token");
  const communityHost = resolveCommunityHost(config.communityHost);

  const baseUrl = resolveBaseUrl(config.baseUrl);
  const middleware = [
    createAdminAuthMiddleware({ token, host: communityHost }),
    createAdminQueryMiddleware(),
  ];
  if (
    communityHost !== new URL(baseUrl).host.toLowerCase() &&
    (config.fetcher === undefined || config.fetcher === globalThis.fetch)
  ) {
    throw new CircleConfigError(
      "Admin communityHost differs from the baseUrl authority. Default Fetch cannot preserve a Host override. Supply a custom server fetcher that preserves Host, or explicitly configure a destination/Host pair supported by your server or proxy.",
    );
  }

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
