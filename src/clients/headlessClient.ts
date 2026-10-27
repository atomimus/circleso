import {
  resolveBaseUrl,
  resolveCommunityHost,
  validateConfigObject,
  validateOptionalToken,
  validateTokenHooks,
} from "../core/config";
import { CircleConfigError } from "../core/errors";
import type { RetryConfig } from "../core/http";
import { createBearerAuthMiddleware } from "../core/middleware/bearerAuth";
import type { LoggerHooks } from "../core/middleware/logger";
import { requireServerRuntime } from "../core/runtime";
import { createTokenManager, type TokenHooks } from "../core/tokenManager";
import type { paths as HeadlessPaths } from "../generated/headless-client-v1";
import { createHeadlessIterators, type HeadlessIterators } from "../headlessApi/cursorIterators";
import { createHeadlessRequester } from "../headlessApi/request";
import { createOpenApiClient, type DualClient } from "./shared";

export type {
  ChatRoomMessagesIteratorOptions,
  HeadlessIterators,
} from "../headlessApi/cursorIterators";

export type HeadlessClient = DualClient<HeadlessPaths> & {
  iter: HeadlessIterators;
};

export type HeadlessClientConfig = {
  baseUrl?: string;
  communityHost?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Server-side Headless Auth application token, required with autoRefresh. */
  authToken?: string;
  autoRefresh?: boolean;
  authBaseUrl?: string;
  getAccessToken?: TokenHooks["getAccessToken"];
  setAccessToken?: TokenHooks["setAccessToken"];
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
};

export function createHeadlessClient(config: HeadlessClientConfig): HeadlessClient {
  validateConfigObject(config);
  validateTokenHooks(config);
  for (const name of ["token", "accessToken", "refreshToken", "authToken"] as const)
    validateOptionalToken(config[name], name);
  if (
    config.token !== undefined &&
    config.accessToken !== undefined &&
    config.token !== config.accessToken
  ) {
    throw new CircleConfigError(
      "token and accessToken are aliases; supply only one or the same value for both.",
    );
  }
  if (config.autoRefresh !== undefined && typeof config.autoRefresh !== "boolean")
    throw new CircleConfigError("autoRefresh must be a boolean.");
  if (config.authBaseUrl !== undefined) resolveBaseUrl(config.authBaseUrl);
  if (config.authToken !== undefined || config.autoRefresh)
    requireServerRuntime(
      "Headless auto-refresh uses a secret Auth application token. Keep authToken and autoRefresh on your server; browser/worker Member clients should use getAccessToken with your own server refresh flow.",
    );
  const accessToken = config.accessToken ?? config.token;
  if (!accessToken && !config.getAccessToken) {
    throw new CircleConfigError("headless access token is required.");
  }
  if (config.autoRefresh && !config.refreshToken) {
    throw new CircleConfigError("refreshToken is required when autoRefresh is enabled.");
  }
  if (config.autoRefresh && !config.authToken) {
    throw new CircleConfigError(
      "authToken (Headless Auth application token) is required when autoRefresh is enabled. Keep it on your server; browser callers should refresh through their server.",
    );
  }

  resolveCommunityHost(config.communityHost);
  const baseUrl = resolveBaseUrl(config.baseUrl);
  const tokenManager = createTokenManager({
    ...(accessToken !== undefined ? { accessToken } : {}),
    ...(config.refreshToken !== undefined ? { refreshToken: config.refreshToken } : {}),
    ...(config.getAccessToken !== undefined ? { getAccessToken: config.getAccessToken } : {}),
    ...(config.setAccessToken !== undefined ? { setAccessToken: config.setAccessToken } : {}),
  });

  const middleware = [
    createBearerAuthMiddleware({
      token: () => tokenManager.getAccessToken(),
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    }),
  ];

  const autoRefreshFetch =
    config.autoRefresh && config.authToken
      ? tokenManager.createAutoRefreshFetch({
          baseUrl,
          authToken: config.authToken,
          authBaseUrl: config.authBaseUrl ?? baseUrl,
          ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
          ...(config.retries !== undefined ? { retries: config.retries } : {}),
          ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
          ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
        })
      : undefined;

  const runtimeConfig = {
    baseUrl,
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    ...(config.retries !== undefined ? { retries: config.retries } : {}),
    ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
    ...(config.logger !== undefined ? { logger: config.logger } : {}),
    ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
    ...(autoRefreshFetch !== undefined ? { fetch: autoRefreshFetch } : {}),
  };

  const client = createOpenApiClient<HeadlessPaths>(runtimeConfig, middleware);

  const iter = createHeadlessIterators(createHeadlessRequester(client));

  return Object.assign(client, { iter });
}
